from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CameraHealthOut(BaseModel):
    id: int
    camera_id: str
    timestamp: datetime
    status: str
    latency_ms: float
    packet_loss_pct: float
    fps_actual: float
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class CameraOut(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    road_id: Optional[int] = None
    zone_id: int
    zone_name: Optional[str] = None
    road_name: Optional[str] = None
    direction: str
    status: str
    fps: float
    latency_ms: float
    last_heartbeat: Optional[datetime] = None
    ocr_accuracy: float
    vehicles_per_min: float
    is_simulation: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CameraCreate(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    road_id: Optional[int] = None
    zone_id: int
    direction: str = "NB"
    status: str = "online"
    fps: float = 30.0
    latency_ms: float = 40.0
