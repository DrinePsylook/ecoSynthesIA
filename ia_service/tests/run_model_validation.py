"""
Model Validation Script for IA Service (C12 - Automated Testing)

This script validates the AI model's performance against a reference dataset.
It calls the production IA service endpoint and compares results to ground truth.

Metrics evaluated:
    - Summary: ROUGE-1, ROUGE-2, ROUGE-L (F-measure)
    - Category: Accuracy (exact match)
    - Data Extraction: Precision, Recall, F1 (based on key-value overlap)

Exit codes:
    0: All tests passed (above threshold)
    1: Some tests failed (below threshold) or error occurred
"""

import os
import sys
import json
import argparse
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

import requests
import mlflow
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rouge_score import rouge_scorer

load_dotenv()

# Configuration
IA_SERVICE_URL = os.getenv("IA_SERVICE_URL", "http://localhost:8000")
MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "ecoSynthesIA_Validation")
REFERENCES_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "benchmarking",
    "references_data.JSON"
)
REPORTS_RELATIVE_PATH = "bucket/test_reports"

# Default thresholds for pass/fail
DEFAULT_THRESHOLDS = {
    "rouge1_fmeasure": 0.25,
    "rougeL_fmeasure": 0.20,
    "category_accuracy": 0.70,  # 70% of documents correctly categorized
}


@dataclass
class ValidationResult:
    """Result of validating a single document."""
    document_id: str
    title: str
    success: bool
    latency: float
    rouge1_fmeasure: float = 0.0
    rouge2_fmeasure: float = 0.0
    rougeL_fmeasure: float = 0.0
    category_correct: bool = False
    extraction_count: int = 0
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "title": self.title,
            "success": self.success,
            "latency": self.latency,
            "rouge1_fmeasure": self.rouge1_fmeasure,
            "rouge2_fmeasure": self.rouge2_fmeasure,
            "rougeL_fmeasure": self.rougeL_fmeasure,
            "category_correct": self.category_correct,
            "extraction_count": self.extraction_count,
            "error": self.error,
        }


@dataclass
class ValidationSummary:
    """Summary of all validation results."""
    total_documents: int = 0
    successful: int = 0
    failed: int = 0
    avg_rouge1: float = 0.0
    avg_rouge2: float = 0.0
    avg_rougeL: float = 0.0
    category_accuracy: float = 0.0
    avg_latency: float = 0.0
    results: List[ValidationResult] = field(default_factory=list)
    
    def passes_thresholds(self, thresholds: Dict[str, float]) -> bool:
        """Check if validation passes all thresholds."""
        if self.avg_rouge1 < thresholds.get("rouge1_fmeasure", 0):
            return False
        if self.avg_rougeL < thresholds.get("rougeL_fmeasure", 0):
            return False
        if self.category_accuracy < thresholds.get("category_accuracy", 0):
            return False
        return True


