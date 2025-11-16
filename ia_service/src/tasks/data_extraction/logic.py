from typing import List
from langchain_core.documents import Document

from ...models import ExtractionResult

# --- Pre-Processing Logic (RAG) ---

def prepare_context_for_extraction(documents: List[Document]) -> str:
    """
    Prepares the targeted RAG context for data extraction. 

    Args:
    documents: The relevant documents or chunks found by the retriever.

    Returns:
        The context concatenated as a string.
    """

    full_context = "\n\n--- Document Part ---\n\n".join([doc.page_content for doc in documents])
    return full_context

# --- Pre-Processing Logic (Validation) ---

def validate_and_clean_extracted_data(extracted_result: ExtractionResult) -> ExtractionResult:
    """
    Applies validation and fine-tuning to the Pydantic output.

    Args:
        extracted_result: The validated Pydantic object output from Mistral.

    Returns: 
        The potentially modified object or the same object.
    """

    for point in extracted_result.extracted_points:
        if isinstance(point.page, int):
            point.page = str(point.page)

    return extracted_result
