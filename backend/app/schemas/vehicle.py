from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class VehicleSummary(BaseModel):
    id: int
    primary_plate: str
    vehicle_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    last_camera_id: Optional[str] = None
    last_camera_name: Optional[str] = None
    last_zone_name: Optional[str] = None
    total_detections: int
    cameras_visited_count: int
    total_distance_km: float
    avg_speed_kmh: float
    alert_count: int
    is_flagged: bool

    class Config:
        from_attributes = True

class VehicleOut(BaseModel):
    id: int
    primary_plate: str
    vehicle_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    last_camera_id: Optional[str] = None
    total_detections: int
    is_flagged: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VehicleSearchQuery(BaseModel):
    plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    color: Optional[str] = None
    camera_id: Optional[str] = None
    zone_id: Optional[int] = None
    direction: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 50
    offset: int = 0
