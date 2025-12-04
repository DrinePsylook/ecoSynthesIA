import os
from enum import Enum

class ChartType(str, Enum):
    LINE_CHART = "LineChart"
    BAR_CHART = "BarChart"
    PIE_CHART = "PieChart"
    CHOROPLETH_MAP = "ChoroplethMap"
    UNKNOWN = "Unknown"

class EnvironmentalCategory(str, Enum):
    CLIMATE = "CLIMATE AND EMISSIONS"
    BIODIVERSITY = "BIODIVERSITY AND ECOSYSTEMS"
    POLLUTION = "POLLUTION AND ENVIRONMENTAL QUALITY"
    NATURAL_RESOURCES = "NATURAL RESOURCES"
    ENERGY = "ENERGY AND TRANSITION"
    POLICIES = "POLICIES AND REGULATION"
    SOCIO_ECONOMIC = "SOCIO-ECONOMIC IMPACT"
    RISKS = "RISKS AND DISASTERS"

# Simple: use paths relative to working directory
BASE_DIR = os.getcwd()  # Working directory
BUCKET_DIR = os.path.join(BASE_DIR, 'bucket')

# ML paths
BASE_MODEL_DIR = os.path.join(BASE_DIR, 'ml_training', 'training', 'classification_report')
BERT_LABEL_ENCODER_PATH = os.path.join(BASE_MODEL_DIR, 'bert_label_encoder.pkl')
DISTILBERT_MODEL_PATH = os.path.join(BASE_MODEL_DIR, 'distilbert_classification_model')

# ChromaDB
CHROMA_PERSIST_DIR = os.path.join(BASE_DIR, 'chroma_db')
CHROMA_COLLECTION_NAME = "ecosynthesia_collection"
CHROMA_CLIENT_TYPE = "local"

# Model configuration
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
SUMMARY_LLM = "llama3.1"

# --- Chunking Configuration (Standard RecursiveTextSplitter) ---
# Maximum size of each text chunk (in characters)
CHUNK_SIZE = 1000
# Overlap between chunks to ensure context continuity
CHUNK_OVERLAP = 200

# Minimum confidence score threshold for data extraction
MIN_CONFIDENCE_THRESHOLD_DATA = 0.3