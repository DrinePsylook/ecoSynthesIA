import os
from typing import List

from langchain_community.vectorstores import Chroma
from langchain_core.vectorstores import VectorStore
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document

from ..config import CHROMA_COLLECTION_NAME, CHROMA_PERSIST_DIR, EMBEDDING_MODEL_NAME
from .embeddings import get_embedding_model

VECTOR_STORE = None

def get_vector_store(embeddings: Embeddings) -> VectorStore:
    """
    Initializes and returns the Chroma Vector Store instance.
    It will load existing data from the persistance directory if available.

    Args:
        embeddings: The loaded Embeddings model.

    Returns:
        An instance of the Chroma Vector Store.
    """
    global VECTOR_STORE
    if VECTOR_STORE is None:
        print(f"⏳ Initializing ChromaDB client in persistence directory: {CHROMA_PERSIST_DIR}...")

        if not os.path.exists(CHROMA_PERSIST_DIR):
            os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
            print(f"✅ Created persistence directory: {CHROMA_PERSIST_DIR}")
    
        try:
            VECTOR_STORE = Chroma(
                persist_directory=CHROMA_PERSIST_DIR,
                embedding_function=embeddings,
                collection_name=CHROMA_COLLECTION_NAME
            )
            print("✅ ChromaDB client initialized successfully.")
        except Exception as e:
            print(f"❌ Error initializing ChromaDB client: {e}")
            raise
    
    return VECTOR_STORE

def index_documents(documents: List[Document]) -> VectorStore:
    """
    Adds a list of Langchain Documents (chunks) to the Vector Store.
    Performs embedding and insertion into the database.

    Args:
        documents: A list of Document chunks to be indexed.

    Returns:
        The updated Vector Store instance.
    """
    embeddings = get_embedding_model(EMBEDDING_MODEL_NAME)
    vector_store = get_vector_store(embeddings)

    if not documents:
        print("⚠️ No documents provided for indexing.")
        return vector_store
    
    # Chroma's 'add_documents' handles embedding and insertion automatically
    vector_store.add_documents(documents)

    print(f"✅ Indexed {len(documents)} documents into the Vector Store.")
    return vector_store