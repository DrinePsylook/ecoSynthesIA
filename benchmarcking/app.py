import json
import os

import ollama
import mlflow

from PyPDF2 import PdfReader 

from prompt_system import (
    SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT_TEMPLATE,
    DATA_EXTRACTION_SYSTEM_PROMPT, DATA_EXTRACTION_USER_PROMPT_TEMPLATE
)


# Configuration and datas loading
REPORTS_DIR = "reports"
REFERENCE_FILE = 'references_data.JSON'
MODELS_TO_TEST = ["deepseek-r1", "llama3.1", "mistral"]

def load_references_titles():
    """
    Extracts and returns the titles of all reports in the REPORTS_DIR directory, from REFERENCE_FILE.
    """
    try:
        with open(REFERENCE_FILE, 'r', encoding='utf-8') as file:
            data = json.load(file)
    except Exception as e:
        print(f"Error reading {REFERENCE_FILE}: {e}")
        return []
    
    document_titles = []

    if "documents" in data and isinstance(data['documents'], list):
        for doc in data['documents']:
            # Creating the full path to the report
            report_file_name = doc['title']
            doc['file_path'] = os.path.join(REPORTS_DIR, report_file_name)

            document_titles.append(doc)
        
        print(f"Extracted {len(document_titles)} document titles from reference.")
        for doc in document_titles:
            print(f"- ID: {doc['id']}, Titre: {doc['title']}, Chemin: {doc['file_path']}")

        return document_titles
    else:
        print("No documents found in the reference file.")
        return []
    
def extract_text_from_report(file_path):
    """
    Extract the text from all report to send to the LLM.
    """
    if not os.path.exists(file_path):
        print(f"Warning: the file {file_path} does not exist!")
        return None
    
    # Using PyPDF2 to extract text from PDF
    try:
        reader = PdfReader(file_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text = f"\n---PAGE {i+1}---\n"
                text += page_text

        if len(text.strip()) < 100:
            print(f"Warning: Extracted text from {file_path} seems very short ({len(text)} characters). Check the PDF content or extraction method.")
            return None
        
        return text
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return None
    
def run_full_benchmark():
    """
    implement the full pipeline for benchmarking the models on the reports.
    """
    reference_documents = load_references_titles()
    if not reference_documents:
        print("Benchmark stopped because reference data is missing or incorrect")
        return
    
    mlflow.set_experiment("ecoSynthesIA_Benchmark")

    # Iteration for models
    for model_name in MODELS_TO_TEST:
        print(f"\n=======================================================")
        print(f"LANCEMENT DU BENCHMARK POUR LE MODÈLE : {model_name.upper()}")
        print(f"=======================================================")

        with mlflow.start_run(run_name=model_name):
            # Iteration for documents
            for document_metadata in reference_document:
                document_id = document_metadata['id']
                file_path = document_metadata['file_path']

                print(f"Document analysis {document_id} : {document_metadata['title']}")

                # Read and extract the contents of the report
                document_content = extract_text_from_report(file_path)

                if document_content is None:
                    continue # Moves to the next document if the file could not be read

                # Launch summary
                summary_user_prompt = SUMMARY_USER_PROMPT_TEMPLATE.format(document_content=document_content)
                summary_response = ollama.chat(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                        {"role": "user", "content": summary_user_prompt}
                    ]
                )
                generated_summary = summary_response['message']['content']

                # Launch data extraction
                extraction_user_prompt = DATA_EXTRACTION_USER_PROMPT_TEMPLATE.format(document_content= document_content)
                extraction_response = ollama.chat(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": DATA_EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": extraction_user_prompt}
                    ]
                )
                extracted_data = extraction_response['message']['content']


                # MLflow : recording raw outputs
                mlflow.log_text(generated_summary, f"summaries/{document_id}.txt")
                mlflow.log_text(extracted_data, f"extracted_data/{document_id}.json")

    
if __name__ == "__main__":
    reference_document = load_references_titles()
    doc_data = extract_text_from_report(reference_document[0]['file_path'])

    if reference_document:
        print(f"First reference-data details: {reference_document[0]['file_path']}")
    if doc_data:
        print(f"Extracted text length from the first report: {len(doc_data)} characters")
        print(f"First 500 characters of the report:\n{doc_data[:500]}")
    else:
        print("No text extracted from the report.")

