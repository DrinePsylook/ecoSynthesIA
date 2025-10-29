import pandas as pd
import json 
import time
import os
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompt_system import PROMPT_SYSTEM_CLASSIFIER

load_dotenv()

AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
DEPLOYMENT_NAME = os.getenv("DEPLOYMENT_NAME") 
API_VERSION = os.getenv("API_VERSION")

guardian_articles="../news_datasets/llm_batch_402.csv"
labeled_articles="../news_datasets/train_402_labeled.csv"

client = AzureOpenAI(
    api_key=AZURE_OPENAI_KEY,
    api_version=API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT
)

def label_article_via_llm(article_text: str, article_index: int) -> str:
    """
    Call Azure OpenAI to label an item.
    The ID is passed for error display.
    """

    user_prompt = f"""
    Parses the article below and returns the category in the requested JSON format.

    Text to parse:
    \"\"\"
    {article_text}
    \"\"\"
    """

    try:
        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME, 
            messages=[
                {"role": "system", "content": PROMPT_SYSTEM_CLASSIFIER},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0, 
            response_format={"type": "json_object"} 
        )
        json_response = json.loads(response.choices[0].message.content.strip())
        return json_response.get("category", "LABEL_ERROR")
        
    except Exception as e:
        print(f"!!! FAIL API for the article ID {article_index} : {e}")
        return "API_CALL_FAILED"
    

def process_data():
    if os.path.exists(labeled_articles):
        print(f"Working file found: Resumption of labeling since '{labeled_articles}'.")
        df_work = pd.read_csv(labeled_articles)
    else:
        print(f"'{labeled_articles}' not found: Starting labeling from the beginning with {guardian_articles}.")
        df_work = pd.read_csv(guardian_articles)
        if 'llm_category' not in df_work.columns:
            df_work['llm_category'] = None

    start_index = df_work['llm_category'].last_valid_index()

    if start_index is None:
        start_index = 0
    else:
        start_index += 1

    if start_index >= len(df_work):
        print("All articles are already labeled.")
        return
    
    total_articles = len(df_work)
    print(f"Resuming labeling from article {start_index + 1} out of {total_articles}.")        

    for index in range(start_index, total_articles):
        row = df_work.iloc[index]
        article_text = row['Full Text']
        article_id = index 

        category = label_article_via_llm(article_text, article_id)
        df_work.loc[index, 'llm_category'] = category

        print(f"Article {index+1}/{len(df_work)} labeled : {category}")
    
    try:
        df_work.to_csv(labeled_articles, index=False)
    except Exception as e:
        print(f"!!! FAIL to save the working file '{labeled_articles}' : {e}")
    
    print(f"Article {index + 1}/{total_articles} [ID: {article_id}] labellisé : {category} -> SAUVEGARDÉ")
    time.sleep(1) 


if os.path.exists(guardian_articles):
    print(f"File found : {guardian_articles}. Start process.")
    process_data()
else:
    print(f"CRITICAL ERROR: The file {guardian_articles} doesn't exist.")