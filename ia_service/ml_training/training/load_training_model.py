import torch
import pickle

from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast

BERT_OUTPUT_DIR = 'classification_report/distilbert_classification_model'
ENCODER_FILENAME_PKL = 'classification_report/bert_label_encoder.pkl'
DEVICE = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')

# Load the DistilBERT model for sequence classification
def load_bert_classifier():
    # Load the pre-trained DistilBERT model
    model = DistilBertForSequenceClassification.from_pretrained(BERT_OUTPUT_DIR).to(DEVICE)
    tokenizer = DistilBertTokenizerFast.from_pretrained(BERT_OUTPUT_DIR)

    # Load the label encoder
    with open(ENCODER_FILENAME_PKL, 'rb') as f:
        label_encoder = pickle.load(f)

    # Set the model to evaluation mode
    model.eval()

    return model, tokenizer, label_encoder


# Load the components when the service IA starts
final_model, final_tokenizer, final_label_encoder = load_bert_classifier()

def predict_category(text: str) -> str:
    # Tokenize input text
    inputs = final_tokenizer(
        text,
        return_tensors='pt',
        truncation=True,
        padding=True,
        max_length=512
    ).to(DEVICE)

    # Get model predictions
    with torch.no_grad():
        outputs = final_model(**inputs)

    # Extract predicted class id
    logits = outputs.logits
    predicted_id = torch.argmax(logits, dim=1).item()

    # Decode the predicted class id to label
    predicted_category = final_label_encoder.invers_transform([predicted_id])[0]

    return predicted_category