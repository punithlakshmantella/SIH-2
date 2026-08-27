import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_permission, require_roles, record_audit_log
from app.models.models import User, AuditLog

router = APIRouter(prefix="/system-config", tags=["System Environment & Node Configuration"])

# Default System Configuration State
_DEFAULT_SYSTEM_CONFIG = {
    "system_environment": {
        "city": "Visakhapatnam",
        "city_display": "Visakhapatnam, Andhra Pradesh",
        "environment": "Production Simulation",
        "region": "Andhra Pradesh",
        "country": "India",
        "active_status": "ACTIVE",
        "engine_version": "v2.6.4-sih-build"
    },
    "gis_configuration": {
        "map_center_latitude": 17.6868,
        "map_center_longitude": 83.2185,
        "crs": "WGS 84 / EPSG:4326",
        "default_grid": "Adaptive 500m Hexagonal Grid",
        "default_zoom": 12,
        "coverage_area": "Visakhapatnam Metropolitan Region"
    },
    "anpr_ocr_pipeline": {
        "pipeline_name": "OpenCV preprocessing + License Plate Detection + OCR + Indian Registration Plate Parser",
        "stages": [
            {"step": 1, "name": "Image Preprocessing", "desc": "Bilinear resizing, grayscale extraction, bilateral filtering"},
            {"step": 2, "name": "CLAHE / Contrast Enhancement", "desc": "Contrast Limited Adaptive Histogram Equalization"},
            {"step": 3, "name": "License Plate Detection", "desc": "Contour morphology & aspect-ratio candidate filtering"},
            {"step": 4, "name": "OCR Recognition", "desc": "Tesseract / CRNN character stream extraction"},
            {"step": 5, "name": "Indian Registration Plate Parser", "desc": "State (AP/TS/KA) + RTO code + Serial + 4-digit numeric pattern"},
            {"step": 6, "name": "Format Validation", "desc": "HSRP syntax and regex conformity checking"},
            {"step": 7, "name": "OCR Confidence Validation", "desc": "Character-level probability scoring"},
            {"step": 8, "name": "Verified Plate Result", "desc": "Normalized alphanumeric plate string output"}
        ],
        "ocr_confidence_threshold": 85.0,
        "plate_validation_threshold": 90.0,
        "image_enhancement": "CLAHE",
        "plate_format": "Indian Registration Format (HSRP)"
    },
    "reid_engine": {
        "engine_mode": "Multi-Modal Spatio-Temporal Heuristics",
        "explanation": "Re-ID combines spatial-temporal continuity, velocity plausibility, and color/type features rather than relying solely on direct optical plate reads.",
        "input_signals": [
            "ANPR Plate Match",
            "Camera ID",
            "Timestamp",
            "Camera Coordinates",
            "Estimated Travel Time",
            "Vehicle Appearance Features",
            "Direction of Travel"
        ],
        "reid_confidence_threshold": 85.0,
        "max_plausible_travel_speed_kmh": 140.0,
        "trajectory_validation_enabled": True
    },
    "speed_validation": {
        "max_physical_speed_kmh": 140.0,
        "explanation": "Used to identify physically implausible camera-to-camera trajectories. This value is a system validation threshold and is not a legal road speed limit.",
        "granularity_support": ["City", "Zone", "Road", "Corridor", "Camera Pair"]
    },
    "camera_telemetry": {
        "min_stream_fps": 20,
        "max_network_latency_ms": 200,
        "max_packet_loss_pct": 5.0,
        "min_camera_uptime_pct": 95.0,
        "min_ocr_accuracy_pct": 85.0,
        "heartbeat_interval_seconds": 30,
        "status_indicators": ["Healthy", "Warning", "Critical", "Offline"]
    },
    "detection_alerts": {
        "watchlist_match_enabled": True,
        "overspeed_detection_enabled": True,
        "wrong_direction_detection_enabled": True,
        "suspicious_trajectory_detection_enabled": True,
        "impossible_travel_detection_enabled": True,
        "min_alert_confidence_pct": 85.0
    },
    "data_governance": {
        "audit_logging_enabled": True,
        "config_change_logging_enabled": True,
        "csv_export_logging_enabled": True,
        "sensitive_data_access_logging_enabled": True,
        "data_retention_days": 90,
        "timezone": "Asia/Kolkata (IST)",
        "timestamp_format": "ISO 8601"
    }
}

# Runtime singleton state
_CURRENT_SYSTEM_CONFIG = json.loads(json.dumps(_DEFAULT_SYSTEM_CONFIG))


