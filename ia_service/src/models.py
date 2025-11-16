from pydantic import BaseModel, Field
from typing import List, Optional, Union

from config import ChartType

class AnalyzeDocumentRequest(BaseModel):
    """Model to represent the request to analyze a document."""
    file_path: str = Field(
        description="The path to the document to analyze."
    )

class ExtractedDataPoint(BaseModel):
    """Represents a single data point extracted from a document."""
    key: str = Field(
        description="The name of the indicator or fact extracted (e.g., 'CO2 emissions 2023', 'Area of ​​deforestation')."
    )
    value: str = Field(
        description="The extracted factual value (e.g., '500 million', '15%') MUST be 'data not provided' if the information is missing."
    )
    unit: Optional[str] = Field(
        None, description="The unit of measurement (e.g., 'tonnes', '%', 'USD', 'hectares'). Enter None if not applicable."
    )
    page: Union[int, str] = Field(
        description="The page number where the data was found. Use 'unknown' if not found in the context."
    )
    confidence_score: float = Field(
        description="LLM confidence score for this extraction (between 0.0 and 1.0). The more explicit the data, the higher the score (closer to 1.0)."
    )
    chart_type: ChartType = Field(
        description="The most appropriate type of chart to visualize this data, chosen from LineChart, BarChart, PieChart, or ChoroplethMap."
    )

class ExtractionResult(BaseModel):
    """Container for the complete list of extracted data points."""
    extracted_points: List[ExtractedDataPoint]


class SummaryConfidence(BaseModel):
    """Model to represent the confidence level of a summary."""
    confidence_score: float = Field(
        description="Confidence score for the accuracy and relevance of the summary (between 0.0 and 1.0)."
    )
    justification: str = Field(
        description="Brief justification for the assigned score."
    )