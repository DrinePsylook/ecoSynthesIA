import os
import torch
import pickle
from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BERT_OUTPUT_DIR = os.path.join(CURRENT_DIR, 'classification_report', 'distilbert_classification_model')
ENCODER_FILENAME_PKL = os.path.join(CURRENT_DIR, 'classification_report', 'bert_label_encoder.pkl')

DEVICE = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')

def load_bert_classifier():
    """Load BERT model, tokenizer and label encoder from local files"""
    
    # Check : folders does exist ?
    if not os.path.exists(BERT_OUTPUT_DIR):
        raise FileNotFoundError(
            f"The model folder does not exist: {BERT_OUTPUT_DIR}\n"
        )
    
    # Vérification 3: Le fichier encoder existe-t-il ?
    if not os.path.exists(ENCODER_FILENAME_PKL):
        raise FileNotFoundError(
            f"The label_encoder file does not exist: {ENCODER_FILENAME_PKL}"
        )
    
    try:
        # Load model 
        model = DistilBertForSequenceClassification.from_pretrained(
            BERT_OUTPUT_DIR,
            local_files_only=True
        ).to(DEVICE)
        
        # Load tokenizer
        tokenizer = DistilBertTokenizerFast.from_pretrained(
            BERT_OUTPUT_DIR,
            local_files_only=True
        )
    
        # Load the label encoder
        with open(ENCODER_FILENAME_PKL, 'rb') as f:
            label_encoder = pickle.load(f)
        
        # Set the model to evaluation mode
        model.eval()
        
        return model, tokenizer, label_encoder
        
    except Exception as e:
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        raise

# Lazy loading
_CACHED_COMPONENTS = None

def get_classifier_components():
    """Get cached classifier components or load them if not already loaded"""
    global _CACHED_COMPONENTS
    if _CACHED_COMPONENTS is None:
        _CACHED_COMPONENTS = load_bert_classifier()
    return _CACHED_COMPONENTS

def predict_category(text: str, model=None, tokenizer=None, label_encoder=None, device=None) -> str:
    """
    Predict category for given text.
    
    Args:
        text: Input text to classify
        model: Optional pre-loaded model (uses cached if None)
        tokenizer: Optional pre-loaded tokenizer (uses cached if None)
        label_encoder: Optional pre-loaded encoder (uses cached if None)
        device: Optional device (uses default if None)
    
    Returns:
        Predicted category as string
    """
    # Use provided components or load cached ones
    if model is None or tokenizer is None or label_encoder is None:
        model, tokenizer, label_encoder = get_classifier_components()
    
    if device is None:
        device = DEVICE
    
    # Tokenize input text
    inputs = tokenizer(
        text,
        return_tensors='pt',
        truncation=True,
        padding=True,
        max_length=512
    ).to(device)
    
    # Get model predictions
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Extract predicted class id
    logits = outputs.logits
    predicted_id = torch.argmax(logits, dim=1).item()
    
    # Decode the predicted class id to label
    predicted_category = label_encoder.inverse_transform([predicted_id])[0]
    
    return predicted_category