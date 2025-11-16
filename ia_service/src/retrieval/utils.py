import os
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters.character import RecursiveCharacterTextSplitter

from ia_service.src.config import CHUNK_OVERLAP, CHUNK_SIZE, BASE_DIR

def load_and_split_pdf(file_path: str) -> List[Document]:
    """
    Loads a PDF file, splits it into pages, and then chunks the pages 
    into smaller, manageable documents for the RAG process.

    Args:
        file_path: The local path to the PDF file.

    Returns:
        List[Document]: A list of Langchain Document objects (chunks).

    Raises:
        FileNotFoundError: If the specified file does not exist.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"The file at {file_path} does not exist.")

    try:
        # Load the PDF file (oneDocument per page)
        loader = PyPDFLoader(file_path)
        pages = loader.load()

        # Chunking (Splitting)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", " ", ""] # Common separators for better chunking        
        )

        # Apply spliting to the loaded pages
        chunks = text_splitter.split_documents(pages)

        return chunks
    except Exception as e:
        print(f"❌ Error during PDF loading or chunking: {e}")
        return []

def get_absolute_file_path(relative_path: str) -> str:
    """
    Converts a relative path (e.g., 'bucket/reportAPI/document_123.pdf')
    to an absolute path based on the project root.
    
    Args:
        relative_path: Relative path from project root
        
    Returns:
        Absolute file path
        
    Raises:
        ValueError: If file doesn't exist
    """
    project_root = BASE_DIR
    absolute_path = os.path.join(project_root, relative_path)

    if not os.path.isfile(absolute_path):
        raise ValueError(f"The file at {absolute_path} does not exist.")

    return str(absolute_path)