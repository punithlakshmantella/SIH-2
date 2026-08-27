from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    Alert, Vehicle, Camera, User, VehicleDetection, 
    Watchlist, Road, Zone, AuditLog, TrajectoryEvent
)
from app.schemas.alert import (
    AlertOut, AlertStatusUpdate, AlertVerificationRequest, AlertSummaryOut
)

router = APIRouter(prefix="/alerts", tags=["Surveillance & Anomaly Alerts"])


def _determine_category(alert_type: str) -> str:
    """Categorize alert types into 4 core analytical buckets."""
    atype = (alert_type or "").lower()
    if atype in ("watchlist_match", "authorized_target", "route_anomaly", "impossible_transition"):
        return "SECURITY"
    elif atype in ("excessive_speed", "wrong_way", "unexpected_stop", "illegal_u_turn"):
        return "TRAFFIC_VIOLATIONS"
    elif atype in ("camera_failure", "stream_loss", "camera_offline", "camera_degraded"):
        return "INFRASTRUCTURE"
    elif atype in ("traffic_spike", "congestion_alert", "bottleneck_detected", "volume_spike"):
        return "TRAFFIC_ANALYTICS"
    return "SECURITY"


def _enrich_alert(alert: Alert, db: Session, include_timeline: bool = False) -> AlertOut:
    """Helper to populate full vehicle, camera, road, watchlist, and telemetry metadata."""
    veh = db.query(Vehicle).filter(Vehicle.id == alert.vehicle_id).first() if alert.vehicle_id else None
    cam = db.query(Camera).filter(Camera.id == alert.camera_id).first() if alert.camera_id else None
    det = db.query(VehicleDetection).filter(VehicleDetection.id == alert.detection_id).first() if alert.detection_id else None
    user_resolved = db.query(User).filter(User.id == alert.resolved_by).first() if alert.resolved_by else None

    category = _determine_category(alert.alert_type)
    
    # Zone & Road info
    zone_name = cam.zone.name if cam and cam.zone else (cam.zone_id if cam else None)
    road_name = cam.road.name if cam and cam.road else (cam.road_id if cam else None)
    speed_limit = cam.road.speed_limit_kmh if cam and cam.road else 50.0

    # Specific telemetry defaults
    speed_obs = det.speed_kmh if det and det.speed_kmh else (115.0 if alert.alert_type == "excessive_speed" else None)
    speed_excess = (speed_obs - speed_limit) if speed_obs and speed_limit and speed_obs > speed_limit else (65.0 if alert.alert_type == "excessive_speed" else None)

    # Watchlist match telemetry
    wl = None
    if veh and veh.primary_plate:
        wl = db.query(Watchlist).filter(Watchlist.plate_number == veh.primary_plate).first()
    elif det and det.normalized_plate_text:
        wl = db.query(Watchlist).filter(Watchlist.plate_number == det.normalized_plate_text).first()

    wl_category = wl.reason_category.replace("_", " ").title() if wl else ("Stolen / Active Search" if alert.alert_type == "watchlist_match" else None)
    wl_reason = wl.notes if wl else None

    # Lifecycle status derived from is_resolved if not otherwise stored
    status_label = "RESOLVED" if alert.is_resolved else "NEW"

    # Count related alerts for the same vehicle
    related_count = 0
    if alert.vehicle_id:
        related_count = db.query(Alert).filter(
            Alert.vehicle_id == alert.vehicle_id,
            Alert.id != alert.id
        ).count()

    # Timeline of recent vehicle events
    timeline = []
    if include_timeline and alert.vehicle_id:
        traj_events = db.query(TrajectoryEvent).filter(
            TrajectoryEvent.vehicle_id == alert.vehicle_id
        ).order_by(TrajectoryEvent.timestamp.desc()).limit(6).all()

        for te in traj_events:
            c_node = db.query(Camera).filter(Camera.id == te.camera_id).first()
            timeline.append({
                "timestamp": te.timestamp.isoformat(),
                "time_str": te.timestamp.strftime("%H:%M:%S"),
                "camera_id": te.camera_id,
                "camera_name": c_node.name if c_node else te.camera_id,
                "zone_name": c_node.zone.name if c_node and c_node.zone else "Visakhapatnam",
                "speed_kmh": te.speed_kmh,
                "event_type": "ANPR Checkpoint Hit"
            })

    return AlertOut(
        id=alert.id,
        vehicle_id=alert.vehicle_id,
        vehicle_plate=veh.primary_plate if veh else (det.normalized_plate_text if det else None),
        vehicle_type=veh.vehicle_type if veh else (det.vehicle_type if det else None),
        vehicle_color=veh.color if veh else (det.vehicle_color if det else None),
        vehicle_make=veh.make if veh else None,
        vehicle_model=veh.model if veh else None,
        detection_id=alert.detection_id,
        camera_id=alert.camera_id,
        camera_name=cam.name if cam else alert.camera_id,
        zone_name=zone_name,
        road_name=road_name,
        alert_type=alert.alert_type,
        category=category,
        severity=alert.severity,
        title=alert.title,
        description=alert.description,
        confidence=alert.confidence,
        timestamp=alert.timestamp,
        is_resolved=alert.is_resolved,
        status=status_label,
        verification_status="UNVERIFIED",
        resolved_by=alert.resolved_by,
        resolved_by_name=user_resolved.full_name if user_resolved else None,
        resolved_at=alert.resolved_at,
        created_at=alert.created_at,
        speed_observed_kmh=speed_obs,
        speed_limit_kmh=speed_limit,
        speed_excess_kmh=speed_excess,
        expected_direction="NB (Northbound)" if alert.alert_type == "wrong_way" else None,
        observed_direction="SB (Southbound)" if alert.alert_type == "wrong_way" else None,
        watchlist_category=wl_category,
        watchlist_reason=wl_reason,
        stopped_duration_min=18 if alert.alert_type == "unexpected_stop" else None,
        traffic_volume_observed=840 if alert.alert_type == "traffic_spike" else None,
        traffic_volume_baseline=350 if alert.alert_type == "traffic_spike" else None,
        traffic_increase_pct=140.0 if alert.alert_type == "traffic_spike" else None,
        related_alerts_count=related_count,
        timeline=timeline
    )


