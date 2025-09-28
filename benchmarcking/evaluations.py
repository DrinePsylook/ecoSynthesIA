import json
from rouge_score import rouge_scorer
from collections import Counter

def evaluate_summary(generated_summary, reference_summary):
    """
    Evaluates the quality of the generated summary using the ROUGE metric.

    Returns a dictionary of scores (ROUGE-1, ROUGE-2, ROUGE-L). 
        ROUGE-1 measures: The overlap of individual words (unigrams) between the generated summary and the reference one.
        ROUGE-2 measures: The overlap of pairs of consecutive words (bigrams)
        ROUGE-L measures:The longest sequence of words that appears in the same order in both texts, without requiring the words to be consecutive.
    """
    # Using F1 score types (F-measure) -> the average of precision and recall
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)

    scores = scorer.score(reference_summary, generated_summary)

    # Formatting scores for MLflow recording
    formatted_scores = {
        'rouge1_fmeasure': scores['rouge1'].fmeasure,
        'rouge2_fmeasure': scores['rouge2'].fmeasure,
        'rougeL_fmeasure': scores['rougeL'].fmeasure,
        'rouge1_precision': scores['rouge1'].precision,
        'rouge1_recall': scores['rouge1'].recall
     }
    
    return formatted_scores

def evaluate_category(generated_category, reference_category):
    """
    Evaluates category classification (Simple Precision).
    """
    is_correct = 1.0 if generated_category.strip().upper() == reference_category.strip().upper() else 0.0

    return {'category_accuracy': is_correct}

# ------------------------ DATA_EXTRACTION --------------------------------------

def safe_json_parse(json_string):
    """
    Attempts to parse a string into JSON and returns a dictionary or None.
    """
    try:
        # Attempts to fix cases where the template includes markdown (```json ... ```)
        if json_string.strip().startswith('```') and json_string.strip().endswith('```'):
            json_string = json_string.strip()[7:-3]

        return json.loads(json_string)
    except json.JSONDecodeError:
        return None
    
def normalize_data_keys(data_dict):
    """
    Creates a normalized set of key-value pairs for comparison.
    """
    normalized_set = set()

    # Browse the extracted data (primary key: "key_data_name")
    for key, item in  data_dict.items():
        if isinstance(item, dict):
            # Normalizes the value and unit to lowercase, without spaces (context is too variable)
            value = str(item.get('value', '')).strip().lower()
            unit = str(item.get('unit', '')).strip().lower()

            # Uses a unique combination of primary key, value, and unit as a "fact"
            fact = (key.lower(), value, unit)
            normalized_set.add(fact)

    return normalized_set

def evaluate_data_extraction(generated_json_string, reference_json):
    """
    Evaluates data extraction by comparing Precision, Recall, and F1-Score based on the overlap of extracted "facts."
    """
    # Parsing the generated JSON
    generated_data = safe_json_parse(generated_json_string)

    if generated_data is None:
        # If the JSON is invalid, the extraction is considered a complete failure.
        return {'extraction_precision': 0.0, 'extraction_recall': 0.0, 'extraction_f1': 0.0, 'is_valid_json': 0.0}

    # Normalization of sets
    reference_facts = normalize_data_keys(reference_json)
    generated_facts = normalize_data_keys(generated_data)

    # Calculating metrics
    # How many extracted facts are correct?
    true_positives = len(reference_facts.intersection(generated_facts))

    # How many extracted facts should be extract?
    possible_positives = len(reference_facts)

    # How many extracted facts are extracted by IA?
    generated_positives = len(generated_facts)

    # Precision: TP / (TP + FP) -> False positives = (Generated - TP)
    precision = true_positives / generated_positives if generated_positives > 0 else 0.0

    # Recall : TP / (TP + FN) -> False negative = (Possible - TP)
    recall = true_positives / possible_positives if possible_positives > 0 else 0.0

    # F1-Score: The harmonic mean of precision and recall (primary metric)
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        'extraction_precision': precision,
        'extraction_recall': recall,
        'extraction_f1': f1_score,
        "is_valid_json": 1.0 # JSON successfully parsed
    }