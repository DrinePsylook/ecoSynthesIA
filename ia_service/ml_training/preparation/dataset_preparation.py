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

guardian_articles="./news_dataset/llm_batch_80.csv"

client = AzureOpenAI(
    api_key=AZURE_OPENAI_KEY,
    api_version=API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT
)

def label_article_via_llm(article_text: str, article_index: int) -> str:
    """Call Azure OpenAI to label an item."""

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
        print(f"Erreur API sur l'article {article_index}. Détail : {e}") 
        return "API_CALL_FAILED"
    

def process_data():
    df = pd.read_csv(guardian_articles)
    df['llm_category'] = None

    print(f"Start of labeling of {len(df)} articles with the model {DEPLOYMENT_NAME}...")

    for index, row in df.iterrows():
        category = label_article_via_llm(row['Full Text'], index)
        df.loc[index, 'llm_category'] = category

        print(f"Article {index+1}/{len(df)} labeled : {category}")
        time.sleep(0.5) 
    
    df.to_csv('train_80_labeled.csv', index=False)
    print("\nLabeling completed and saved in 'train_80_labeled.csv'.")

process_data()