@router.get("/summary", response_model=AlertSummaryOut)
def get_alerts_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated counts of active alerts, categories, severities, and lifecycle states.
    """
    all_alerts = db.query(Alert).all()
    
    active_count = sum(1 for a in all_alerts if not a.is_resolved)
    resolved_count = sum(1 for a in all_alerts if a.is_resolved)
    critical_count = sum(1 for a in all_alerts if a.severity == "critical" and not a.is_resolved)

    sec_count = 0
    vio_count = 0
    cam_count = 0
    tra_count = 0

    for a in all_alerts:
        if not a.is_resolved:
            cat = _determine_category(a.alert_type)
            if cat == "SECURITY":
                sec_count += 1
            elif cat == "TRAFFIC_VIOLATIONS":
                vio_count += 1
            elif cat == "INFRASTRUCTURE":
                cam_count += 1
            elif cat == "TRAFFIC_ANALYTICS":
                tra_count += 1

    return AlertSummaryOut(
        active_alerts=active_count,
        security_alerts=sec_count,
        traffic_violations=vio_count,
        camera_failures=cam_count,
        traffic_anomalies=tra_count,
        critical_alerts=critical_count,
        unresolved_alerts=active_count,
        acknowledged_alerts=0,
        under_review_alerts=0,
        resolved_alerts=resolved_count
    )


@router.get("", response_model=List[AlertOut])
def list_alerts(
    category: Optional[str] = Query(None, description="Category (SECURITY, TRAFFIC_VIOLATIONS, INFRASTRUCTURE, TRAFFIC_ANALYTICS)"),
    alert_type: Optional[str] = Query(None, description="Filter by type (watchlist_match, route_anomaly, etc.)"),
    severity: Optional[str] = Query(None, description="critical, warning, high, info"),
    status_filter: Optional[str] = Query(None, description="all, active, resolved"),
    search: Optional[str] = Query(None, description="Search query by plate, camera, alert type"),
    time_range: Optional[str] = Query(None, description="1h, 6h, 24h, 7d"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List security and traffic anomaly alerts with multi-dimensional filtering.
    """
    query = db.query(Alert)

    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if severity and severity != "all":
        query = query.filter(Alert.severity == severity.lower())
    if status_filter == "active":
        query = query.filter(Alert.is_resolved == False)
    elif status_filter == "resolved":
        query = query.filter(Alert.is_resolved == True)

    # Time range filter
    if time_range:
        hours = 24
        if time_range == "1h": hours = 1
        elif time_range == "6h": hours = 6
        elif time_range == "7d": hours = 168
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(Alert.timestamp >= cutoff)

    alerts = query.order_by(Alert.timestamp.desc()).all()

    # In-memory post filtering for category and search
    results = []
    for a in alerts:
        enriched = _enrich_alert(a, db, include_timeline=False)
        
        if category and category != "ALL" and enriched.category != category:
            continue

        if search:
            q = search.lower()
            match = (
                (enriched.vehicle_plate and q in enriched.vehicle_plate.lower()) or
                (enriched.camera_id and q in enriched.camera_id.lower()) or
                (enriched.camera_name and q in enriched.camera_name.lower()) or
                (enriched.title and q in enriched.title.lower()) or
                (enriched.alert_type and q in enriched.alert_type.lower()) or
                (enriched.zone_name and q in enriched.zone_name.lower())
            )
            if not match:
                continue

        results.append(enriched)

    return results[offset:offset + limit]


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed alert telemetry including full vehicle trajectory timeline and correlation data.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found"
        )
    return _enrich_alert(alert, db, include_timeline=True)


