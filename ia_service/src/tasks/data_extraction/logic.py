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


def _has_quantifiable_value(value: str) -> bool:
    """
    Checks if a value contains actual quantifiable data.
    
    Returns:
        True if value contains numbers, percentages, or date patterns
        False if value is empty, generic text, or "data not provided"
    """
    if not value or value.strip() == "":
        return False
    
    # Reject explicit "no data" markers
    no_data_patterns = [
        "data not provided",
        "not available",
        "n/a",
        "unknown",
        "tbd",
        "to be determined"
    ]
    value_lower = value.lower().strip()
    if value_lower in no_data_patterns:
        return False
    
    # Accept if contains numbers (including decimals and separators)
    has_number = re.search(r'\d', value)
    if has_number:
        return True
    
    # Accept date-like patterns (2023, 2020-2025, Q1 2024, etc.)
    has_date_pattern = re.search(r'(19|20)\d{2}', value)
    if has_date_pattern:
        return True

    return False


def validate_and_clean_extracted_data(extracted_result: ExtractionResult) -> ExtractionResult:
    """
    Applies final validation and cleaning to the Pydantic result before storage.
    Uses quantifiable value validation based on value content.

    Args:
        extracted_result: The validated Pydantic object output from Mistral.

    Returns: 
        The cleaned and filtered result.
    """
    MIN_CONFIDENCE_THRESHOLD = MIN_CONFIDENCE_THRESHOLD_DATA

    cleaned_points: List[ExtractedDataPoint] = []

    for point in extracted_result.extracted_points:
        # Check: Does the value contain actual quantifiable data?
        if not _has_quantifiable_value(point.value):
            print(f"  ⚠️ Skipping '{point.key}': value '{point.value}' is not quantifiable")
            continue

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
