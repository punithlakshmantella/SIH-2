from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class ZoneOut(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    risk_level: str
    polygon_geojson: Optional[Dict[str, Any]] = None
    camera_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True

class RoadOut(BaseModel):
    id: int
    name: str
    zone_id: int
    zone_name: Optional[str] = None
    road_type: str
    speed_limit_kmh: float
    length_km: float
    is_congested: bool
    camera_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True