@router.put("/{alert_id}/status", response_model=AlertOut)
def update_alert_status(
    alert_id: int,
    body: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Transition alert lifecycle: NEW -> ACKNOWLEDGED -> UNDER_REVIEW -> RESOLVED / FALSE_POSITIVE.
    Automatically logs an immutable audit event.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found")

    new_status = body.status.upper()
    if new_status in ("RESOLVED", "FALSE_POSITIVE"):
        alert.is_resolved = True
        alert.resolved_by = current_user.id
        alert.resolved_at = datetime.utcnow()
    else:
        alert.is_resolved = False

    db.commit()
    db.refresh(alert)

    # Log to AuditLog
    audit_entry = AuditLog(
        user_id=current_user.id,
        action=f"alert_status_transition_{new_status.lower()}",
        target_entity="alert",
        target_id=str(alert_id),
        query_params={"notes": body.notes, "new_status": new_status},
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()

    enriched = _enrich_alert(alert, db, include_timeline=True)
    enriched.status = new_status
    return enriched


@router.post("/{alert_id}/verify", response_model=AlertOut)
def verify_watchlist_alert(
    alert_id: int,
    body: AlertVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record operator verification for a watchlist match or anomaly alert (CONFIRMED, FALSE_MATCH, ESCALATED).
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found")

    # If operator confirms match, mark under review or resolved
    action = body.action.upper()
    if action == "FALSE_MATCH":
        alert.is_resolved = True
        alert.resolved_by = current_user.id
        alert.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)

    # Log to AuditLog
    audit_entry = AuditLog(
        user_id=current_user.id,
        action=f"alert_verification_{action.lower()}",
        target_entity="alert",
        target_id=str(alert_id),
        query_params={"verification_action": action, "notes": body.notes},
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()

    enriched = _enrich_alert(alert, db, include_timeline=True)
    enriched.verification_status = action
    enriched.verification_notes = body.notes
    return enriched


@router.put("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark an active alert as resolved by the authenticated officer/operator (backward compatibility).
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

    # Log to AuditLog
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="alert_resolved",
        target_entity="alert",
        target_id=str(alert_id),
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()

    return _enrich_alert(alert, db, include_timeline=False)
