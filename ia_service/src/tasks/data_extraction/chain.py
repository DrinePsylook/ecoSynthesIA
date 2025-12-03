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
LLAMA_MODEL = "llama3.1"

EXTRACTION_PROMPT = """
You are an expert data extraction agent for environmental and financial reports.

--- CRITICAL RULES (MUST FOLLOW) ---
1. **PRIORITY**: Extract data from markdown tables FIRST (identified by | header | format)
2. If you cannot find ANY data point with COMPLETE information (indicator + value + context), output: "NO VALID DATA FOUND"
3. NEVER extract table headers, column names, or row labels without their corresponding values
4. STRICTLY separate numerical values and units.

--- OUTPUT FORMAT (MANDATORY) ---
You MUST output ONE line per data point in this EXACT format:
[Indicator name] | [NUMBER_ONLY] | [UNIT] | page [X]

EXAMPLES OF CORRECT OUTPUT:
Public debt for São Tomé 2023 | 54.6 | % of GDP | page 5
Public debt for São Tomé 2030 projection | 63.2 | % of GDP | page 5
Total project cost Angola | 400000000 | USD | page 3

EXAMPLES OF INCORRECT OUTPUT (DO NOT DO THIS):
❌ Public debt increase from 54.6% of GDP in 2023 to 63.2% by 2030
❌ Debt Sustainability Analysis (DSA) for São Tomé and Principe
❌ Energy sector reforms may lead to increased costs

--- WHAT TO EXTRACT ---
✅ Numerical indicators with clear context (GDP %, amounts, counts, percentages)
✅ Financial figures (loans, budgets, costs)
✅ Quantitative targets (population affected, jobs created)

--- WHAT NOT TO EXTRACT ---
❌ Titles, headings, or document names
❌ Qualitative statements without numbers
❌ Projections without specific values

Context to analyze:
{content}

Output (one line per data point, or "NO VALID DATA FOUND"):
"""

FORMATTING_PROMPT = """
You are a strict JSON formatter. Your task is to take the extracted data list provided below and convert it STRICTLY into a valid JSON array that conforms to the Pydantic schema provided.

--- STRUCTURAL & CONTENT RULES ---
1. **Schema Adherence:** You MUST strictly adhere to the provided JSON schema (Pydantic class).

2. **Value Handling:** If a required fact cannot be determined from the input data list, set the 'value' field to "data not provided". DO NOT leave this field blank.

3. **Core Fields:** The 'key', 'value', 'unit', and 'page' fields MUST be taken directly from the input data list.
   - Ensure 'value' contains ONLY numbers (no %, no $). Move symbols to 'unit'.

4. **"indicator_category" Logic:** 
   ⚠️ CRITICAL: You MUST use ONLY the exact values below (with underscores, lowercase).
   DO NOT use general category names like "FINANCIAL" or "ENVIRONMENTAL".
   
   Choose ONE of these EXACT values:
   
   • climate_emissions → for CO2, GHG, carbon emissions, methane, greenhouse gases
   • climate_temperature → for temperature rise, global warming metrics
   • biodiversity → for species count, habitat loss, endangered species, extinction
   • deforestation → for forest loss, cleared area, tree cutting, logging
   • water_quality → for water pollution, contamination, water safety indices
   • pollution → for air pollution, waste, toxic substances, pollutants
   • energy → for renewable energy, fossil fuels, energy consumption
   • finance_loan → for loan amounts, credit, financing
   • finance_cost → for total cost, expenses, spending
   • finance_budget → for budget allocations, funds, appropriations
   • finance_gdp → for GDP, economic output, national income
   • social_population → for population size, people affected, beneficiaries, households
   • social_employment → for jobs created, employment, unemployment, workers
   • social_health → for health indicators, mortality, disease, healthcare
   • infrastructure_area → for land area, surface, hectares, square kilometers
   • infrastructure_length → for roads, pipelines, distance, kilometers
   • temporal_duration → for project duration, implementation period, timeline
   • temporal_deadline → for deadlines, completion dates, target dates
   • other → if none of the above fit

   EXAMPLE CORRECT VALUES:
   - "finance_loan" ✓ (NOT "FINANCIAL" ✗)
   - "climate_emissions" ✓ (NOT "ENVIRONMENTAL" ✗)
   - "social_population" ✓ (NOT "SOCIAL" ✗)

5. **"chart_type" Logic:** For the "chart_type" field, use the most appropriate visualization type based on these definitions:
   - **LineChart:** Use ONLY for data showing a variable's evolution over MULTIPLE time periods (e.g., "GDP 2020-2025", "inflation trend"). NEVER use for single data points.
   - **BarChart:** Use for comparing data between different categories or when there is a single clear numeric value that is part of a larger set (e.g. "Budget Allocations").
   - **PieChart:** Use ONLY when the data represents a percentage share summing to 100% (e.g. "Energy Mix").
   - **ChoroplethMap:** Use when the data is clearly linked to a specific geographical location (e.g., city, region, country name).
   - **Unknown:** Use if the data is a single isolated number (like a deadline, a duration, or a total cost) that doesn't fit a comparison or trend.

6. **Confidence Score:** You MUST estimate the **confidence_score** (0.0 to 1.0) for each point based on the clarity and explicitness of the data in the list.

7. **JSON EXAMPLE:** Here is a valid example output structure:
{{
  "extracted_points": [
    {{
      "key": "Total loan amount for Angola Water Project",
      "value": "50000000",
      "unit": "USD",
      "page": 3,
      "confidence_score": 0.95,
      "chart_type": "BarChart",
      "indicator_category": "finance_loan"
    }}
  ]
}}

8. Output ONLY the JSON object following the schema.

Data List to Format:
---
{llama_output}
---
"""

