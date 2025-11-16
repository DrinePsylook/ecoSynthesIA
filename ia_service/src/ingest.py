import os
import sys

from retrieval.utils import load_and_split_pdf
from retrieval.vectorstore import index_documents
from config import CHROMA_PERSIST_DIR

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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <path_to_pdf_file>")
    else:
        ingest_document(sys.argv[1])