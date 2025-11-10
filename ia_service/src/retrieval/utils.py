import os
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document

def load_and_split_pdf(file_path: str) -> List[Document]:
    """
    Reads a PDF file from a local path and loads it as a list of Langchain Document objects.

    Args:
        file_path (str): The path to the PDF file.

    Returns:
        List[Document]: A list of Langchain Document objects.

    Raises:
        FileNotFoundError: If the specified file does not exist.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"The file at {file_path} does not exist.")

    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        return documents
    except Exception as e:
        print(f"An error occurred while loading the PDF: {e}")
        return []