def create_extraction_chain() -> RunnablePassthrough:
    """
    Creates the Langchain Llama 3.1 -> Formatting chain for data extraction.
    """
    # Intialization for models and parsers
    llama_llm = ChatOllama(
        model=LLAMA_MODEL, 
        base_url=OLLAMA_URL, 
        temperature=0.0,
        timeout=120,
        num_ctx=8192  
    )

    formatting_llm = ChatOllama(
        model=LLAMA_MODEL, 
        base_url=OLLAMA_URL, 
        temperature=0.0,
        format="json",
        timeout=120,
        num_ctx=8192 
    )

    json_parser = JsonOutputParser(pydantic_object=ExtractionResult)

    # Chain : llama 3.1 for extraction
    llama_chain = (
        ChatPromptTemplate.from_messages([
            ("system", "You are an expert data extraction agent for environmental reports."),
            ("user", EXTRACTION_PROMPT)
        ])
        | llama_llm
    )

    #  Chain : formatting
    formatting_chain = (
        ChatPromptTemplate.from_messages([
            ("system", "You are a JSON formatting engine. Output ONLY JSON following the schema:\n{format_instructions}"),
            ("user", FORMATTING_PROMPT)
        ])
        | formatting_llm
        | json_parser
    )
    
    # Final combined chain
    full_extraction_chain = (
        llama_chain
        | {
            "llama_output": RunnablePassthrough(),
            "format_instructions": lambda x: json_parser.get_format_instructions()
        }
        | formatting_chain
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
    result = chain.invoke({"content": rag_context})
    
    # JsonOutputParser returns a dict, convert it to ExtractionResult
    if isinstance(result, dict):
        # VALIDATION: Filter out invalid extractions
        result = _validate_and_filter_extractions(result)
        return ExtractionResult(**result)
    
    return result

def _validate_and_filter_extractions(result_dict: dict) -> dict:
    """
    Validate extractions and filter out low-quality data points.
    
    Rules:
    - Key must have context (> 10 chars)
    - Value must not be empty or "data not provided"
    - Unit should be present for numeric values
    """
    if "extracted_points" not in result_dict:
        return result_dict
    
    # Kept only terms that clearly indicate hypothetical/meta-data noise
    suspicious_keywords = [
        "table of contents", "list of figures", "abbreviations"
    ]
    
    validated_points = []
    rejected_count = 0
    
    for point in result_dict["extracted_points"]:
        key = point.get("key", "").lower()
        # Clean the value
        value = str(point.get("value", "")).strip()
        unit = point.get("unit")
        
        # Reject if key is too short
        if len(key) < 10: # Relaxed from 20 to 10 (e.g. "GDP Growth" is valid)
            print(f"⚠️ Rejected (too short): {point.get('key')}")
            rejected_count += 1
            continue
        
        # Reject if value is empty
        if not value or value.lower() == "data not provided":
            print(f"⚠️ Rejected (no value): {point.get('key')}")
            rejected_count += 1
            continue
        
        # Reject explicitly forbidden keywords (structural noise only)
        is_suspicious = any(keyword in key for keyword in suspicious_keywords)
        if is_suspicious: 
            print(f"⚠️ Rejected (structural noise): {point.get('key')}")
            rejected_count += 1
            continue
        
        # Reject if numeric value but no unit
        if value.replace(".", "").replace(",", "").isdigit() and not unit:
            print(f"⚠️ Rejected (numeric without unit): {point.get('key')} = {value}")
            rejected_count += 1
            continue
        
        # Passed all validations
        validated_points.append(point)
    
    print(f"✅ Validated {len(validated_points)} data points, rejected {rejected_count}")
    
    result_dict["extracted_points"] = validated_points
    return result_dict
