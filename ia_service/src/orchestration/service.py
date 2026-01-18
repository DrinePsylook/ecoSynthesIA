import os
import pdfplumber
from typing import Dict, Any, Optional

from ..retrieval.retriever import retrieve_context
from ..retrieval.utils import load_and_split_pdf
from ..tasks.summary.logic import prepare_context_for_summary, post_process_summary
from ..tasks.summary.chain import create_summary_chain, invoke_summary_chain, create_confidence_chain
from ..tasks.categorization.logic import classify_summary
from ..tasks.data_extraction.chain import create_extraction_chain, invoke_extraction_chain
from ..tasks.data_extraction.logic import prepare_context_for_extraction, validate_and_clean_extracted_data

from ..models import ExtractionResult
from ..config import SUMMARY_LLM
from ..monitoring import AnalysisMonitor

SUMMARY_LLM = SUMMARY_LLM
CONFIDENCE_CHAIN = create_confidence_chain(SUMMARY_LLM)
DATA_EXTRACTION_CHAIN = create_extraction_chain()
SUMMARY_CHAIN = create_summary_chain(SUMMARY_LLM)

def get_document_title(file_path: str) -> str:
    """Helper function to extract a title from the file path for use as a RAG query."""
    # Example: bucket/reportAPI/report_2024.pdf -> report_2024
    return os.path.splitext(os.path.basename(file_path))[0].replace('_', ' ')


def process_document_for_data_extraction(
    file_path: str, 
    document_id: int = None,
    monitor: Optional[AnalysisMonitor] = None
) -> ExtractionResult:
    """
    Main function for data extraction using RAG and the Llama->Mistral chain.

    Args:
        file_path: The full path to the PDF.
        document_id: The database ID to filter chunks from this document only
        monitor: Optional AnalysisMonitor for MLFlow metrics tracking

    Returns:
        List of dictionaries in the format expected by the API
    """
    print(f"--- Starting Data Extraction Process for: {file_path} ---")

    filter_metadata = None
    if document_id is not None:
        filter_metadata = {"document_id": str(document_id)}
        print(f"🔍 Filtering RAG retrieval by document_id: {document_id}")

    # Focus on generic strong keywords that appear in all reports.
    rag_query = "Extract key quantifiable facts, figures, statistics, loan amounts, beneficiaries, and financial tables"

    # Track RAG retrieval step
    if monitor:
        with monitor.track_step("extraction_rag_retrieval"):
            retrieved_documents = retrieve_context(
                query=rag_query, 
                k=25,
                filter_metadata=filter_metadata  
            )
    else:
        retrieved_documents = retrieve_context(
            query=rag_query, 
            k=25,
            filter_metadata=filter_metadata  
        )
    
    initial_chunks_count = len(retrieved_documents) if retrieved_documents else 0
    
    if not retrieved_documents:
        print("⚠️ RAG failed or DB empty for extraction.")
        if monitor:
            monitor.log_rag_stats(chunks_retrieved=0, chunks_used=0)
        return []
    
    table_pages = []
    try:   
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if tables:
                    table_pages.append(page_num)
    except Exception as e:
        print(f"⚠️ Could not detect table pages: {e}")
    
    try:   
        all_pages = load_and_split_pdf(file_path, document_id=document_id)
        
        priority_pages = list(range(3)) + table_pages
        
        seen_content = set(hash(doc.page_content[:50]) for doc in retrieved_documents)
        
        priority_docs = []
        for doc in all_pages:
            page_num = doc.metadata.get("page")
            if page_num in priority_pages:
                content_hash = hash(doc.page_content[:50])
                if content_hash not in seen_content:
                    priority_docs.append(doc)
                    seen_content.add(content_hash)
        
        retrieved_documents = priority_docs + retrieved_documents
        
    except Exception as e:
        print(f"⚠️ Could not force-read priority pages: {e}")
    
    MAX_CHUNKS = 20
    chunks_before_truncation = len(retrieved_documents)
    if len(retrieved_documents) > MAX_CHUNKS:
        print(f"⚠️ Context too large ({len(retrieved_documents)} chunks), truncating to {MAX_CHUNKS}")
        retrieved_documents = retrieved_documents[:MAX_CHUNKS]
    
    # Log RAG statistics
    if monitor:
        monitor.log_rag_stats(
            chunks_retrieved=chunks_before_truncation,
            chunks_used=len(retrieved_documents)
        )
    
    # Prepare the text context for data extraction
    rag_context = prepare_context_for_extraction(retrieved_documents)

    print("⏳ Invoking Llama -> extraction chain...")

    # Track LLM extraction step
    if monitor:
        with monitor.track_step("extraction_llm_invoke"):
            try:
                raw_extraction_result = invoke_extraction_chain(DATA_EXTRACTION_CHAIN, rag_context)
            except Exception as e:
                print(f"Error during data extraction invocation: {e}")
                return []
    else:
        try:
            raw_extraction_result = invoke_extraction_chain(DATA_EXTRACTION_CHAIN, rag_context)
        except Exception as e:
            print(f"Error during data extraction invocation: {e}")
            return []
    
    # Pre-Processing and validation
    final_result = validate_and_clean_extracted_data(raw_extraction_result)

    extracted_data = []
    for point in final_result.extracted_points:
        page_value = None if point.page == 'unknown' else point.page

        # Convert chart_type enum to API format string
        chart_type_value = None
        if point.chart_type:
            if isinstance(point.chart_type, str):
                chart_type_str = point.chart_type
            else:
                chart_type_str = point.chart_type.value
            
            # Map to backend expected format ('line', 'bar', 'pie', 'choropleth')
            chart_type_mapping = {
                "LineChart": "line",
                "BarChart": "bar",
                "PieChart": "pie",
                "ChoroplethMap": "choropleth",
                "Unknown": None
            }
            chart_type_value = chart_type_mapping.get(chart_type_str, None)

        extracted_data.append({
            "key": point.key,
            "value": point.value,
            "unit": point.unit,
            "page": page_value,
            "confidence_score": point.confidence_score,
            "chart_type": chart_type_value,
            "indicator_category": point.indicator_category
        })

    # Log extraction count
    if monitor:
        monitor.log_extraction_count(len(extracted_data))

    return extracted_data


