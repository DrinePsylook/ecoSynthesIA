import pandas as pd
import os
import json

from utils.evaluations import normalize_data_keys

def record_json_output(extracted_data, model_name, doc_id):
    diagnostic_data = []

    try:
        generated_object = json.loads(extracted_data)
        
        # Check if JSON is empty (if the model returned "{}" or similar)
        if not generated_object or (isinstance(generated_object, dict) and not generated_object.get('facts')):
             # If the midel send a valid structure but empty, content failed to be extracted
             raise ValueError("JSON object is valid but contains no extracted 'facts'.")

    except (json.JSONDecodeError, ValueError) as e:
        # Record the failure for evaluation
        diagnostic_data.append({
            'Model': model_name,
            'Doc_ID': doc_id,
            'Raw_Output_Snippet': extracted_data[:500].replace('\n', ' ').replace('\r', ''),
            'Parsed_Successfully': False
        })


        df_temp = pd.DataFrame(diagnostic_data)
        json_file = "diagnostic_extraction.jsonl" 

        if not os.path.exists(json_file):
            df_temp.to_json(json_file, orient='records', lines=True, force_ascii=False)
        else:
            df_temp.to_json(json_file, mode='a', orient='records', lines=True, force_ascii=False)
        print(f"   -> Diagnostic des données extrait ajouté au fichier : {json_file}")
        return  # Exit the function if parsing failed

    # 2. Normalize the extracted data
    normalized_facts = normalize_data_keys(generated_object)
    
    # 3. Transform facts into DataFrame rows
    for key, value, unit in normalized_facts:
        diagnostic_data.append({
            'Model': model_name,
            'Doc_ID': doc_id,
            'Key': key,
            'Value': value,
            'Unit': unit,
            'Parsed_Successfully': True
        })
    
    # 4. Add the data to a global diagnostic JSON file
    df_temp = pd.DataFrame(diagnostic_data)

    json_file = "diagnostic_extraction.jsonl" 
    if not os.path.exists(json_file):
        df_temp.to_json(json_file, orient='records', lines=True, force_ascii=False)
    else:
        df_temp.to_json(json_file, mode='a', orient='records', lines=True, force_ascii=False)

    print(f"   -> Diagnostic des données extrait ajouté au fichier : {json_file}")