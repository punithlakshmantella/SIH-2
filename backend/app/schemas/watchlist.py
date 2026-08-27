from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class WatchlistCreate(BaseModel):
    plate_number: str
    reason_category: str  # stolen, active_investigation, authorized_watchlist, traffic_violator, missing_recovered, other
    priority: str = "high"  # urgent, high, medium, low
    case_reference: Optional[str] = None
    notes: Optional[str] = None
    effective_from: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    auto_verify: bool = False

class WatchlistUpdate(BaseModel):
    reason_category: Optional[str] = None
    priority: Optional[str] = None
    case_reference: Optional[str] = None
    notes: Optional[str] = None
    expiry_date: Optional[datetime] = None

class WatchlistVerificationRequest(BaseModel):
    action: str  # VERIFIED, REJECTED
    notes: Optional[str] = None

class WatchlistStatusUpdate(BaseModel):
    status: str  # ACTIVE, SUSPENDED, EXPIRED, RESOLVED, REJECTED
    resolution_notes: Optional[str] = None

class WatchlistOut(BaseModel):
    id: int
    plate_number: str
    reason_category: str
    priority: str
    case_reference: Optional[str] = None
    notes: Optional[str] = None
    status: str  # active, pending_verification, suspended, expired, resolved, rejected
    verification_status: str  # pending, verified, rejected
    verified_by: Optional[int] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    effective_from: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    is_active: bool
    is_demo: bool = False
    is_expiring_soon: bool = False
    days_until_expiry: Optional[int] = None
    detection_count: int = 0
    last_seen_at: Optional[datetime] = None
    last_camera_id: Optional[str] = None
    last_camera_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WatchlistSummaryOut(BaseModel):
    total_entries: int
    active_count: int
    pending_verification_count: int
    expired_count: int
    suspended_count: int
    urgent_count: int
    linked_investigations_count: int
    expiring_soon_count: int
