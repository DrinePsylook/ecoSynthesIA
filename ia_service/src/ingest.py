import os
import sys

# Add parent directory to path to enable imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.retrieval.utils import load_and_split_pdf
from src.retrieval.vectorstore import index_documents
from src.config import CHROMA_PERSIST_DIR

def ingest_document(file_path: str):
    """
    Main function to process a document and load it into ChromaDB.
    """
    print(f"--- STARTING INGESTION PROCESS for: {file_path} ---")

    if not os.path.exists(file_path):
        print(f"FATAL ERROR: Document not found at path: {file_path}")
        return
    
    try:
        # Load and split the document into chunks
        chunks = load_and_split_pdf(file_path)

        if not chunks:
            print("Ingestion failed: Could not create document chunks.")
            return
        
        # Index the document chunks into ChromaDB
        index_documents(chunks)

        print(f"--- INGESTION SUCCESSFUL. Data persisted at {CHROMA_PERSIST_DIR} ---")

    except Exception as e:
        print(f"An unexpected error occurred during ingestion: {e}")
        import traceback
        traceback.print_exc()


def ingest_document_with_metadata(file_path: str, document_id: int, document_title: str = None):
    """
    Ingests a document into ChromaDB with metadata for filtering.
    
    Args:
        file_path: The absolute path to the PDF file
        document_id: The database ID of the document
        document_title: Optional title for better context
    """
    print(f"--- STARTING INGESTION with metadata for document {document_id}: {file_path} ---")

    if not os.path.exists(file_path):
        print(f"❌ FATAL ERROR: Document not found at path: {file_path}")
        raise FileNotFoundError(f"Document not found: {file_path}")
    
    try:
        # Load and split the document into chunks WITH metadata
        chunks = load_and_split_pdf(
            file_path=file_path,
            document_id=document_id,
            document_title=document_title
        )

        if not chunks:
            print("❌ Ingestion failed: Could not create document chunks.")
            raise ValueError("Failed to create document chunks")
        
        print(f"📄 Created {len(chunks)} chunks with metadata document_id={document_id}")
        
        # Index the document chunks into ChromaDB
        index_documents(chunks)

        print(f"✅ INGESTION SUCCESSFUL. {len(chunks)} chunks indexed with document_id={document_id}")

    except Exception as e:
        print(f"❌ An unexpected error occurred during ingestion: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.ingest <file_path> [document_id] [document_title]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    document_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
    document_title = sys.argv[3] if len(sys.argv) > 3 else None
    
    if document_id is not None:
        ingest_document_with_metadata(file_path, document_id, document_title)
    else:
        ingest_document(file_path)