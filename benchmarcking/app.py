import json
import ollama
import mlflow
from prompt_system import SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT_TEMPLATE, DATA_EXTRACTION_SYSTEM_PROMPT, DATA_EXTRACTION_USER_PROMPT_TEMPLATE

def run_benchmark(model_name, document_content):
    # Summary generation
    summary_response = ollama.chat(
        model= model_name, 
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": SUMMARY_USER_PROMPT_TEMPLATE.format(document_content=document_content)}
        ]
    )
    generated_summary = summary_response['message']['content']

    # Data extraction
    extraction_response = ollama.chat(
        model= model_name,
        messages=[
            {"role": "system", "content": DATA_EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": DATA_EXTRACTION_USER_PROMPT_TEMPLATE.format(document_content=document_content)}
        ]
    )
    extracted_data = extraction_response['message']['content']
