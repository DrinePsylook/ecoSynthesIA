from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_core.embeddings import Embeddings

EMBEDDING_MODEL = None  

def get_embedding_model(model_name: str) -> Embeddings:
    """
    Loads and returnes the HuggingFace ebediing model.
    The model is loaded only once (singleton pattern).

    Args:
        model_name: The name of the embedding model to load (e.g., "all-MiniLM-L6-v2").

    Returns:
        An instance of the Embeddings class.
    """
    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is None:
        print(f"⏳ Loading embedding model: {model_name}...")

    # Sentence Transformer model like all-MiniLM-L6-v2
    try:
        EMBEDDING_MODEL = HuggingFaceBgeEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"}
        )
        print("✅ Embedding model loaded successfully.")
    except Exception as e:
        print(f"❌ Failed to load embedding model: {e}")
        raise