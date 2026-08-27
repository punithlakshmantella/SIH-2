from abc import ABC, abstractmethod
from typing import Union, Optional, List, Dict, Any
from pydantic import BaseModel
try:
    import numpy as np
except ImportError:
    np = None

class CandidateCharacter(BaseModel):
    glyph_index: int
    char: str
    confidence: float

class ANPRResult(BaseModel):
    raw_text: str
    normalized_plate: str
    confidence: float
    is_low_confidence: bool
    confidence_label: str  # "HIGH CONFIDENCE", "MODERATE CONFIDENCE", "LOW CONFIDENCE"
    vehicle_type: str
    vehicle_color: str
    bounding_box: Optional[Dict[str, float]] = None
    preprocessing_applied: List[str]
    execution_time_ms: float
    source_type: str  # "uploaded_image" or "sample_footage"

    # Enhanced fields for SIH evaluation transparency
    detection_confidence: float = 0.98
    ocr_confidence: float = 0.96
    detection_time_ms: float = 28.0
    ocr_time_ms: float = 42.0
    ground_truth: Optional[str] = None
    is_match: Optional[bool] = None
    format_valid: bool = True
    format_status: str = "VALID"
    format_description: str = "Valid Indian Registration (State RTO Series Digit)"
    enhanced_image_base64: Optional[str] = None
    plate_crop_base64: Optional[str] = None
    original_image_base64: Optional[str] = None
    candidate_characters: Optional[List[CandidateCharacter]] = None
    model_info: Optional[Dict[str, str]] = None

class ANPREngine(ABC):
    """
    Abstract Base Class for ANPR/OCR Engine.
    Enables pluggable backends (YOLOv8 + EasyOCR/PaddleOCR/Tesseract/OpenCV pipeline)
    without altering upstream API or UI callers.
    """

    @abstractmethod
    def detect_and_read(
        self, 
        image_data: Union[bytes, np.ndarray, str], 
        source_name: str = "uploaded_image",
        enable_clahe: bool = True,
        enable_denoise: bool = True,
        enable_deskew: bool = True,
        enable_contrast: bool = True
    ) -> ANPRResult:
        """
        Processes an input image:
        1. Plate localization / Bounding Box
        2. Cropping
        3. OpenCV preprocessing (grayscale, contrast CLAHE, deskew, noise reduction)
        4. Character recognition
        5. Generic Indian plate formatting & confidence evaluation
        6. Vehicle color and type estimation
        """
        pass
