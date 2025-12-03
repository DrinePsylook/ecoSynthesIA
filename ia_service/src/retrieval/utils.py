import os
from typing import List

import pdfplumber
from langchain_core.documents import Document
from langchain_text_splitters.character import RecursiveCharacterTextSplitter

from ..config import CHUNK_OVERLAP, CHUNK_SIZE, BUCKET_DIR, BASE_DIR

def load_and_split_pdf(file_path: str, document_id: int = None, document_title: str = None) -> List[Document]:
    """
    Loads a PDF file using pdfplumber for better table extraction.
    """
    try:
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"The file at {file_path} does not exist.")
        
        documents = []
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract text
                text = page.extract_text()
                
                # Extract tables and format them
                tables = page.extract_tables()
                if tables:
                    text += "\n\n--- Tables on this page ---\n"
                    for table in tables:
                        # Check if table is not empty
                        if not table:
                            continue
                        
                        # Format table as TRUE markdown for better LLM understanding
                        # 1. Handle Header
                        headers = table[0]
                        text += "| " + " | ".join([str(h) if h else "" for h in headers]) + " |\n"
                        text += "| " + " | ".join(["---"] * len(headers)) + " |\n"
                        
                        # 2. Handle Rows
                        for row in table[1:]:
                            text += "| " + " | ".join([str(cell).replace("\n", " ") if cell else "" for cell in row]) + " |\n"
                        text += "\n"
                
                # Create document for this page
                doc = Document(
                    page_content=text,
                    metadata={"page": page_num, "source": file_path}
                )
                documents.append(doc)
        
        # Chunking
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        chunks = text_splitter.split_documents(documents)
        
        # Add metadata
        for chunk in chunks:
            chunk.metadata["source_file"] = file_path
            if document_id is not None:
                chunk.metadata["document_id"] = str(document_id)
            if document_title:
                chunk.metadata["document_title"] = document_title
        
        return chunks
    except Exception as e:
        print(f"❌ Error during PDF loading or chunking: {e}")
        return []

def get_absolute_file_path(relative_path: str) -> str:
    """
    Converts a relative path to an absolute path.
    
    Backend sends paths like 'bucket/reportAPI/document_123.pdf'
    We convert to: /app/bucket/reportAPI/document_123.pdf
    
    Args:
        relative_path: Relative path from project root
        
    Returns:
        Absolute file path
        
    Raises:
        ValueError: If file doesn't exist
    """
    # If path already starts with /app, use as is
    if relative_path.startswith('/app'):
        absolute_path = relative_path
    # If path contains 'bucket/', extract and use from project root
    elif 'bucket/' in relative_path:
        bucket_relative = relative_path.split('bucket/', 1)[1]
        absolute_path = os.path.join(BUCKET_DIR, bucket_relative)
    else:
        # Default: assume relative to project root
        absolute_path = os.path.join(BASE_DIR, relative_path)

    if not os.path.isfile(absolute_path):
        raise ValueError(f"The file at {absolute_path} does not exist.")

    return str(absolute_path)