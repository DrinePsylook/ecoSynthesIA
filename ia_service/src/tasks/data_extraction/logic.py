import re
from typing import List, Union
import unittest

from langchain_core.documents import Document

from ...models import ExtractedDataPoint, ExtractionResult
from ...config import MIN_CONFIDENCE_THRESHOLD_DATA

# --- Pre-Processing Logic (RAG) ---

def prepare_context_for_extraction(documents: List[Document]) -> str:
    """
    Prepares the focused RAG context for data extraction.

    Args:
    documents: The relevant documents or chunks found by the retriever.

    Returns:
        The context concatenated as a string.
    """
    full_context = ""
    for doc in documents:
        page_num = doc.metadata.get("page", "unknown")
        page_display = str(int(page_num) + 1) if isinstance(page_num, int) else str(page_num)
        full_context += f"\n\n--- Document Part from Page {page_display} ---\n\n"
        full_context += doc.page_content

    return full_context

# --- Pre-Processing Logic (Validation) ---

def _clean_value_and_unit(value: str, unit: Union[str, None]) -> tuple[str, str]:    
    """
    Attempts to clean up the extracted value and unit strings.
    For example, removes stray currency symbols from the value if they are in the unit.
    """
    if value == 'data not provided':
        return value, unit

    # Remove leading and trailing whitespace
    value = value.strip()

    if unit and unit.lower() in ['usd', '$', '%', '€']:
        value = value.replace('$', '').replace('€', '').replace('%', '').strip()
        
    return value, unit

def validate_and_clean_extracted_data(extracted_result: ExtractionResult) -> ExtractionResult:
    """
    Applies final validation and cleaning to the Pydantic result before storage.
    Checks include: confidence score threshold and data format cleaning.

    Args:
        extracted_result: The validated Pydantic object output from Mistral.

    Returns: 
        The potentially modified object or the same object.
    """
    MIN_CONFIDENCE_THRESHOLD = MIN_CONFIDENCE_THRESHOLD_DATA

    cleaned_points: List[ExtractedDataPoint] = []

    for point in extracted_result.extracted_points:
        # Clean the value and unit
        cleaned_value, cleaned_unit = _clean_value_and_unit(point.value, point.unit)
        point.value = cleaned_value
        point.unit = cleaned_unit

        # Validation: filter by confidence score
        if point.confidence_score < MIN_CONFIDENCE_THRESHOLD:
            print(f"  - Filtering data point '{point.key}' due to low confidence ({point.confidence_score}).")
            continue

        #  Validation: page number is plausible
        if isinstance(point.page, str) and point.page.isdigit():
            point.page = int(point.page)
        elif isinstance(point.page, int):
            pass
        elif point.page == 'unknown':
            point.page = 'unknown'

        cleaned_points.append(point)

    return ExtractionResult(extracted_points=cleaned_points)
