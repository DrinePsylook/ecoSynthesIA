import pytest
import traceback
import torch
from ml_training.training.load_training_model import load_bert_classifier, predict_category

# Global variable to store the loaded model
CLASSIFIER_COMPONENTS = None

@pytest.fixture(scope="session")
def classifier_components():
    """Load the BERT model and its components only once per test session"""
    global CLASSIFIER_COMPONENTS
    if CLASSIFIER_COMPONENTS is None:
        print("\n[INFO] Loading classifier components for testing...")
        try: 
            model, tokenizer, label_encoder = load_bert_classifier()
            DEVICE = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
            CLASSIFIER_COMPONENTS = (model, tokenizer, label_encoder, DEVICE)
            print(f"[INFO] ✅ Components loaded successfully")
            print(f"[INFO] Classes: {list(label_encoder.classes_)}")
        except Exception as e:
            error_details = traceback.format_exc()
            pytest.fail(f"Failed to load model components: {e}\n\nDetails:\n{error_details}")
    return CLASSIFIER_COMPONENTS


def test_load_classifier_components(classifier_components):
    """Test that all components are loaded correctly"""
    model, tokenizer, label_encoder, device = classifier_components
    
    assert model is not None, "Model should be loaded"
    assert tokenizer is not None, "Tokenizer should be loaded"
    assert label_encoder is not None, "Label encoder should be loaded"
    assert hasattr(label_encoder, 'classes_'), "Label encoder should have classes_"
    assert len(label_encoder.classes_) > 0, "Label encoder should have at least one class"

def test_prediction_output_format(classifier_components):
    """Check that the output format is a valid string."""
    model, tokenizer, label_encoder, device = classifier_components
    
    # Arrange
    test_text = "CO2 emissions increase every year due to maritime transport."
    
    # Act
    prediction = predict_category(test_text, model, tokenizer, label_encoder, device)
    
    # Assert
    assert isinstance(prediction, str), "Prediction should be a string"
    assert prediction in label_encoder.classes_, f"Prediction '{prediction}' should be in valid classes: {list(label_encoder.classes_)}"
    assert len(prediction) > 0, "Prediction should not be empty"

def test_prediction_with_empty_text(classifier_components):
    """Test behavior with empty text"""
    model, tokenizer, label_encoder, device = classifier_components
    
    # Act
    prediction = predict_category("", model, tokenizer, label_encoder, device)
    
    # Assert
    assert isinstance(prediction, str)
    assert prediction in label_encoder.classes_

def test_prediction_with_long_text(classifier_components):
    """Test that long texts are handled properly (truncation)"""
    model, tokenizer, label_encoder, device = classifier_components
    
    # Arrange: Create a very long text
    long_text = " ".join(["Climate change impacts the environment."] * 100)
    
    # Act
    prediction = predict_category(long_text, model, tokenizer, label_encoder, device)
    
    # Assert
    assert isinstance(prediction, str)
    assert prediction in label_encoder.classes_

def test_prediction_consistency(classifier_components):
    """Test that the same input produces the same output"""
    model, tokenizer, label_encoder, device = classifier_components
    
    # Arrange
    test_text = "Renewable energy is the future."
    
    # Act
    prediction1 = predict_category(test_text, model, tokenizer, label_encoder, device)
    prediction2 = predict_category(test_text, model, tokenizer, label_encoder, device)
    
    # Assert
    assert prediction1 == prediction2, "Same input should produce same output"

@pytest.mark.parametrize("test_text,expected_type", [
    ("Global warming affects polar ice caps.", str),
    ("Solar panels generate clean energy.", str),
    ("Deforestation contributes to CO2 levels.", str),
])
def test_multiple_predictions(classifier_components, test_text, expected_type):
    """Test predictions on multiple sample texts"""
    model, tokenizer, label_encoder, device = classifier_components
    
    # Act
    prediction = predict_category(test_text, model, tokenizer, label_encoder, device)
    
    # Assert
    assert isinstance(prediction, expected_type)
    assert prediction in label_encoder.classes_