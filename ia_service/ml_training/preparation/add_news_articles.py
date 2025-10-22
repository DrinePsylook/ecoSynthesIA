import pandas as pd
import json
import random
import os

SOURCE_CSV_FILE = "../news_datasets/train_80_labeled.csv"
TARGET_JSON_FILE = "../news_datasets/manual_labeling_20.json"

TEXT_COLUMN = "Full Text"
def update_manual_labels_corrected(csv_file: str, json_file: str, num_to_add: int = 2):
    """
    Selects random new articles from the labeled CSV, ensuring the new entries 
    match the required JSON key structure, and appends them to the JSON file.
    """
    
    # Required columns in the final JSON structure
    REQUIRED_KEYS = ["Title", "Authors", "Date Published", TEXT_COLUMN, "category"]
    
    # 1. Load source data
    try:
        df_source = pd.read_csv(csv_file)
    except FileNotFoundError:
        print(f"Error: Source file {csv_file} not found.")
        return

    # 2. Load existing validation data and identify existing texts
    existing_texts = set()
    manual_data = []
    
    if os.path.exists(json_file) and os.path.getsize(json_file) > 0:
        with open(json_file, 'r', encoding='utf-8') as f:
            try:
                manual_data = json.load(f)
            except json.JSONDecodeError:
                print(f"Error: {json_file} is corrupted. Initializing an empty list.")
                manual_data = []
        
        for item in manual_data:
            if TEXT_COLUMN in item:
                existing_texts.add(item[TEXT_COLUMN])
    else:
        print(f"Creating a new file {json_file}.")
        
    # 3. Filter available articles
    df_available = df_source[~df_source[TEXT_COLUMN].isin(existing_texts)]
    
    if len(df_available) < num_to_add:
        print(f"Warning: Only {len(df_available)} articles are available. Adding all remaining articles.")
        num_to_add = len(df_available)

    # 4. Random selection
    new_articles_df = df_available.sample(n=num_to_add, replace=False)

    # 5. Prepare new articles with the correct structure
    new_entries = []
    
    for index, row in new_articles_df.iterrows():
        # Create a new dictionary matching the target JSON format
        new_entry = {
            "Title": row["Title"] if "Title" in row else None,
            "Authors": row["Authors"] if "Authors" in row else None,
            "Date Published": row["Date Published"] if "Date Published" in row else None,
            TEXT_COLUMN: row[TEXT_COLUMN],
            "category": ""  # Explicitly empty for manual labeling
        }
        new_entries.append(new_entry)
        
    # 6. Append and save the updated file
    manual_data.extend(new_entries)
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(manual_data, f, ensure_ascii=False, indent=4)
    
    print(f"\n✅ Success: {len(new_entries)} articles added to {json_file}.")
    print(f"   The validation file now contains {len(manual_data)} articles in total.")

update_manual_labels_corrected(SOURCE_CSV_FILE, TARGET_JSON_FILE, num_to_add=2)