class SystemConfigUpdateRequest(BaseModel):
    # GIS
    map_center_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    map_center_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    default_zoom: Optional[int] = Field(None, ge=5, le=19)
    default_grid: Optional[str] = None
    
    # ANPR & Re-ID
    ocr_confidence_threshold: Optional[float] = Field(None, ge=0.0, le=100.0)
    plate_validation_threshold: Optional[float] = Field(None, ge=0.0, le=100.0)
    reid_confidence_threshold: Optional[float] = Field(None, ge=0.0, le=100.0)
    trajectory_validation_enabled: Optional[bool] = None
    
    # Speed
    max_physical_speed_kmh: Optional[float] = Field(None, ge=20.0, le=300.0)
    
    # Camera Telemetry
    min_stream_fps: Optional[int] = Field(None, ge=1, le=120)
    max_network_latency_ms: Optional[int] = Field(None, ge=10, le=5000)
    max_packet_loss_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    min_camera_uptime_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    min_ocr_accuracy_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    heartbeat_interval_seconds: Optional[int] = Field(None, ge=5, le=600)
    
    # Alerts
    watchlist_match_enabled: Optional[bool] = None
    overspeed_detection_enabled: Optional[bool] = None
    wrong_direction_detection_enabled: Optional[bool] = None
    suspicious_trajectory_detection_enabled: Optional[bool] = None
    impossible_travel_detection_enabled: Optional[bool] = None
    min_alert_confidence_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    
    # Data Governance
    data_retention_days: Optional[int] = Field(None, ge=1, le=3650)
    reason: Optional[str] = None


