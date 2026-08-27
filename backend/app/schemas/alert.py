from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class AlertOut(BaseModel):
    id: int
    vehicle_id: Optional[int] = None
    vehicle_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    detection_id: Optional[int] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    zone_name: Optional[str] = None
    road_name: Optional[str] = None
    alert_type: str
    category: str  # SECURITY, TRAFFIC_VIOLATIONS, INFRASTRUCTURE, TRAFFIC_ANALYTICS
    severity: str  # critical, high, warning, info
    title: str
    description: Optional[str] = None
    confidence: float
    timestamp: datetime
    is_resolved: bool
    status: str  # NEW, ACKNOWLEDGED, UNDER_REVIEW, RESOLVED, FALSE_POSITIVE
    verification_status: Optional[str] = "UNVERIFIED"  # UNVERIFIED, CONFIRMED, FALSE_MATCH, ESCALATED
    verification_notes: Optional[str] = None
    resolved_by: Optional[int] = None
    resolved_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    
    # Specific alert telemetries
    speed_observed_kmh: Optional[float] = None
    speed_limit_kmh: Optional[float] = None
    speed_excess_kmh: Optional[float] = None
    expected_direction: Optional[str] = None
    observed_direction: Optional[str] = None
    watchlist_category: Optional[str] = None
    watchlist_reason: Optional[str] = None
    stopped_duration_min: Optional[int] = None
    traffic_volume_observed: Optional[int] = None
    traffic_volume_baseline: Optional[int] = None
    traffic_increase_pct: Optional[float] = None
    
    # Related context
    related_alerts_count: int = 0
    timeline: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str  # NEW, ACKNOWLEDGED, UNDER_REVIEW, RESOLVED, FALSE_POSITIVE
    notes: Optional[str] = None

class AlertVerificationRequest(BaseModel):
    action: str  # CONFIRMED, FALSE_MATCH, ESCALATED
    notes: Optional[str] = None

class AlertSummaryOut(BaseModel):
    active_alerts: int
    security_alerts: int
    traffic_violations: int
    camera_failures: int
    traffic_anomalies: int
    critical_alerts: int
    unresolved_alerts: int
    acknowledged_alerts: int
    under_review_alerts: int
    resolved_alerts: int
