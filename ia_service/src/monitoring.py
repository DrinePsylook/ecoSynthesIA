"""
MLFlow Monitoring Module for IA Service

This module provides centralized monitoring and metrics tracking for the AI analysis pipeline.
It integrates with MLFlow to log:
- Latency metrics for each processing step
- Model confidence scores
- RAG retrieval statistics
- Errors and exceptions
"""

import os
import time
from typing import Optional, Dict, Any
from contextlib import contextmanager
from functools import wraps

import mlflow
from dotenv import load_dotenv

load_dotenv()

# MLFlow configuration
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "mlruns")
MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "ecoSynthesIA_Production")

# Initialize MLFlow
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)


class AnalysisMonitor:
    """
    Context manager for monitoring a single document analysis.
    
    Tracks metrics for the entire analysis pipeline including:
    - Total processing time
    - Individual step latencies (RAG, summary, extraction, categorization)
    - Confidence scores
    - Error states
    """
    
    def __init__(self, document_id: int, file_path: str):
        self.document_id = document_id
        self.file_path = file_path
        self.run = None
        self.start_time = None
        self.step_times: Dict[str, float] = {}
        self.metrics: Dict[str, float] = {}
        self.error: Optional[str] = None
    
    def __enter__(self):
        """Start MLFlow run and timer."""
        self.run = mlflow.start_run(run_name=f"doc_{self.document_id}")
        self.start_time = time.time()
        
        # Log initial parameters
        mlflow.log_param("document_id", self.document_id)
        mlflow.log_param("file_path", self.file_path)
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """End run and log final metrics."""
        total_time = time.time() - self.start_time
        
        # Log total processing time
        mlflow.log_metric("total_latency_seconds", total_time)
        
        # Log all step times
        for step_name, duration in self.step_times.items():
            mlflow.log_metric(f"latency_{step_name}_seconds", duration)
        
        # Log all collected metrics
        for metric_name, value in self.metrics.items():
            mlflow.log_metric(metric_name, value)
        
        # Log error if any
        if exc_type is not None:
            self.error = str(exc_val)
            mlflow.log_param("error", self.error[:250])  # Truncate long errors
            mlflow.log_metric("success", 0)
        else:
            mlflow.log_metric("success", 1)
        
        mlflow.end_run()
        return False  # Don't suppress exceptions
    
    @contextmanager
    def track_step(self, step_name: str):
        """
        Context manager to track latency of a specific step.
        
        Usage:
            with monitor.track_step("rag_retrieval"):
                # ... do RAG retrieval ...
        """
        start = time.time()
        try:
            yield
        finally:
            duration = time.time() - start
            self.step_times[step_name] = duration
    
    def log_metric(self, name: str, value: float):
        """Log a custom metric."""
        self.metrics[name] = value
    
    def log_rag_stats(self, chunks_retrieved: int, chunks_used: int):
        """Log RAG retrieval statistics."""
        self.metrics["rag_chunks_retrieved"] = chunks_retrieved
        self.metrics["rag_chunks_used"] = chunks_used
    
    def log_confidence(self, score: float):
        """Log the model's confidence score."""
        self.metrics["confidence_score"] = score
    
    def log_extraction_count(self, count: int):
        """Log number of data points extracted."""
        self.metrics["extracted_data_count"] = count


def create_monitor(document_id: int, file_path: str) -> AnalysisMonitor:
    """
    Factory function to create an AnalysisMonitor.
    
    Args:
        document_id: The database ID of the document
        file_path: Path to the PDF file
        
    Returns:
        AnalysisMonitor instance
    """
    return AnalysisMonitor(document_id, file_path)


# Decorator for tracking function latency
def track_latency(step_name: str):
    """
    Decorator to track the latency of a function.
    
    Note: This requires an active MLFlow run.
    
    Usage:
        @track_latency("summary_generation")
        def generate_summary(text):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            duration = time.time() - start
            
            # Log to active run if exists
            if mlflow.active_run():
                mlflow.log_metric(f"latency_{step_name}_seconds", duration)
            
            return result
        return wrapper
    return decorator