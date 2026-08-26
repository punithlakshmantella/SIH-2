from abc import ABC, abstractmethod
from typing import Union, Optional, List, Dict, Any
from pydantic import BaseModel
try:
    import numpy as np
except ImportError:
    np = None

class ANPRResult(BaseModel):
    raw_text: str
    normalized_plate: str
    confidence: float
    is_low_confidence: bool
    confidence_label: str  # "HIGH CONFIDENCE", "MODERATE", "LOW CONFIDENCE"
    vehicle_type: str
    vehicle_color: str
    bounding_box: Optional[Dict[str, float]] = None
    preprocessing_applied: List[str]
    execution_time_ms: float
    source_type: str  # "uploaded_image" or "sample_footage"

class ANPREngine(ABC):
    """
    Abstract Base Class for ANPR/OCR Engine.
    Enables pluggable backends (YOLOv8 + EasyOCR/PaddleOCR/Tesseract/OpenCV pipeline)
    without altering upstream API or UI callers.
    """

    @abstractmethod
    def detect_and_read(self, image_data: Union[bytes, np.ndarray, str], source_name: str = "uploaded_image") -> ANPRResult:
        """
        Processes an input image:
        1. Plate localization
        2. OpenCV preprocessing (grayscale, contrast CLAHE, deskew, noise reduction)
        3. Character recognition
        4. Generic Indian plate formatting & confidence evaluation
        5. Vehicle color and type estimation
        """
        pass
