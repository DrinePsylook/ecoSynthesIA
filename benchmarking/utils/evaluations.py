import json
from rouge_score import rouge_scorer

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

def normalize_data_keys(data_object):
    """
    Normalizes the keys of the extracted data to a standard format for evaluation.
    This function assumes the input is a dictionary with a 'facts' key containing a list of extracted facts, each fact being a dictionary with 'key', 'value', and 'unit'.
    """
    normalized_facts_set = set()
    
    # Handle both the new and old formats
    if isinstance(data_object, dict) and 'facts' in data_object:
        fact_list = data_object['facts']
    else:
        fact_list = [] 

    for fact in fact_list:
        try:
            # The keys and values are normalized to lowercase and stripped of extra spaces
            key = fact.get('key', '').lower().strip()
            value = fact.get('value', '').lower().strip()
            unit = fact.get('unit', '').lower().strip()
            
            if key and value and value != "data not provided":
                # Use a tuple to store in a set for uniqueness
                normalized_facts_set.add((key, value, unit))
        except AttributeError:
            continue # Ignore the malformed fact entries
            
    return normalized_facts_set

def evaluate_data_extraction(generated_json_string, reference_json):
    """
    Evaluates data extraction by comparing Precision, Recall, and F1-Score based on the overlap of extracted "facts."
    """
    try:
        generated_data = json.loads(generated_json_string)
        is_valid_json = True
    except json.JSONDecodeError:
        print("CRITICAL ERROR: Failed to parse the Pydantic-generated JSON string.")
        return {'extraction_precision': 0.0, 'extraction_recall': 0.0, 'extraction_f1': 0.0, 'is_valid_json': 0.0}

    # Normalization of sets
    reference_facts = normalize_data_keys(reference_json)
    generated_facts = normalize_data_keys(generated_data)

    # Calculating metrics
    true_positives = len(reference_facts.intersection(generated_facts))
    possible_positives = len(reference_facts)
    generated_positives = len(generated_facts)

    precision = true_positives / generated_positives if generated_positives > 0 else 0.0
    recall = true_positives / possible_positives if possible_positives > 0 else 0.0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        'extraction_precision': precision,
        'extraction_recall': recall,
        'extraction_f1': f1_score,
        "is_valid_json": is_valid_json
    }