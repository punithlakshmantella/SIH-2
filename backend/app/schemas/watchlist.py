from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WatchlistCreate(BaseModel):
    plate_number: str
    reason_category: str  # stolen, active_investigation, authorized_watchlist, traffic_violator, other
    priority: str = "high"  # low, medium, high, urgent
    notes: Optional[str] = None

class WatchlistOut(BaseModel):
    id: int
    plate_number: str
    reason_category: str
    priority: str
    notes: Optional[str] = None
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
