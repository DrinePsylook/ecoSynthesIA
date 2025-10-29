import pandas as pd
import os
import random

# Directory containing the datasets
DATA_DIR = "../news_datasets"

# --- Configurations ---
DATA_DIR = "../news_datasets"
# The complete source file (approximately 30k articles)
FULL_SOURCE_FILE = os.path.join(DATA_DIR, "guardian_environment_news.csv")
# The current labeled dataset (398 articles)
EXISTING_TRAINING_SET = os.path.join(DATA_DIR, "full_training_dataset.csv")
# The output CSV file contains the 402 unique articles ready for the LLM
OUTPUT_BATCH_FILE = os.path.join(DATA_DIR, "llm_batch_602.csv") 

TEXT_COLUMN = "Full Text"
TARGET_COUNT = 602
RANDOM_SEED = 42 # Ensures reproducibility if needed

def extract_unique_batch_iterative(source_file: str, existing_set_file: str, output_file: str, target_count: int):
    """
    Extracts exactly 'target_count' unique articles from the source file, 
    excluding all articles already present in the existing training set.
    """
    print("--- Start Extracting Unique Articles ---")

    try: 
        df_full = pd.read_csv(source_file)
    except FileNotFoundError:
        print(f"Error: Source file {source_file} not found.")
        return
    
    try: 
        df_existing = pd.read_csv(existing_set_file)
        existing_texts = set(df_existing[TEXT_COLUMN].astype(str))
        print(f"Existing training set loaded with {len(existing_texts)} unique articles.")
    except FileNotFoundError:
        print(f"Warning: Existing training set file {existing_set_file} not found. Assuming no existing articles.")
        existing_texts = set()

    if 'Intro Text' not in df_full.columns or 'Article Text' not in df_full.columns:
        print("❌ Error: Columns 'Intro Text' or 'Article Text' missing in the source file.")
        return
        
    df_full[TEXT_COLUMN] = (
        df_full['Intro Text'].fillna('') +
        '\n' +
        df_full['Article Text'].fillna('')
    )
    print(f"Colonne '{TEXT_COLUMN}' recréée dans le DataFrame source ({len(df_full)} lignes).")

    pre_filtered_mask = ~df_full[TEXT_COLUMN].astype(str).isin(existing_texts)
    df_available = df_full[pre_filtered_mask].copy()
    
    available_count = len(df_available)
    print(f"Articles available for extraction (after initial filtering) : {available_count}")

    if available_count < target_count:
        print(f"❌ Erroreur: Only {available_count} uniques articles. Impossible to reach {target_count}.")
        return

    final_batch_df = df_available.sample(n=target_count, random_state=RANDOM_SEED, replace=False)
    
    
    final_batch_df.to_csv(output_file, index=False)

    print("\n==========================================================================")
    print(f"✅ Success: Extraction of {target_count} articles UNIQUES.")
    print(f"The nex batch ready : {output_file}")
    print("==========================================================================")


extract_unique_batch_iterative(FULL_SOURCE_FILE, EXISTING_TRAINING_SET, OUTPUT_BATCH_FILE, TARGET_COUNT)