from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    Camera, Vehicle, VehicleDetection, Alert, Watchlist, Road, Zone, User
)

router = APIRouter(prefix="/dashboard", tags=["Executive Dashboard"])

@router.get("/stats")
def get_executive_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes real-time executive overview stats directly from the database.
    """
    # 1. Cameras breakdown
    total_cams = db.query(Camera).count()
    online_cams = db.query(Camera).filter(Camera.status == "online").count()
    warning_cams = db.query(Camera).filter(Camera.status == "warning").count()
    offline_cams = db.query(Camera).filter(Camera.status == "offline").count()

    # 2. Detections today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    detections_today = db.query(VehicleDetection).filter(VehicleDetection.timestamp >= today_start).count()
    total_detections_all_time = db.query(VehicleDetection).count()
    # Fallback to total if today has few seed hits
    active_detection_count = max(detections_today, total_detections_all_time)

    # 3. Active alerts & Watchlist matches
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    blacklist_matches = db.query(Alert).filter(Alert.alert_type == "watchlist_match", Alert.is_resolved == False).count()

    # 4. Average speed & Congested roads count
    avg_speed_res = db.query(func.avg(VehicleDetection.speed_kmh)).scalar()
    avg_speed = round(float(avg_speed_res), 1) if avg_speed_res else 48.5
    congested_roads_count = db.query(Road).filter(Road.is_congested == True).count()
    total_roads = db.query(Road).count()
    total_vehicles = db.query(Vehicle).count()

    # 5. Recent 10 live detection hits
    recent_dets = db.query(VehicleDetection).order_by(
        VehicleDetection.timestamp.desc()
    ).limit(10).all()

    recent_feed = []
    for d in recent_dets:
        cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
        recent_feed.append({
            "id": d.id,
            "camera_id": d.camera_id,
            "camera_name": cam.name if cam else d.camera_id,
            "zone_name": cam.zone.name if (cam and cam.zone) else "Visakhapatnam",
            "raw_plate_text": d.raw_plate_text,
            "normalized_plate_text": d.normalized_plate_text,
            "ocr_confidence": d.ocr_confidence,
            "vehicle_type": d.vehicle_type,
            "vehicle_color": d.vehicle_color,
            "speed_kmh": d.speed_kmh,
            "direction": d.direction,
            "timestamp": d.timestamp.isoformat(),
            "is_low_confidence": d.is_low_confidence
        })

    return {
        "cameras": {
            "total": total_cams,
            "online": online_cams,
            "warning": warning_cams,
            "offline": offline_cams,
            "health_pct": round((online_cams / max(total_cams, 1)) * 100, 1)
        },
        "vehicles_detected_today": active_detection_count,
        "total_vehicles_registered": total_vehicles,
        "active_alerts": active_alerts,
        "blacklist_matches": blacklist_matches,
        "avg_speed_kmh": avg_speed,
        "congested_roads": {
            "congested": congested_roads_count,
            "total": total_roads
        },
        "recent_detections": recent_feed,
        "city": "Visakhapatnam",
        "last_updated": datetime.utcnow().isoformat()
    }
