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
    speed_kmh: Optional[float] = None
    distance_from_prev_km: Optional[float] = None
    travel_time_sec: Optional[float] = None
    implied_speed_kmh: Optional[float] = None
    direction: str
    raw_plate_read: Optional[str] = None
    ocr_confidence: Optional[float] = None
    detection_confidence: Optional[float] = None
    match_type: str = "DIRECT_VERIFIED"  # DIRECT_VERIFIED, OCR_ASSISTED_MATCH, PROBABILISTIC_MATCH, FLAGGED_IMPOSSIBLE
    validation_status: str = "VERIFIED"  # FIRST_CHECKPOINT, VERIFIED, OCR_ASSISTED, ANOMALOUS
    prev_camera_id: Optional[str] = None
    prev_camera_name: Optional[str] = None
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
    verified_points_count: int = 0
    degraded_points_count: int = 0
    anomaly_points_count: int = 0
    total_distance_km: Optional[float] = None
    total_duration_minutes: Optional[float] = None
    avg_speed_kmh: Optional[float] = None
    max_speed_threshold_kmh: float = 120.0
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    points: List[TrajectoryPointOut]
    has_impossible_transitions: bool
    status_summary: str
