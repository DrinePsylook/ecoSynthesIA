import pandas as pd
import os

DATA_DIR = "../news_datasets"

FILES_TO_MERGE = [
    "train_80_labeled.csv", 
    "train_400_labeled.csv", 
    "train_602_labeled.csv"
    "test_20_labeled.csv"
]

FINAL_TRAINING_SET = os.path.join(DATA_DIR, "full_training_dataset.csv")
TEXT_COLUMN = "Full Text"

def merge_and_deduplicate(data_dir: str, files_list: list, output_file: str):
    """
    Merges multiple CSV files into a single DataFrame, removes duplicates based on a specified text column, and saves the cleaned DataFrame to a new CSV file.
    """

    all_data = []
    initial_count = 0

    # Loading ans merging datasets
    for filename in files_list:
        file_path = os.path.join(data_dir, filename)
        if not os.path.exists(file_path):
            print(f"⚠️ Warning : File {filename} does not exist. Skipping.")
            continue

        try:
            df = pd.read_csv(file_path)
            initial_count += len(df)
            all_data.append(df)
        except Exception as e:
            print(f"❌ Error reading {filename}: {e}")
        
    if not all_data:
        print("❌ No data files were loaded. Exiting.")
        return
    
    df_combined = pd.concat(all_data, ignore_index=True)

    # Number of items before deduplication
    pre_dedupe_count = len(df_combined)

    df_cleaned = df_combined.drop_duplicates(subset=[TEXT_COLUMN], keep='first')

    final_count = len(df_cleaned)

    df_cleaned.to_csv(output_file, index=False)

    print("\n=======================================================")
    print("✨ **MERGING AND CLEANING SUMMARY** ✨")
    print("=======================================================")
    print(f"Total initial number of entries (before merger) : {initial_count}")
    print(f"Number of articles after merging (before deduplication) : {pre_dedupe_count}")
    print(f"Number of unique items in the training set : {final_count}")

    duplicates_removed = pre_dedupe_count - final_count
    print(f"Articles doublons supprimés (basé sur '{TEXT_COLUMN}') : {duplicates_removed}")

    if 'llm_category' in df_cleaned.columns:
        print("\n--- Category Breakdown (LLM) ---")
        print(df_cleaned['llm_category'].value_counts())

    print(f"\n✅ Final dataset saved under : {output_file}")
    print("=======================================================")


merge_and_deduplicate(DATA_DIR, FILES_TO_MERGE, FINAL_TRAINING_SET)