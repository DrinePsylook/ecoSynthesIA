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

BASE_MODEL_DIR = "ia_service/training/classification_report"
BERT_LABEL_ENCODER_PATH = f"{BASE_MODEL_DIR}/bert_label_encoder.pkl"
DISTILBERT_MODEL_PATH = f"{BASE_MODEL_DIR}/distilbert_classification_model"
