# Prompt for the summary

# Utilisation: `system_prompt` for the AI role
SUMMARY_SYSTEM_PROMPT = """You are a highly skilled environmental analyst. Your task is to produce a concise and factual summary of a provided document. The summary must be neutral and focus on the key points requested.
"""

# `user_prompt` for instructions and document content
SUMMARY_USER_PROMPT_TEMPLATE = """Please provide a summary of the following document in French. The summary must be a single paragraph, no longer than 200 words, and cover the following key aspects:
- Main causes or factors of the described problems.
- Consequences or impacts (environmental, social, economic).
- Solutions, strategies, or recommendations.
- Key figures, trends, and statistics.
- The document's primary objective or conclusion.

Document: {document_content}
"""

# Prompt for data extraction
# Utilisation: `system_prompt` pour le rôle de l'IA,
DATA_EXTRACTION_SYSTEM_PROMPT = """You are an expert data extraction assistant. Your task is to identify and extract key numerical data and facts from a document. The output must be a single JSON object. Do not include any text outside the JSON.
"""
# `user_prompt` for instructions and document content
DATA_EXTRACTION_USER_PROMPT_TEMPLATE = """Extract key data from the following document. For each data point, provide its value, unit, and context. The output must be a valid JSON object.
Your goal is to extract the following data, if available:
- Deforestation and CO2 emissions figures.
- Quantities of plastic pollution.
- Financial amounts related to climate finance.
- Rates and percentages of land degradation.
- Projections (e.g., temperature, sea level, plastic production).
- Number of people, species, or countries affected.
- Temporal data (periods, specific years).
Data can be un text, in tables, or in graphs.

Structure your response in JSON format, without additional explanatory text. Use one JSON object per type of extracted data. Each object must contain the keys "value", "unit", "context", "page" where you find the information and "chart".

The "chart" key must contain the most appropriate visualization type for the extracted data, based on these definitions:
- **LineChart**: Best for showing a variable's evolution over time (trends, years).
- **BarChart**: Excellent for comparing data between different categories or entities (e.g., countries, types of pollution, financial amounts).
- **PieChart**: Used to show the proportion of each category relative to a whole (percentages, shares, parts of a total).
- **ChoroplethMap**: Essential for geographical data (regional distribution, country comparison).

Here is an example of the desired output format for a hypothetical document:
```json
{{
  "key_data_name": {{
    "value": "25",
    "unit": "%",
    "context": "share of global emissions",
    "page": 10,
    "chart": "PieChart"
  }}
}}

Document: {document_content}
"""

CLASSIFICATION_SYSTEM_PROMPT = """You are an expert classification engine. Your task is to categorize the provided document based on its main focus. You must only respond with one of the predefined categories.
"""

# USER PROMPT (avec la taxonomie traduite)
CLASSIFICATION_USER_PROMPT_TEMPLATE = """Analyze the document below and determine its primary category. 
You must choose ONLY ONE category from the list below based on the following taxonomy and priority rules.

Taxonomy:
1. CLIMATE AND EMISSIONS: 
   Keywords: climate change, GHG emissions, CO2, carbon, carbon footprint, IPCC. 
   Focus: Climate data, projections, emissions reporting.
2. BIODIVERSITY AND ECOSYSTEMS: 
   Keywords: biodiversity, species, ecosystem, habitat, conservation, extinction, fauna, flora. 
   Focus: Biological inventories, protected areas, ecosystem services.
3. POLLUTION AND ENVIRONMENTAL QUALITY: 
   Keywords: pollution, contamination, pollutants, air/water quality, waste, toxicity. 
   Focus: Quality monitoring, contamination levels, waste management.
4. NATURAL RESOURCES: 
   Keywords: natural resources, exploitation, extraction, water, forests, fishing, mining, agriculture. 
   Focus: Sustainable resource management, quotas, stocks.
5. ENERGY AND TRANSITION: 
   Keywords: energy, renewables, energy transition, solar, wind, energy efficiency. 
   Focus: Energy production, infrastructures, energy mix.
6. POLICIES AND REGULATION: 
   Keywords: environmental policy, regulation, legislation, governance, compliance. 
   Focus: Legal frameworks, policy effectiveness, international agreements.
7. SOCIO-ECONOMIC IMPACT: 
   Keywords: socio-economic impact, environmental costs, environmental justice, green jobs. 
   Focus: Economic/social consequences of environmental issues.
8. RISKS AND DISASTERS: 
   Keywords: natural risks, disasters, adaptation, resilience, floods, droughts. 
   Focus: Risk assessment, adaptation plans, disaster management.

Priority Rule: Main Keywords > Thematic Focus > Document Objective.
Constraint: The category must reflect more than 50% of the content.

Your answer MUST be ONLY the name of the category (e.g., "CLIMATE AND EMISSIONS" or "BIODIVERSITY AND ECOSYSTEMS"), with no additional text, numbering, or explanation.

Document: {document_content}
"""