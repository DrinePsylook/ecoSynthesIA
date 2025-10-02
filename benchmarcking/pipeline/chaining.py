from langchain_ollama import ChatOllama
from langchain.prompts import ChatPromptTemplate

from .schemas import DataExtraction
from utils.prompt_system import DATA_EXTRACTION_SYSTEM_PROMPT

# Initialize Ollama client
OLLAMA_URL = 'http://127.0.0.1:11434'

def get_data_extraction_chain(model_name: str):
    """
    Creates a LangChain chain for structured data extraction.
    """

    # Define model
    llm = ChatOllama(
        model=model_name,
        base_url=OLLAMA_URL,
        temperature=0.0,
        format="json"  # Ensure the model outputs JSON
    )

    # Define prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", DATA_EXTRACTION_SYSTEM_PROMPT),
        ("human", "Extract the data from the following document chunk:\n{text_chunk}")
    ])

    # Create structured output chain
    extraction_chain = (
        prompt 
        | llm.with_structured_output(DataExtraction)
    )

    return extraction_chain