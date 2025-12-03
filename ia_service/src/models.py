from pydantic import BaseModel, Field
from typing import List, Optional, Union
from enum import Enum

from .config import ChartType


class AnalyzeDocumentRequest(BaseModel):
    file_path: str = Field(
        description="Relative path to the PDF file from project root (e.g., 'bucket/reportAPI/document_123.pdf')"
    )
    document_id: int = Field(
        description="Database ID of the document for ChromaDB filtering"
    )

class IndicatorCategory(str, Enum):
    """Standardized categories for environmental/financial indicators"""
    # Environmental
    CLIMATE_EMISSIONS = "climate_emissions"
    CLIMATE_TEMPERATURE = "climate_temperature"
    BIODIVERSITY = "biodiversity"
    DEFORESTATION = "deforestation"
    WATER_QUALITY = "water_quality"
    POLLUTION = "pollution"
    ENERGY = "energy"
    
    # Financial
    FINANCE_LOAN = "finance_loan"
    FINANCE_COST = "finance_cost"
    FINANCE_BUDGET = "finance_budget"
    FINANCE_GDP = "finance_gdp"
    
    # Social
    SOCIAL_POPULATION = "social_population"
    SOCIAL_EMPLOYMENT = "social_employment"
    SOCIAL_HEALTH = "social_health"
    
    # Infrastructure
    INFRASTRUCTURE_AREA = "infrastructure_area"
    INFRASTRUCTURE_LENGTH = "infrastructure_length"
    
    # Temporal
    TEMPORAL_DURATION = "temporal_duration"
    TEMPORAL_DEADLINE = "temporal_deadline"
    
    # Other
    OTHER = "other"

class ExtractedDataPoint(BaseModel):
    """Represents a single data point extracted from a document."""
    key: str = Field(
        description="The name of the indicator or fact extracted (e.g., 'CO2 emissions 2023', 'Total loan amount')."
    )
    value: str = Field(
        default="data not provided", 
        description="The extracted factual value (e.g., '500 million', '15%') MUST be 'data not provided' if the information is missing."
    )
    unit: Optional[str] = Field(
        None, description="The unit of measurement (e.g., 'tonnes', '%', 'USD', 'hectares'). Enter None if not applicable."
    )
    page: Union[int, str] = Field(
        default="unknown",
        description="The page number where the data was found. Use 'unknown' if not found in the context."
    )
    confidence_score: float = Field(
        default=0.5, 
        description="LLM confidence score for this extraction (between 0.0 and 1.0). The more explicit the data, the higher the score (closer to 1.0)."
    )
    chart_type: ChartType = Field(
        default=ChartType.UNKNOWN,
        description="The most appropriate type of chart to visualize this data, chosen from LineChart, BarChart, PieChart, or ChoroplethMap."
    )
    indicator_category: IndicatorCategory = Field(
        default=IndicatorCategory.OTHER,
        description="Standardized category to group similar indicators across documents for comparison and visualization."
    )

class ExtractionResult(BaseModel):
    """Container for the complete list of extracted data points."""
    extracted_points: List[ExtractedDataPoint] = Field(default_factory=list)

class SummaryConfidence(BaseModel):
    """Model to represent the confidence level of a summary."""
    confidence_score: float = Field(
        description="Confidence score for the accuracy and relevance of the summary (between 0.0 and 1.0)."
    )
    justification: str = Field(
        description="Brief justification for the assigned score."
    )