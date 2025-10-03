import os
import json
import time
import ollama
import mlflow
from dotenv import load_dotenv

from utils.prompt_system import (
    SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT_TEMPLATE,
    CLASSIFICATION_SYSTEM_PROMPT, CLASSIFICATION_USER_PROMPT_TEMPLATE
)
from utils.data_extraction import extract_text_from_report, load_references_titles
from utils.evaluations import evaluate_summary, evaluate_data_extraction, evaluate_category
from utils.record_json_output import record_json_output
from pipeline.chaining import get_data_extraction_chain
from pipeline.schemas import DataExtraction

load_dotenv()
MISTRAL_NAME = os.getenv("MISTRAL_OLLAMA")

MODELS_TO_TEST = [
    MISTRAL_NAME, 
    'llama3.1', 
    # 'deepseek-r1:latest' # is excluded as planned
]

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
        print(f"BENCHMARK LAUNCH FOR THE MODEL : {model_name.upper()}")
        print(f"=======================================================")

        with mlflow.start_run(run_name=model_name):
            extraction_chain = get_data_extraction_chain(model_name)

            # Iteration for documents
            for document_metadata in reference_documents:
                document_id = document_metadata['id']
                file_path = document_metadata['file_path']

                print(f"-> DÉBUT ANALYSE DOCUMENT ID {document_id}: {document_metadata['title']} / Modèle: {model_name}")


                # Read and extract the contents of the report
                document_content = extract_text_from_report(file_path)

                if document_content is None:
                    continue # Moves to the next document if the file could not be read

                print(f"   -> Texte extrait ({len(document_content)} caractères). Début des appels API.")


                # 1 - Launch summary
                print("   -> APPEL 1/3: Génération du Résumé...")
                summary_user_prompt = SUMMARY_USER_PROMPT_TEMPLATE.format(document_content=document_content)
                summary_latency = -1.0
                
                try:
                    start_time = time.time()
                    summary_response = ollama.chat(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                            {"role": "user", "content": summary_user_prompt}
                        ]
                    )
                    end_time = time.time()
                    summary_latency = end_time - start_time
                
                    generated_summary = summary_response['message']['content'] 
                except Exception as e:
                    print(f"ERROR: Résumé échoué: {e}")
                    generated_summary = "ERROR: Résumé non généré"
                
                mlflow.log_metric(f"latency_summary_doc_{document_id}", summary_latency)
                print("   -> FIN APPEL 1/3: Résumé généré.")

                reference_summary = document_metadata['reference_summary'] # Retrieving the reference 
                # Summary Evaluation
                summary_scores = evaluate_summary(generated_summary, reference_summary)

                for key, value in summary_scores.items():
                    mlflow.log_metric(f"{key}_doc_{document_id}", value)

                # 2 - Launch data extraction
                print("   -> APPEL 2/3: Extraction des Données...")
                extraction_latency = -1.0
                
                try: 
                    start_time = time.time()
                    extracted_data_output = extraction_chain.invoke({"text_chunk": document_content})
                    extraction_latency = time.time() - start_time

                    data_to_serialize = extracted_data_output

                    if isinstance(extracted_data_output, DataExtraction):
                        data_to_serialize = extracted_data_output.model_dump()                        
                    if not isinstance(data_to_serialize, dict):
                        raise ValueError(f"Type inattendu même après conversion : {type(extracted_data_output)}")

                    # Sérialisation finale
                    extracted_data = json.dumps(data_to_serialize, ensure_ascii=False)
                    print("   -> FIN APPEL 2/3: Données extraites.")

                except Exception as e:
                    # If parsinf fail or api called fail, log the error and continue
                    print(f"ERROR: LangChain Extraction Failed: {e}")
                    extracted_data = "{}" # Return empty json for evaluation

                mlflow.log_metric(f"latency_extraction_doc_{document_id}", extraction_latency)
                record_json_output(extracted_data, model_name, document_id)
                reference_numbers = document_metadata.get('reference_numbers', {})

                # Data extraction evaluation
                extraction_scores = evaluate_data_extraction(extracted_data, reference_numbers)

                for key, value in extraction_scores.items():
                    mlflow.log_metric(f"{key}_doc_{document_id}", value)

                # 3 - Document classification
                print("   -> APPEL 3/3: Classification...")
                classification_latency = -1.0
                classification_user_prompt = CLASSIFICATION_USER_PROMPT_TEMPLATE.format(document_content=generated_summary)
                classification_response = ollama.chat(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
                        {"role": "user", "content": classification_user_prompt}
                    ]
                )
                generated_category = classification_response['message']['content']

                mlflow.log_metric(f"latency_classification_doc_{document_id}", classification_latency)
                print("   -> FIN APPEL 3/3: Classification terminée.")

                reference_category = document_metadata.get('reference_category', 'UNDEFINED')
                # Category evaluation
                category_score = evaluate_category(generated_category, reference_category)

                for key, value in category_score.items():
                    mlflow.log_metric(f"{key}_doc_{document_id}", value)

                # MLflow : recording raw outputs
                mlflow.log_text(generated_summary, f"summaries/{document_id}.txt")
                mlflow.log_text(extracted_data, f"extracted_datas/{document_id}.json")
                mlflow.log_text(generated_category, f"categories/{document_id}.json")
    
if __name__ == "__main__":
    reference_documents = load_references_titles()

    if reference_documents:
        run_full_benchmark()
    else:
        print("Fatal error: Unable to run the benchmark due to missing or incorrect reference data.")

