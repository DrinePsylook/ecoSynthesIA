from typing import List

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from .vectorstore import get_vector_store
from .embeddings import get_embedding_model
from ..config import EMBEDDING_MODEL_NAME

GLOBAL_RETRIEVER = None

def get_document_retriever() -> BaseRetriever:
    """
    Initializes and returns a Document Retriever based on the Chroma Vector Store.
    
    Returns:
        A Langchain Retriever object configured for similarity search.
    """
    global GLOBAL_RETRIEVER
    if GLOBAL_RETRIEVER is None:
        try:
            embeddings = get_embedding_model(EMBEDDING_MODEL_NAME)
            vector_store = get_vector_store(embeddings)

            # Create the retriever from the vector store
            GLOBAL_RETRIEVER = vector_store.as_retriever(
                search_kwargs={"k": 4}  # Number of similar documents to retrieve
            )
            print("✅ Document Retriever initialized successfully.")
        except Exception as e:
            print(f"❌ Error initializing Document Retriever: {e}")
            raise
    return GLOBAL_RETRIEVER

def retrieve_context(query: str, k: int = 4) -> List[Document]:
    """
    Performs a similarity search in the Vector Store based on a query.

    Args:
        query: The search query (the document title, or the purpose of the task).
        k: The number of top documents to retrieve.

    Returns:
        A list of the k most relevant Langchain Documents (chunks).
    """
    retriever = get_document_retriever()
    retriever.search_kwargs["k"] = k  # Update k if needed

    documents = retriever.invoke(query)
    return documents