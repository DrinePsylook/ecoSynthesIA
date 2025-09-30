from pydantic import BaseModel, Field
from typing import List, Optional

# Define only one fact extracted from the report
class ExtractedFact(BaseModel):
    """A single factual data point extracted from the report."""
    key: str = Field(description="The specific environmental or financial metric (e.g., 'deforestation_rate', 'climate_finance_amount').")
    value: str = Field(description="The numerical or descriptive value of the metric (e.g., '3.2 billion', 'data not provided').")
    unit: str = Field(description="The unit of the value (e.g., 'people/year', '%', '$').")
    context: Optional[str] = Field(description="A brief phrase from the text providing context for the fact (optional).")

# Define the complete list of facts for a document
class DataExtraction(BaseModel):
    """The complete set of all required facts extracted from a document."""
    facts: List[ExtractedFact]

# Define the reseult of the summary category
class ClassificationResult(BaseModel):
    """The result of classifying the summary into one primary category."""
    category: str = Field(description="The primary environmental sector of the summary (e.g., 'Déforestation', 'Finance Carbone', 'Pollution Plastique').")