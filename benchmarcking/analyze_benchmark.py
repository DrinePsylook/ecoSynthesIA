import mlflow
import pandas as pd
import os

# 1. Configuring the tracking URI (default is the 'mlruns' folder)
tracking_uri = "file:" + os.getcwd() + "/mlruns"
mlflow.set_tracking_uri(tracking_uri)

# 2. Define the name of your experience
EXPERIMENT_NAME = "ecoSynthesIA_Benchmark" 

try:
    # Retrieve the experience ID
    experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
    if experiment is None:
        print(f"Erreur : L'expérience '{EXPERIMENT_NAME}' est introuvable.")
        exit()
        
    experiment_id = experiment.experiment_id

    # 3. Retrieve data from all runs of this experiment
    df = mlflow.search_runs(
        experiment_ids=[experiment_id], 
        order_by=["metrics.rouge1_fmeasure DESC"],  # Sort by best performance RED-1
        output_format="pandas"
    )

    # Creating a dictionary to store average scores
    average_scores = {}
    
    # 1. Calculating averages for the three major tasks
    METRIC_ROOTS = [
        'rouge1_fmeasure',
        'rouge2_fmeasure',
        'rougeL_fmeasure',
        'extraction_f1',
        'category_accuracy'
    ]

    for metric_root in METRIC_ROOTS:
        # 2. Find all metric columns for this root (eg: rouge1_fmeasure_doc_1, rouge1_fmeasure_doc_2, ...)
        metric_columns = [col for col in df.columns if col.startswith(f'metrics.{metric_root}_doc_')]
        
        # 3. Calculate the average of these columns for each run
        df[f'metrics_avg.{metric_root}'] = df[metric_columns].mean(axis=1)
        
        # Adding the column to the final dictionary
        average_scores[f'metrics_avg.{metric_root}'] = f'{metric_root} Avg'


    # 4. Selecting Key Columns for Display
    
    # Columns to keep: Model Name, Start Time, and the average columns we just created
    columns_to_keep = ['tags.mlflow.runName', 'start_time'] + list(average_scores.keys())
    
    df_results = df[columns_to_keep].copy()
    
    # 5. Rename columns for a clean display
    df_results.rename(columns={
        'tags.mlflow.runName': 'Model',
        'start_time': 'Start Time',
        'metrics_avg.extraction_f1': 'F1 Data Ext. (Avg)',
        'metrics_avg.category_accuracy': 'Accuracy Cat. (Avg)',
        'metrics_avg.rouge1_fmeasure': 'ROUGE-1 F1 (Avg)',
        'metrics_avg.rouge2_fmeasure': 'ROUGE-2 F1 (Avg)',
        'metrics_avg.rougeL_fmeasure': 'ROUGE-L F1 (Avg)',
    }, inplace=True)
    
    # Sort the final table by the average ROUGE-1 score (descending)
    df_results.sort_values(by='ROUGE-1 F1 (Avg)', ascending=False, inplace=True)
    
    
    # Show final table
    print("\n=======================================================")
    print(f"RÉSULTATS DU BENCHMARK : {EXPERIMENT_NAME}")
    print("=======================================================")
    print(df_results)
    print("\n")
    
    # 5. Export to CSV file
    df_results.to_csv("benchmark_summary.csv", index=False)
    print("Exportation en CSV terminée : benchmark_summary.csv")

except Exception as e:
    print(f"Une erreur s'est produite lors de l'analyse : {e}")