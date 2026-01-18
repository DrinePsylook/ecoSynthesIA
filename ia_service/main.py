import os
from fastapi import FastAPI, HTTPException

from src.models import AnalyzeDocumentRequest
from src.orchestration.service import process_document_for_data_extraction, process_document_for_summary
from src.retrieval.utils import get_absolute_file_path
from src.ingest import ingest_document_with_metadata
from src.monitoring import create_monitor

app = FastAPI()

@app.post("/api/analyze-document")
async def analyze_document(request: AnalyzeDocumentRequest):
    """
    Main endpoint that orchestrates document analysis.
    
    This endpoint:
    1. Receives a relative file path and document_id from the backend
    2. Converts it to an absolute path
    3. **Indexes the document in ChromaDB first**
    4. Runs both pipelines (data extraction and summary)
    5. Combines results in the format expected by the backend
    6. Logs metrics to MLFlow for monitoring (C11)
    
    Args:
        request: Contains file_path (relative path) and document_id (DB ID)
        
    Returns:
        Combined analysis results matching AIAnalysisResponse interface
    """
    try:
        # Convert relative path to absolute path
        absolute_file_path = get_absolute_file_path(request.file_path)

        # Create MLFlow monitor for this analysis run
        with create_monitor(request.document_id, request.file_path) as monitor:
            
            # Track ChromaDB indexing step
            with monitor.track_step("chromadb_indexing"):
                print(f"📚 Indexing document {request.document_id} into ChromaDB...")
                ingest_document_with_metadata(
                    file_path=absolute_file_path,
                    document_id=request.document_id
                )

            # Extract data with monitoring
            extracted_data = process_document_for_data_extraction(
                absolute_file_path,
                document_id=request.document_id,
                monitor=monitor
            )
            
            # Generate summary with document_id filter and monitoring
            summary_result = process_document_for_summary(
                absolute_file_path, 
                document_id=request.document_id,
                monitor=monitor
            )

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