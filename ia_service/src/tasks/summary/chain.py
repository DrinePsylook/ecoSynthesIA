import os
from dotenv import load_dotenv

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import JsonOutputParser

from ...models import SummaryConfidence

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL")

# Utilisation: `system_prompt` for the AI role
SUMMARY_SYSTEM_PROMPT = """You are a highly skilled environmental analyst. Your task is to produce a concise and factual summary of a provided document. The summary must be neutral and focus on the key points requested.
"""

# `user_prompt` for instructions and document content
SUMMARY_USER_PROMPT_TEMPLATE = """Please provide a summary of the following document in French. The summary must be a single paragraph, no longer than 400 words, and cover the following key aspects:
- Main causes or factors of the described problems.
- Consequences or impacts (environmental, social, economic).
- Solutions, strategies, or recommendations.
- Key figures, trends, and statistics.
- The document's primary objective or conclusion.

Document: {content}
"""

CONFIDENCE_PROMPT_TEMPLATE = """
Based on the original document and the summary provided below, assess the summary's faithfulness to the original text and its relevance to the goal (environmental analysis).

Output your assessment STRICTLY in the JSON format provided by the Pydantic schema.

Summary to evaluate:
---
{summary_text}
---
"""

def create_confidence_chain(llm_model_name: str) -> RunnablePassthrough:
    """Create the chain for self-assessment of summary confidence."""
    try:
        llm = ChatOllama(
            model=llm_model_name,
            temperature=0.0,
        )
    except Exception as e:
        print(f"ERROR: Failed to create ChatOllama instance: {e}")
        raise

    parser = JsonOutputParser(pydantic_object=SummaryConfidence)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert evaluator. Output ONLY a valid JSON structure following the schema."),
        ("user", CONFIDENCE_PROMPT_TEMPLATE + "Format instructions:\n{format_instructions}")
    ])

    confidence_chain = (
        {"summary_text": RunnablePassthrough(), "format_instructions": lambda x: parser.get_format_instructions()}    
        | prompt
        | llm
        | parser
    )
    
    return confidence_chain


def create_summary_chain(llm_model_name: str) -> RunnablePassthrough:
    """
    Creates the Langchain for summary generation.

    Args:
        llm_model_name (str): The name of the LLM model to use (e.g., "llama3.1).
    Returns:
        The Langchain is ready to be invoked.
    """
    try:
        llm = ChatOllama(
            model=llm_model_name,
            base_url=OLLAMA_URL,
            temperature=0.0,
        )
    except Exception as e:
        print(f"ERROR: Failed to create ChatOllama instance: {e}")
        raise

    prompt = ChatPromptTemplate.from_messages([
        ("system", SUMMARY_SYSTEM_PROMPT),
        ("user", SUMMARY_USER_PROMPT_TEMPLATE)
    ])

    summary_chain = (
        {"context": RunnablePassthrough()}
        | prompt
        | llm
    )

    return summary_chain

def invoke_summary_chain(
        chain: RunnablePassthrough,
        document_content: str,
        ) -> str:
    """
    Invokes the summary string with the prepared context.
    """
    raw_summary = chain.invoke(document_content)

    if hasattr(raw_summary, 'content'):
        return raw_summary.content
    
    return str(raw_summary)