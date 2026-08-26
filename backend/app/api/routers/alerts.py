from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import Alert, Vehicle, Camera, User
from app.schemas.alert import AlertOut, AlertUpdate

router = APIRouter(prefix="/alerts", tags=["Surveillance & Anomaly Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    alert_type: Optional[str] = Query(None, description="Filter by type (watchlist_match, route_anomaly, etc.)"),
    severity: Optional[str] = Query(None, description="info, warning, critical"),
    is_resolved: Optional[bool] = Query(None, description="Filter resolved/active alerts"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List security and traffic anomaly alerts.
    """
    query = db.query(Alert)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if severity:
        query = query.filter(Alert.severity == severity.lower())
    if is_resolved is not None:
        query = query.filter(Alert.is_resolved == is_resolved)

    alerts = query.order_by(Alert.timestamp.desc()).offset(offset).limit(limit).all()

    results = []
    for a in alerts:
        veh = db.query(Vehicle).filter(Vehicle.id == a.vehicle_id).first() if a.vehicle_id else None
        cam = db.query(Camera).filter(Camera.id == a.camera_id).first() if a.camera_id else None
        results.append(AlertOut(
            id=a.id,
            vehicle_id=a.vehicle_id,
            vehicle_plate=veh.primary_plate if veh else None,
            detection_id=a.detection_id,
            camera_id=a.camera_id,
            camera_name=cam.name if cam else a.camera_id,
            alert_type=a.alert_type,
            severity=a.severity,
            title=a.title,
            description=a.description,
            confidence=a.confidence,
            timestamp=a.timestamp,
            is_resolved=a.is_resolved,
            resolved_by=a.resolved_by,
            resolved_at=a.resolved_at,
            created_at=a.created_at
        ))
    return results

@router.put("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark an active alert as resolved by the authenticated officer/operator.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found"
        )
    alert.is_resolved = True
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    veh = db.query(Vehicle).filter(Vehicle.id == alert.vehicle_id).first() if alert.vehicle_id else None
    cam = db.query(Camera).filter(Camera.id == alert.camera_id).first() if alert.camera_id else None
    return AlertOut(
        id=alert.id,
        vehicle_id=alert.vehicle_id,
        vehicle_plate=veh.primary_plate if veh else None,
        detection_id=alert.detection_id,
        camera_id=alert.camera_id,
        camera_name=cam.name if cam else alert.camera_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        description=alert.description,
        confidence=alert.confidence,
        timestamp=alert.timestamp,
        is_resolved=alert.is_resolved,
        resolved_by=alert.resolved_by,
        resolved_at=alert.resolved_at,
        created_at=alert.created_at
    )
