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
SUMMARY_SYSTEM_PROMPT = """You are an expert science communicator who makes complex environmental projects accessible to the general public. Your role is to transform technical documents into clear, engaging summaries that anyone can understand in under 2 minutes.
"""

# `user_prompt` for instructions and document content
SUMMARY_USER_PROMPT_TEMPLATE = """Analyze the following document and write a summary in english.

--- GOAL ---
Make the reader understand the REAL WORLD IMPACT of this project. A person with no technical background should grasp the essence in 30 seconds.

--- ABSOLUTE RULES (NEVER BREAK) ---
- NEVER include internal codes (e.g., AR-APN-123456, P175669, TF/B7681)
- NEVER list individual activities, contracts, or procurement items
- NEVER mention cancelled activities
- NEVER use unexplained acronyms (spell out or skip)
- DO NOT exceed 200 words

--- STRUCTURE ---
**Paragraph 1 - THE ESSENTIALS (2-3 sentences):**
- Project name (human-readable title, not code)
- Who is funding it and who is implementing it (organization names, not codes)
- Total budget if mentioned

**Paragraph 2 - THE IMPACT (3-4 sentences):**
- What CONCRETE problem does this solve? (climate, biodiversity, poverty...)
- Who benefits directly? (farmers, communities, ecosystems...)
- What will change in the real world?

**Paragraph 3 - KEY FIGURES (1-2 sentences, optional):**
- Only include if there are meaningful targets (hectares restored, people helped, CO2 reduced)

--- OUTPUT FORMAT ---
Write ONLY the summary. No introduction, no "Here is a summary", no meta-commentary. Start directly with the project name.

Document:
{content}

Summary:
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
            timeout=120
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
            timeout=120,
            num_ctx=8192 
        )
    except Exception as e:
        print(f"ERROR: Failed to create ChatOllama instance: {e}")
        raise

    prompt = ChatPromptTemplate.from_messages([
        ("system", SUMMARY_SYSTEM_PROMPT),
        ("user", SUMMARY_USER_PROMPT_TEMPLATE)
    ])

    summary_chain = (
        {"content": RunnablePassthrough()} 
        | prompt
        | llm
    )

    return summary_chain

def invoke_summary_chain(
        chain: RunnablePassthrough,
        document_content: str
        ) -> str:
    """
    Invokes the summary string with the prepared context.
    """
    raw_summary = chain.invoke(document_content)

    if hasattr(raw_summary, 'content'):
        return raw_summary.content
    
    return str(raw_summary)