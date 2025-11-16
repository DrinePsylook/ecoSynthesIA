import datetime
import os
from typing import Dict, Any

from ..retrieval.retriever import retrieve_context
from ..retrieval.utils import load_and_split_pdf
from ..tasks.summary.logic import prepare_context_for_summary, post_process_summary
from ..tasks.summary.chain import create_summary_chain, invoke_summary_chain, create_confidence_chain
from ..tasks.categorization.logic import classify_summary
from ..tasks.data_extraction.chain import create_extraction_chain, invoke_extraction_chain
from ..tasks.data_extraction.logic import prepare_context_for_extraction, validate_and_clean_extracted_data

from ..models import ExtractionResult
from ..config import SUMMARY_LLM

SUMMARY_LLM = SUMMARY_LLM
CONFIDENCE_CHAIN = create_confidence_chain(SUMMARY_LLM)
DATA_EXTRACTION_CHAIN = create_extraction_chain()
SUMMARY_CHAIN = create_summary_chain(SUMMARY_LLM)

def get_document_title(file_path: str) -> str:
    """Helper function to extract a title from the file path for use as a RAG query."""
    # Example: bucket/reportAPI/report_2024.pdf -> report_2024
    return os.path.splitext(os.path.basename(file_path))[0].replace('_', ' ')


def process_document_for_data_extraction(file_path: str) -> ExtractionResult:
    """
    Main function for data extraction using RAG and the Llama->Mistral chain.

    Args:
        file_path: The full path to the PDF.

    Returns:
        List of dictionaries in the format expected by the API:
        [
            {
                "key": str,
                "value": str | number,
                "unit": str | None,
                "page": int | None,
                "confidence_score": float,
                "chart_type": str | None
            },
            ...
        ]
    """
    print(f"--- Starting Data Extraction Process for: {file_path} ---")

    rag_query = f"Extract all key quantifiable facts, figures, and statistics from the report titled: {get_document_title(file_path)}"

    retrieved_documents = retrieve_context(query=rag_query, k=6)
    
    if not retrieved_documents:
        print("⚠️ RAG failed or DB empty for extraction.")
        return ExtractionResult(extracted_points=[])
    
    # Prepare the text context for data extraction
    rag_context = prepare_context_for_extraction(retrieved_documents)

    print("⏳ Invoking Llama -> Mistral extraction chain...")

    # Invoke the data extraction chain
    try:
        raw_extraction_result = invoke_extraction_chain(DATA_EXTRACTION_CHAIN, rag_context)
    except Exception as e:
        print(f"Error during data extraction invocation: {e}")
        return ExtractionResult(extracted_points=[])
    
    #  Pre-Processing and validation
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
            "chart_type": chart_type_value
        })

    return extracted_data


def process_document_for_summary(file_path: str, document_id: int) -> Dict[str, Any]:    
    """
    Main function to generate the summary, confidence score, and category using RAG.

    Args:
        file_path (str): The path to the PDF document.

    Returns:
        Dict[str, Any]: A dictionary containing the final summary and related metadata.
    """
    print(f"--- Starting Summary and Categorization Process for: {file_path} ---")

    document_title = get_document_title(file_path)

    # Retrieve relevant context using RAG 
    retrieved_documents = retrieve_context(document_title)

    if not retrieved_documents:
        print("⚠️ RAG failed or DB empty. Switching to fallback.")
        return {"summary": "Error: Document context not available from RAG.", 
                "category": None, "confidence_score": 0.0, "status": "failed"}    
    
    # Prepare the text context for summarization
    document_context = prepare_context_for_summary(retrieved_documents)

    # Generate the summary
    raw_summary = invoke_summary_chain(SUMMARY_CHAIN, document_context)
    final_summary = post_process_summary(raw_summary)

    # Create the summary chain with the specified LLM
    try:
        confidence_result = CONFIDENCE_CHAIN.invoke(final_summary)
        confidence_score = confidence_result.confidence_score
    except Exception as e:
        confidence_score = 0.5

    # Classify the summary
    category = classify_summary(final_summary)

    print("✅ Summary and Categorization completed.")
    return {
        "document_id": document_id,
        "textual_summary": final_summary,
        "category": category, 
        "confidence_score": confidence_score,
        "date_analysis": datetime.date.today().isoformat(),
        "status": "completed",
    }