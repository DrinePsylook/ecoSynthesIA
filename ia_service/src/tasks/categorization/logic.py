import os
import joblib
import torch
from typing import Dict, Any, Union

from transformers import AutoTokenizer, AutoModelForSequenceClassification

from ...config import EnvironmentalCategory, DISTILBERT_MODEL_PATH, BERT_LABEL_ENCODER_PATH

MODEL_COMPONENTS: Dict[str, Any] = {}

def load_classification_model():
    """
    Loads the DistilBERT model, the tokenizer, and the LabelEncoder.
    """
    if MODEL_COMPONENTS:
        return MODEL_COMPONENTS
    
    try:
        # Load the tokenizer
        tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_MODEL_PATH)

        # Load the DistilBERT model for sequence classification
        model = AutoModelForSequenceClassification.from_pretrained(DISTILBERT_MODEL_PATH)
        model.eval()  # Set the model to evaluation mode

        # Load the LabelEncoder
        label_encoder = joblib.load(BERT_LABEL_ENCODER_PATH)

        MODEL_COMPONENTS.update({
            "tokenizer": tokenizer,
            "model": model,
            "label_encoder": label_encoder
        })

        return MODEL_COMPONENTS
    
    except FileNotFoundError as e:
        print(f"Component BERT nor found: {e}")
        MODEL_COMPONENTS.update({"simulation": True})
        return MODEL_COMPONENTS
    except Exception as e:
        print(f"Error loading classification model components: {e}")
        MODEL_COMPONENTS.update({"simulation": True})
        return MODEL_COMPONENTS
    
def classify_summary(summary_text: str) -> str:
    """
    Classifies the generated summary using the loaded DistilBERT model.
    """
    components = load_classification_model()

    if components.get("simulation"):
        # Simulation mode: assign a category by default
        if any(word in summary_text.lower() for word in ["water", "river", "sea", "ocean"]):
            return EnvironmentalCategory.POLLUTION.value # ou WATER si vous l'avez
        elif any(word in summary_text.lower() for word in ["co2", "climate", "emission", "warming"]):
            return EnvironmentalCategory.CLIMATE.value
        else:
            return EnvironmentalCategory.BIODIVERSITY.value
        
    tokenizer = components["tokenizer"]
    model = components["model"]
    label_encoder = components["label_encoder"]

    try: 
        # Tokenization
        inputs = tokenizer(
            summary_text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )

        # Inference
        with torch.no_grad():
            outputs = model(**inputs)

        # Get predicted class index
        logits = outputs.logits
        predicted_class_idx = torch.argmax(logits, dim=1).item()

        # Converting the index to Category Label
        category_label = label_encoder.inverse_transform([predicted_class_idx])[0]

        return str(category_label)
    
    except Exception as e:
        print(f"Error during classification: {e}")
        return "Undetermined category (BERT error)"