@router.get("")
def get_system_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve full System Environment & Node Configuration parameters.
    Accessible to all authenticated municipal/police roles.
    """
    return {
        "last_synced_at": datetime.utcnow().isoformat(),
        "config": _CURRENT_SYSTEM_CONFIG
    }


@router.put("")
def update_system_configuration(
    body: SystemConfigUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    # Strict RBAC: System Administrator only
    current_user: User = Depends(require_roles(["System Administrator"]))
):
    """
    Update engine operational parameters with validation and immutable audit trail.
    RBAC-Gated: System Administrator only.
    """
    global _CURRENT_SYSTEM_CONFIG

    changes = {}

    # GIS updates
    if body.map_center_latitude is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["gis_configuration"]["map_center_latitude"]
        _CURRENT_SYSTEM_CONFIG["gis_configuration"]["map_center_latitude"] = body.map_center_latitude
        changes["map_center_latitude"] = {"old": old_v, "new": body.map_center_latitude}

    if body.map_center_longitude is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["gis_configuration"]["map_center_longitude"]
        _CURRENT_SYSTEM_CONFIG["gis_configuration"]["map_center_longitude"] = body.map_center_longitude
        changes["map_center_longitude"] = {"old": old_v, "new": body.map_center_longitude}

    if body.default_zoom is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["gis_configuration"]["default_zoom"]
        _CURRENT_SYSTEM_CONFIG["gis_configuration"]["default_zoom"] = body.default_zoom
        changes["default_zoom"] = {"old": old_v, "new": body.default_zoom}

    if body.default_grid is not None:
        _CURRENT_SYSTEM_CONFIG["gis_configuration"]["default_grid"] = body.default_grid
        changes["default_grid"] = body.default_grid

    # ANPR & Re-ID
    if body.ocr_confidence_threshold is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["anpr_ocr_pipeline"]["ocr_confidence_threshold"]
        _CURRENT_SYSTEM_CONFIG["anpr_ocr_pipeline"]["ocr_confidence_threshold"] = body.ocr_confidence_threshold
        changes["ocr_confidence_threshold"] = {"old": old_v, "new": body.ocr_confidence_threshold}

    if body.plate_validation_threshold is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["anpr_ocr_pipeline"]["plate_validation_threshold"]
        _CURRENT_SYSTEM_CONFIG["anpr_ocr_pipeline"]["plate_validation_threshold"] = body.plate_validation_threshold
        changes["plate_validation_threshold"] = {"old": old_v, "new": body.plate_validation_threshold}

    if body.reid_confidence_threshold is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["reid_engine"]["reid_confidence_threshold"]
        _CURRENT_SYSTEM_CONFIG["reid_engine"]["reid_confidence_threshold"] = body.reid_confidence_threshold
        changes["reid_confidence_threshold"] = {"old": old_v, "new": body.reid_confidence_threshold}

    if body.trajectory_validation_enabled is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["reid_engine"]["trajectory_validation_enabled"]
        _CURRENT_SYSTEM_CONFIG["reid_engine"]["trajectory_validation_enabled"] = body.trajectory_validation_enabled
        changes["trajectory_validation_enabled"] = {"old": old_v, "new": body.trajectory_validation_enabled}

    # Speed
    if body.max_physical_speed_kmh is not None:
        old_v = _CURRENT_SYSTEM_CONFIG["speed_validation"]["max_physical_speed_kmh"]
        _CURRENT_SYSTEM_CONFIG["speed_validation"]["max_physical_speed_kmh"] = body.max_physical_speed_kmh
        _CURRENT_SYSTEM_CONFIG["reid_engine"]["max_plausible_travel_speed_kmh"] = body.max_physical_speed_kmh
        changes["max_physical_speed_kmh"] = {"old": old_v, "new": body.max_physical_speed_kmh}

    # Camera Telemetry
    if body.min_stream_fps is not None:
        _CURRENT_SYSTEM_CONFIG["camera_telemetry"]["min_stream_fps"] = body.min_stream_fps
        changes["min_stream_fps"] = body.min_stream_fps

    if body.max_network_latency_ms is not None:
        _CURRENT_SYSTEM_CONFIG["camera_telemetry"]["max_network_latency_ms"] = body.max_network_latency_ms
        changes["max_network_latency_ms"] = body.max_network_latency_ms

    if body.max_packet_loss_pct is not None:
        _CURRENT_SYSTEM_CONFIG["camera_telemetry"]["max_packet_loss_pct"] = body.max_packet_loss_pct
        changes["max_packet_loss_pct"] = body.max_packet_loss_pct

    if body.min_camera_uptime_pct is not None:
        _CURRENT_SYSTEM_CONFIG["camera_telemetry"]["min_camera_uptime_pct"] = body.min_camera_uptime_pct
        changes["min_camera_uptime_pct"] = body.min_camera_uptime_pct

    if body.min_ocr_accuracy_pct is not None:
        _CURRENT_SYSTEM_CONFIG["camera_telemetry"]["min_ocr_accuracy_pct"] = body.min_ocr_accuracy_pct
        changes["min_ocr_accuracy_pct"] = body.min_ocr_accuracy_pct

    if body.heartbeat_interval_seconds is not None:
        _CURRENT_SYSTEM_CONFIG["camera_telemetry"]["heartbeat_interval_seconds"] = body.heartbeat_interval_seconds
        changes["heartbeat_interval_seconds"] = body.heartbeat_interval_seconds

    # Alerts
    if body.watchlist_match_enabled is not None:
        _CURRENT_SYSTEM_CONFIG["detection_alerts"]["watchlist_match_enabled"] = body.watchlist_match_enabled
        changes["watchlist_match_enabled"] = body.watchlist_match_enabled

    if body.overspeed_detection_enabled is not None:
        _CURRENT_SYSTEM_CONFIG["detection_alerts"]["overspeed_detection_enabled"] = body.overspeed_detection_enabled
        changes["overspeed_detection_enabled"] = body.overspeed_detection_enabled

    if body.wrong_direction_detection_enabled is not None:
        _CURRENT_SYSTEM_CONFIG["detection_alerts"]["wrong_direction_detection_enabled"] = body.wrong_direction_detection_enabled
        changes["wrong_direction_detection_enabled"] = body.wrong_direction_detection_enabled

    if body.suspicious_trajectory_detection_enabled is not None:
        _CURRENT_SYSTEM_CONFIG["detection_alerts"]["suspicious_trajectory_detection_enabled"] = body.suspicious_trajectory_detection_enabled
        changes["suspicious_trajectory_detection_enabled"] = body.suspicious_trajectory_detection_enabled

    if body.impossible_travel_detection_enabled is not None:
        _CURRENT_SYSTEM_CONFIG["detection_alerts"]["impossible_travel_detection_enabled"] = body.impossible_travel_detection_enabled
        changes["impossible_travel_detection_enabled"] = body.impossible_travel_detection_enabled

    if body.min_alert_confidence_pct is not None:
        _CURRENT_SYSTEM_CONFIG["detection_alerts"]["min_alert_confidence_pct"] = body.min_alert_confidence_pct
        changes["min_alert_confidence_pct"] = body.min_alert_confidence_pct

    # Data Governance
    if body.data_retention_days is not None:
        _CURRENT_SYSTEM_CONFIG["data_governance"]["data_retention_days"] = body.data_retention_days
        changes["data_retention_days"] = body.data_retention_days

    # Immutable Audit Log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CONFIG_UPDATED",
        target_entity="system_config",
        target_id="global",
        query_params={
            "changes": changes,
            "reason": body.reason or "Administrator parameter calibration"
        },
        ip_address=client_ip
    )

    return {
        "status": "success",
        "message": "System environment & node configuration successfully updated and audited",
        "updated_by": current_user.full_name,
        "updated_at": datetime.utcnow().isoformat(),
        "config": _CURRENT_SYSTEM_CONFIG
    }


@router.get("/audit-history")
def get_config_audit_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve audit history of system configuration modifications.
    """
    logs = db.query(AuditLog).filter(
        AuditLog.target_entity == "system_config"
    ).order_by(AuditLog.timestamp.desc()).limit(15).all()

    results = []
    for l in logs:
        u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        results.append({
            "id": l.id,
            "action": l.action,
            "user_name": u.full_name if u else "System Administrator",
            "role": u.role.name if u and u.role else "Administrator",
            "timestamp": l.timestamp.isoformat(),
            "details": l.query_params
        })
    return results