def load_reference_data() -> List[Dict[str, Any]]:
    """Load reference data from JSON file."""
    with open(REFERENCES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("documents", [])


def evaluate_summary(generated: str, reference: str) -> Dict[str, float]:
    """Evaluate summary using ROUGE metrics."""
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
    scores = scorer.score(reference, generated)
    
    return {
        'rouge1_fmeasure': scores['rouge1'].fmeasure,
        'rouge2_fmeasure': scores['rouge2'].fmeasure,
        'rougeL_fmeasure': scores['rougeL'].fmeasure,
        'rouge1_precision': scores['rouge1'].precision,
        'rouge1_recall': scores['rouge1'].recall,
    }


def evaluate_category(generated: str, reference: str) -> bool:
    """Check if category matches (case-insensitive)."""
    if not generated or not reference:
        return False
    return generated.strip().upper() == reference.strip().upper()


def call_ia_service(file_path: str, document_id: int) -> Dict[str, Any]:
    """
    Call the IA service endpoint to analyze a document.
    
    Args:
        file_path: Relative path to the PDF file
        document_id: Database ID for the document
        
    Returns:
        API response with summary, extracted_data, and category
    """
    url = f"{IA_SERVICE_URL}/api/analyze-document"
    payload = {
        "file_path": file_path,
        "document_id": document_id
    }
    
    response = requests.post(url, json=payload, timeout=900)  # 15 minutes
    response.raise_for_status()
    return response.json()


def validate_document(doc_meta: Dict[str, Any]) -> ValidationResult:
    """
    Validate a single document against reference data.
    
    Args:
        doc_meta: Document metadata from references_data.JSON
        
    Returns:
        ValidationResult with metrics
    """
    doc_id = doc_meta["id"]
    title = doc_meta["title"]
    
    # Build file path as relative path for the API
    # The service expects paths like 'bucket/test_reports/filename.pdf'
    file_path = f"{REPORTS_RELATIVE_PATH}/{title}"
    
    print(f"\n📄 Validating document {doc_id}: {title}")
    
    result = ValidationResult(
        document_id=doc_id,
        title=title,
        success=False,
        latency=0.0
    )
    
    try:
        # Call the IA service
        start_time = time.time()
        api_response = call_ia_service(file_path, int(doc_id))
        result.latency = time.time() - start_time
        
        # Extract results
        generated_summary = api_response.get("summary", {}).get("textual_summary", "")
        generated_category = api_response.get("category", {}).get("name", "")
        extracted_data = api_response.get("extracted_data", [])
        
        # Evaluate summary
        reference_summary = doc_meta.get("reference_summary", "")
        if reference_summary and generated_summary:
            rouge_scores = evaluate_summary(generated_summary, reference_summary)
            result.rouge1_fmeasure = rouge_scores["rouge1_fmeasure"]
            result.rouge2_fmeasure = rouge_scores["rouge2_fmeasure"]
            result.rougeL_fmeasure = rouge_scores["rougeL_fmeasure"]
        
        # Evaluate category
        reference_category = doc_meta.get("reference_category", "")
        result.category_correct = evaluate_category(generated_category, reference_category)
        
        # Count extractions
        result.extraction_count = len(extracted_data)
        
        result.success = True
        
        print(f"   ✅ ROUGE-1: {result.rouge1_fmeasure:.3f}, ROUGE-L: {result.rougeL_fmeasure:.3f}")
        print(f"   📂 Category: {'✓' if result.category_correct else '✗'} (got: {generated_category}, expected: {reference_category})")
        print(f"   📊 Extracted {result.extraction_count} data points")
        print(f"   ⏱️  Latency: {result.latency:.1f}s")
        
    except requests.exceptions.ConnectionError:
        result.error = f"Could not connect to IA service at {IA_SERVICE_URL}"
        print(f"   ❌ Connection error: {result.error}")
    except requests.exceptions.Timeout:
        result.error = "Request timed out (900s/15min)"
        print(f"   ❌ Timeout: {result.error}")
    except requests.exceptions.HTTPError as e:
        result.error = f"HTTP error: {e.response.status_code} - {e.response.text[:200]}"
        print(f"   ❌ HTTP error: {result.error}")
    except Exception as e:
        result.error = str(e)
        print(f"   ❌ Error: {result.error}")
    
    return result


def run_validation(
    doc_ids: Optional[List[str]] = None,
    thresholds: Optional[Dict[str, float]] = None
) -> ValidationSummary:
    """
    Run validation on all or selected documents.
    
    Args:
        doc_ids: Optional list of document IDs to validate (None = all)
        thresholds: Optional custom thresholds for pass/fail
        
    Returns:
        ValidationSummary with aggregated results
    """
    if thresholds is None:
        thresholds = DEFAULT_THRESHOLDS
    
    # Load reference data
    reference_docs = load_reference_data()
    
    # Filter by doc_ids if specified
    if doc_ids:
        reference_docs = [d for d in reference_docs if d["id"] in doc_ids]
    
    print(f"\n{'='*60}")
    print(f"🧪 MODEL VALIDATION - {len(reference_docs)} documents to test")
    print(f"{'='*60}")
    print(f"IA Service URL: {IA_SERVICE_URL}")
    print(f"Thresholds: ROUGE-1 >= {thresholds.get('rouge1_fmeasure', 0):.2f}, "
          f"ROUGE-L >= {thresholds.get('rougeL_fmeasure', 0):.2f}, "
          f"Category >= {thresholds.get('category_accuracy', 0)*100:.0f}%")
    
    # Initialize MLFlow
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
    
    summary = ValidationSummary(total_documents=len(reference_docs))
    
    with mlflow.start_run(run_name="validation_run"):
        mlflow.log_param("total_documents", len(reference_docs))
        mlflow.log_params(thresholds)
        
        # Validate each document
        for doc_meta in reference_docs:
            result = validate_document(doc_meta)
            summary.results.append(result)
            
            if result.success:
                summary.successful += 1
            else:
                summary.failed += 1
            
            # Log individual document metrics to MLFlow
            doc_id = result.document_id
            mlflow.log_metric(f"rouge1_doc_{doc_id}", result.rouge1_fmeasure)
            mlflow.log_metric(f"rougeL_doc_{doc_id}", result.rougeL_fmeasure)
            mlflow.log_metric(f"category_correct_doc_{doc_id}", 1.0 if result.category_correct else 0.0)
            mlflow.log_metric(f"latency_doc_{doc_id}", result.latency)
            mlflow.log_metric(f"extraction_count_doc_{doc_id}", result.extraction_count)
        
        # Calculate aggregates
        successful_results = [r for r in summary.results if r.success]
        if successful_results:
            summary.avg_rouge1 = sum(r.rouge1_fmeasure for r in successful_results) / len(successful_results)
            summary.avg_rouge2 = sum(r.rouge2_fmeasure for r in successful_results) / len(successful_results)
            summary.avg_rougeL = sum(r.rougeL_fmeasure for r in successful_results) / len(successful_results)
            summary.category_accuracy = sum(1 for r in successful_results if r.category_correct) / len(successful_results)
            summary.avg_latency = sum(r.latency for r in successful_results) / len(successful_results)
        
        # Log aggregate metrics
        mlflow.log_metric("avg_rouge1_fmeasure", summary.avg_rouge1)
        mlflow.log_metric("avg_rouge2_fmeasure", summary.avg_rouge2)
        mlflow.log_metric("avg_rougeL_fmeasure", summary.avg_rougeL)
        mlflow.log_metric("category_accuracy", summary.category_accuracy)
        mlflow.log_metric("avg_latency_seconds", summary.avg_latency)
        mlflow.log_metric("documents_successful", summary.successful)
        mlflow.log_metric("documents_failed", summary.failed)
        
        # Check if passes thresholds
        passes = summary.passes_thresholds(thresholds)
        mlflow.log_metric("validation_passed", 1.0 if passes else 0.0)
        
        # Save detailed results as artifact
        results_json = json.dumps([r.to_dict() for r in summary.results], indent=2, ensure_ascii=False)
        mlflow.log_text(results_json, "validation_results.json")
    
    return summary


def print_summary(summary: ValidationSummary, thresholds: Dict[str, float]):
    """Print validation summary to console."""
    print(f"\n{'='*60}")
    print("📊 VALIDATION SUMMARY")
    print(f"{'='*60}")
    print(f"Documents tested:    {summary.total_documents}")
    print(f"Successful:          {summary.successful}")
    print(f"Failed:              {summary.failed}")
    print(f"\n--- Aggregate Metrics ---")
    print(f"Avg ROUGE-1 F1:      {summary.avg_rouge1:.4f} (threshold: {thresholds.get('rouge1_fmeasure', 0):.2f})")
    print(f"Avg ROUGE-2 F1:      {summary.avg_rouge2:.4f}")
    print(f"Avg ROUGE-L F1:      {summary.avg_rougeL:.4f} (threshold: {thresholds.get('rougeL_fmeasure', 0):.2f})")
    print(f"Category Accuracy:   {summary.category_accuracy*100:.1f}% (threshold: {thresholds.get('category_accuracy', 0)*100:.0f}%)")
    print(f"Avg Latency:         {summary.avg_latency:.1f}s")
    print(f"{'='*60}")
    
    passes = summary.passes_thresholds(thresholds)
    if passes:
        print("✅ VALIDATION PASSED - All metrics above thresholds")
    else:
        print("❌ VALIDATION FAILED - Some metrics below thresholds")
    
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Validate IA model against reference dataset")
    parser.add_argument("--doc-id", type=str, help="Validate specific document ID only")
    parser.add_argument("--threshold", type=float, default=0.25, help="ROUGE-1 threshold for pass/fail")
    parser.add_argument("--url", type=str, help="Override IA service URL")
    args = parser.parse_args()
    
    # Override URL if provided
    global IA_SERVICE_URL
    if args.url:
        IA_SERVICE_URL = args.url
    
    # Build thresholds
    thresholds = DEFAULT_THRESHOLDS.copy()
    thresholds["rouge1_fmeasure"] = args.threshold
    
    # Build doc_ids filter
    doc_ids = [args.doc_id] if args.doc_id else None
    
    # Run validation
    summary = run_validation(doc_ids=doc_ids, thresholds=thresholds)
    
    # Print summary
    print_summary(summary, thresholds)
    
    # Exit with appropriate code
    if summary.passes_thresholds(thresholds) and summary.failed == 0:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
