import os
from typing import Any, Dict, List, Union
from dotenv import load_dotenv

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import JsonOutputParser

from ...models import ExtractedDataPoint, ExtractionResult

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL")
MISTRAL_MODEL = os.getenv("MISTRAL_OLLAMA", "mistral")
LLAMA_MODEL = "llama3.1"

LLAMA_EXTRACTION_PROMPT = """
You are an expert data extraction agent for environmental reports. Your primary task is to extract factual data into a precise, structured list.

--- EXTRACTION GOAL ---
Your goal is to extract ALL available data points related to the following 7 categories:
1. Deforestation and CO2 emissions figures.
2. Quantities of plastic pollution.
3. Financial amounts related to climate finance.
4. Rates and percentages of land degradation.
5. Projections (e.g., temperature, sea level, plastic production).
6. Number of people, species, or countries affected.
7. Temporal data (periods, specific years).
Data can be found in text, tables, or graphs.

--- STRUCTURAL RULES ---
1. List each extracted data point on a new line.
2. For each point, include the **fact name**, its **value**, its **unit**, and the **page number** where the data was found (or 'unknown').
3. DO NOT attempt to format the output as JSON. Just provide the raw, structured text list.

Context: {context}

Example Output format:
CO2 emissions 2023: 500 million tonnes, page 12
Cost of dam repair: 1.5 billion USD, page 5
Deforestation rate: 15 %, page 7
"""

MISTRAL_FORMATTING_PROMPT = """
You are a strict JSON formatter. Your task is to take the extracted data list provided below and convert it STRICTLY into a valid JSON array that conforms to the Pydantic schema provided.

--- STRUCTURAL & CONTENT RULES ---
1. **Schema Adherence:** You MUST strictly adhere to the provided JSON schema (Pydantic class).
2. **Value Handling:** If a required fact cannot be determined from the input data list, set the 'value' field to "data not provided". DO NOT leave this field blank.
3. **Core Fields:** The 'key', 'value', 'unit', and 'page' fields MUST be taken directly from the input data list.
4. **"chart_type" Logic:** For the "chart_type" field, use the most appropriate visualization type based on these definitions:
    - **LineChart:** Use for data showing a variable's evolution over time (trends, years, series of dates).
    - **BarChart:** Use for comparing data between different categories, entities, or fixed points in time.
    - **PieChart:** Use when the data represents a proportion, share, or percentage relative to a total whole.
    - **ChoroplethMap:** Use when the data is clearly linked to a specific geographical location (e.g., city, region, country name).
    - **Unknown:** Use if none of the above types fit the data context.

5. **Confidence Score:** You MUST estimate the **confidence_score** (0.0 to 1.0) for each point based on the clarity and explicitness of the data in the list.

6. Output ONLY the JSON object.

Data List to Format:
---
{llama_output}
---
"""

def create_extraction_chain() -> RunnablePassthrough:
    """
    Creates the Langchain Llama 3.1 -> Mistral chain for data extraction.
    """
    # Intialization for models and parsers
    llama_llm = ChatOllama(
        model=LLAMA_MODEL, 
        temperature=0.0
    )

    mistral_llm = ChatOllama(
        model=MISTRAL_MODEL, 
        temperature=0.0,
        format="json"
    )

    json_parser = JsonOutputParser(pydantic_object=ExtractionResult)

    # Chain : llama 3.1 for extraction
    llama_chain = (
        ChatPromptTemplate.from_messages(LLAMA_EXTRACTION_PROMPT)
        | llama_llm
    )

    #  Chain : Mistral for formatting
    mistral_chain = (
        ChatPromptTemplate.from_messages([
            ("system", "You are a JSON formatting engine. Output ONLY JSON following the schema:\n{format_instructions}"),
            ("user", MISTRAL_FORMATTING_PROMPT)
        ])
        | mistral_llm
        | json_parser
    )

    # Full Chain : Llama 3.1 (extraction) -> Mistral (formatting)
    # the inout is the RAG context

    def prepare_mistral_input(llama_output: str, parser_instructions: str) -> Dict[str, str]: 
        """Prepare input for Mistral chain."""
        return {
            "llama_output": llama_output,
            "format_instructions": parser_instructions
        }
    
    # Final combined chain
    full_extraction_chain = (
        llama_chain
        | {
            "llama_output": RunnablePassthrough(),
            "format_instructions": lambda x: json_parser.get_format_instructions()
        }
        | mistral_chain
    )
    return full_extraction_chain

def invoke_extraction_chain(
        chain: RunnablePassthrough,
        rag_context: str
) -> ExtractionResult:
    """
    Invokes the full extraction chain with the RAG context.
    
    Args:
        chain: the full extraction chain.
        rag_context: The relevant text provided by the RAG.

    Returns:
        An ExtractionResult object validated by Pydantic.
    """
    return chain.invoke({"context": rag_context})
