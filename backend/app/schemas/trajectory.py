from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class TrajectoryPointOut(BaseModel):
    sequence_index: int
    detection_id: Optional[int] = None
    camera_id: str
    camera_name: str
    zone_name: str
    road_name: Optional[str] = None
    latitude: float
    longitude: float
    timestamp: datetime
    speed_kmh: float
    distance_from_prev_km: float
    travel_time_sec: float
    implied_speed_kmh: float
    direction: str
    raw_plate_read: Optional[str] = None
    ocr_confidence: Optional[float] = None
    is_impossible_transition: bool = False
    is_low_confidence: bool = False
    anomaly_flags: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class TrajectoryResponse(BaseModel):
    vehicle_id: int
    primary_plate: str
    vehicle_type: str
    vehicle_color: str
    total_points: int
    total_distance_km: float
    total_duration_minutes: float
    avg_speed_kmh: float
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    points: List[TrajectoryPointOut]
    has_impossible_transitions: bool
    status_summary: str
