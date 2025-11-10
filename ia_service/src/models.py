from pydantic import BaseModel, Field

class SummaryConfidence(BaseModel):
    """Model to represent the confidence level of a summary."""
    confidence_score: float = Field(
        description="Confidence score for the accuracy and relevance of the summary (between 0.0 and 1.0)."
    )
    justification: str = Field(
        description="Brief justification for the assigned score."
    )