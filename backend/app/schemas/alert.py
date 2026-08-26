from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertOut(BaseModel):
    id: int
    vehicle_id: Optional[int] = None
    vehicle_plate: Optional[str] = None
    detection_id: Optional[int] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    confidence: float
    timestamp: datetime
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    is_resolved: bool = True
