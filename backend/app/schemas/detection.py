from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DetectionOut(BaseModel):
    id: int
    camera_id: str
    camera_name: Optional[str] = None
    zone_name: Optional[str] = None
    vehicle_id: Optional[int] = None
    raw_plate_text: str
    normalized_plate_text: str
    ocr_confidence: float
    vehicle_type: str
    vehicle_color: str
    speed_kmh: float
    direction: str
    timestamp: datetime
    image_url: Optional[str] = None
    is_simulated: bool
    is_low_confidence: bool

    class Config:
        from_attributes = True

class DetectionCreate(BaseModel):
    camera_id: str
    raw_plate_text: str
    normalized_plate_text: Optional[str] = None
    ocr_confidence: float = 0.95
    vehicle_type: str = "car"
    vehicle_color: str = "white"
    speed_kmh: float = 45.0
    direction: str = "NB"
    timestamp: Optional[datetime] = None
    image_url: Optional[str] = None
    is_simulated: bool = False
