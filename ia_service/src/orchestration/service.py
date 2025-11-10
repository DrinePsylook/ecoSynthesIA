from typing import Dict, Any

from ..retrieval.utils import load_and_split_pdf
from ..tasks.summary.logic import prepare_context_for_summary, post_process_summary
from ..tasks.summary.chain import create_summary_chain, invoke_summary_chain, create_confidence_chain
from ..tasks.categorization.logic import classify_summary

SUMMARY_LLM = "llama3.1"  
CONFIDENCE_CHAIN = create_confidence_chain(SUMMARY_LLM)

def process_document_for_summary(file_path: str) -> Dict[str, Any]:
    """
    Orchestrates the process of loading a PDF document, preparing the context,
    generating a summary using the specified LLM, and post-processing the summary.

    Args:
        file_path (str): The path to the PDF document.
    Returns:
        Dict[str, Any]: A dictionary containing the final summary and related metadata.
    """
    # Load and split the PDF document into Langchain Document objects
    documents = load_and_split_pdf(file_path)
    if not documents:
        return {"summary": "Error : impossible to read the document.", "status": "failed"}
    
    # Prepare the text context for summarization
    document_context = prepare_context_for_summary(documents)

    # Create the summary chain with the specified LLM
    try:
        summary_chain = create_summary_chain(SUMMARY_LLM)
    except Exception as e:
        return {"summary": f"Error : failed to create summary chain. {e}", "status": "failed"}
    
    # Invocation and post-processing
    raw_summary = invoke_summary_chain(summary_chain, document_context)

    final_summary = post_process_summary(raw_summary)

    # Classify the summary
    category = classify_summary(final_summary)

    # Evaluate confidence of the summary
    try:
        confidence_result = CONFIDENCE_CHAIN.invoke(final_summary)
        confidence_score = confidence_result.confidence_score
    except Exception as e:
        print(f"Error evaluating summary confidence: {e}")
        confidence_score = 0.5

    return {
        "summary": final_summary,
        "category": category,
        "confidence_score": confidence_score,
        "status": "completed",
        "llm_used": SUMMARY_LLM
    }