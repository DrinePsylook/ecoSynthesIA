import os
from fastapi import FastAPI, HTTPException

from src.models import AnalyzeDocumentRequest
from src.orchestration.service import process_document_for_data_extraction, process_document_for_summary
from src.retrieval.utils import get_absolute_file_path

app = FastAPI()

@app.post("/api/analyze-document")
async def analyze_document(request: AnalyzeDocumentRequest):
    """
    Main endpoint that orchestrates document analysis.
    
    This endpoint:
    1. Receives a relative file path from the backend
    2. Converts it to an absolute path
    3. Runs both pipelines (data extraction and summary)
    4. Combines results in the format expected by the backend
    
    Args:
        request: Contains file_path (relative path from project root)
        
    Returns:
        Combined analysis results matching AIAnalysisResponse interface
    """
    try:
        # Convert relative path to absolute path
        absolute_file_path = get_absolute_file_path(request.file_path)

        extracted_data = process_document_for_data_extraction(absolute_file_path)
        summary_result = process_document_for_summary(absolute_file_path, document_id=0)

        # Combine results 
        return {
            "summary": summary_result["summary"],
            "extracted_data": extracted_data,
            "category": summary_result["category"],
        }
    except ValueError as e:
        # File not found
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Other errors
        error_message = str(e)
        print(f"Error in analyze_document endpoint: {error_message}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {error_message}")