def process_document_for_summary(
    file_path: str, 
    document_id: int = None,
    monitor: Optional[AnalysisMonitor] = None
) -> Dict[str, Any]:    
    """
    Main function to generate the summary, confidence score, and category using RAG.

    Args:
        file_path (str): The path to the PDF document.
        document_id (int, optional): The database ID to filter chunks from this document only
        monitor: Optional AnalysisMonitor for MLFlow metrics tracking

    Returns:
        Dict[str, Any]: A dictionary containing the final summary and related metadata.
    """
    print(f"--- Starting Summary and Categorization Process for: {file_path} ---")

    # Build filter to retrieve ONLY chunks from this specific document
    filter_metadata = None
    if document_id is not None:
        filter_metadata = {"document_id": str(document_id)}
        print(f"🔍 Filtering RAG retrieval by document_id: {document_id}")

    # Track RAG retrieval for summary
    def _retrieve_all_chunks():
        # Strategy: Balanced Multi-query retrieval to feed Summary AND Classification
        # Cover page identification
        cover_chunks = retrieve_context(
            query="Document prepared by submitted to author organization version final report study assessment",
            k=5,  
            filter_metadata=filter_metadata
        )
        
        # Identity & Overview
        intro_chunks = retrieve_context(
            query="Report Title Project Name Executive Summary Prepared by Date Introduction Background",
            k=5,  
            filter_metadata=filter_metadata
        )

        # Technical & Environmental Substance
        technical_chunks = retrieve_context(
            query="Environmental impact social assessment biodiversity emissions pollution natural resources climate change mitigation measures",
            k=4,  
            filter_metadata=filter_metadata
        )

        # Socio-Economic & Governance
        socio_gov_chunks = retrieve_context(
            query="Legal framework institutional arrangements socio-economic impact beneficiaries budget loan agreement energy transition policy regulation",
            k=3, 
            filter_metadata=filter_metadata
        )
        
        # Risks & Objectives
        project_chunks = retrieve_context(
            query="Project description objectives components risk management disaster resilience adaptation",
            k=3, 
            filter_metadata=filter_metadata
        )
        
        return cover_chunks, intro_chunks, technical_chunks, socio_gov_chunks, project_chunks

    if monitor:
        with monitor.track_step("summary_rag_retrieval"):
            cover_chunks, intro_chunks, technical_chunks, socio_gov_chunks, project_chunks = _retrieve_all_chunks()
    else:
        cover_chunks, intro_chunks, technical_chunks, socio_gov_chunks, project_chunks = _retrieve_all_chunks()

    # Fusion & Deduplication
    seen_content = set()
    final_chunks = []
    
    for doc in cover_chunks + intro_chunks + technical_chunks + socio_gov_chunks + project_chunks:
        content_hash = hash(doc.page_content[:50])
        if content_hash not in seen_content:
            seen_content.add(content_hash)
            final_chunks.append(doc)
            
    retrieved_documents = final_chunks

    # FALLBACK: Force-read first 2 pages directly from PDF (bypasses RAG entirely)
    try:
        all_pages = load_and_split_pdf(file_path, document_id=document_id)
        first_pages_direct = [p for p in all_pages if p.metadata.get("page", 999) < 2]
        
        # Prepend first pages to ensure they're in context
        for doc in first_pages_direct:
            content_hash = hash(doc.page_content[:50])
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                retrieved_documents.insert(0, doc)  # Insert at START
    except Exception as e:
        print(f"⚠️ Could not force-read first pages: {e}")

    # Log RAG stats for summary
    if monitor:
        monitor.log_metric("summary_chunks_used", len(retrieved_documents))

    if not retrieved_documents:
        print("⚠️ RAG failed or DB empty. Switching to fallback.")
        return {
            "summary": {
                "textual_summary": "Error: Document context not available from RAG.",
                "confidence_score": 0.0
            },
            "category": {
                "name": "Unknown"
            }
        }
    
    # Prepare the text context for summarization
    document_context = prepare_context_for_summary(retrieved_documents)
    
    # INJECT filename-based title as a hint (since RAG fails to get page 1)
    file_title = get_document_title(file_path)
    if file_title and "document" not in file_title.lower()[:15]:  # Skip if starts with "document_"
        document_context = f"[DOCUMENT FILENAME: {file_title}]\n\n{document_context}"

    # Track summary LLM generation
    if monitor:
        with monitor.track_step("summary_llm_invoke"):
            raw_summary = invoke_summary_chain(SUMMARY_CHAIN, document_context)
            final_summary = post_process_summary(raw_summary)
    else:
        raw_summary = invoke_summary_chain(SUMMARY_CHAIN, document_context)
        final_summary = post_process_summary(raw_summary)

    # Track confidence score calculation
    if monitor:
        with monitor.track_step("confidence_calculation"):
            try:
                confidence_result = CONFIDENCE_CHAIN.invoke(final_summary)
                confidence_score = confidence_result.confidence_score
            except Exception as e:
                confidence_score = 0.5
    else:
        try:
            confidence_result = CONFIDENCE_CHAIN.invoke(final_summary)
            confidence_score = confidence_result.confidence_score
        except Exception as e:
            confidence_score = 0.5

    # Log confidence score
    if monitor:
        monitor.log_confidence(confidence_score)

    # Track categorization
    if monitor:
        with monitor.track_step("categorization"):
            category = classify_summary(final_summary)
    else:
        category = classify_summary(final_summary)

    print("✅ Summary and Categorization completed.")
    return {
        "summary": {
            "textual_summary": final_summary,
            "confidence_score": confidence_score
        },
        "category": {
            "name": category if category else "Unknown"
        }
    }