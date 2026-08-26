from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user, rate_limiter, record_audit_log
from app.models.models import (
    Vehicle, VehicleDetection, TrajectoryEvent, Camera, Zone, Road, Alert, User
)
from app.schemas.vehicle import VehicleOut, VehicleSummary
from app.schemas.trajectory import TrajectoryResponse, TrajectoryPointOut

router = APIRouter(prefix="/vehicles", tags=["Vehicles & Trajectory Reconstruction"])

def compute_vehicle_summary(vehicle: Vehicle, db: Session) -> VehicleSummary:
    """
    Computes comprehensive live vehicle summary from relational tables.
    """
    # 1. Total detections & unique cameras visited
    detections = db.query(VehicleDetection).filter(
        VehicleDetection.vehicle_id == vehicle.id
    ).all()
    
    total_dets = len(detections)
    unique_cams = len(set(d.camera_id for d in detections))

    # 2. Trajectory statistics (total distance & avg speed)
    traj_events = db.query(TrajectoryEvent).filter(
        TrajectoryEvent.vehicle_id == vehicle.id
    ).order_by(TrajectoryEvent.timestamp.asc()).all()

    total_dist = sum(t.distance_from_prev_km for t in traj_events)
    speeds = [t.speed_kmh for t in traj_events if t.speed_kmh > 0]
    avg_spd = round(sum(speeds) / len(speeds), 1) if speeds else 0.0

    # 3. Active / historical alerts count
    alert_count = db.query(Alert).filter(Alert.vehicle_id == vehicle.id).count()

    # 4. Last camera & zone details
    last_cam = db.query(Camera).filter(Camera.id == vehicle.last_camera_id).first() if vehicle.last_camera_id else None
    last_cam_name = last_cam.name if last_cam else None
    last_zone_name = last_cam.zone.name if last_cam and last_cam.zone else None

    return VehicleSummary(
        id=vehicle.id,
        primary_plate=vehicle.primary_plate,
        vehicle_type=vehicle.vehicle_type,
        make=vehicle.make,
        model=vehicle.model,
        color=vehicle.color,
        first_seen_at=vehicle.first_seen_at,
        last_seen_at=vehicle.last_seen_at,
        last_camera_id=vehicle.last_camera_id,
        last_camera_name=last_cam_name,
        last_zone_name=last_zone_name,
        total_detections=total_dets,
        cameras_visited_count=unique_cams,
        total_distance_km=round(total_dist, 2),
        avg_speed_kmh=avg_spd,
        alert_count=alert_count,
        is_flagged=vehicle.is_flagged
    )

@router.get("/search", response_model=List[VehicleSummary], dependencies=[Depends(rate_limiter(max_requests=30, window_seconds=60))])
def search_vehicles(
    request: Request,
    plate: Optional[str] = Query(None, description="Full or partial plate text (e.g. AP39, AP39AB1234)"),
    vehicle_type: Optional[str] = Query(None, description="car, motorcycle, truck, bus, auto_rickshaw"),
    color: Optional[str] = Query(None, description="Vehicle color"),
    camera_id: Optional[str] = Query(None, description="Camera ID"),
    zone_id: Optional[int] = Query(None, description="Zone ID"),
    direction: Optional[str] = Query(None, description="Movement direction (NB, SB, EB, WB)"),
    start_time: Optional[datetime] = Query(None, description="Start timestamp"),
    end_time: Optional[datetime] = Query(None, description="End timestamp"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search vehicles across the city with multi-criteria filters.
    Automatically logs search query to immutable audit log.
    """
    query = db.query(Vehicle)

    # 1. Plate match (case-insensitive partial / full)
    if plate:
        clean_plate = plate.strip().upper().replace(" ", "")
        query = query.filter(
            or_(
                Vehicle.primary_plate.ilike(f"%{clean_plate}%"),
                Vehicle.detections.any(VehicleDetection.raw_plate_text.ilike(f"%{clean_plate}%"))
            )
        )

    # 2. Type & Color
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type.lower())
    if color:
        query = query.filter(Vehicle.color.ilike(f"%{color.strip()}%"))

    # 3. Detection-level filters (camera, zone, direction, time range)
    detection_filters = []
    if camera_id:
        detection_filters.append(VehicleDetection.camera_id == camera_id)
    if direction:
        detection_filters.append(VehicleDetection.direction == direction.upper())
    if start_time:
        detection_filters.append(VehicleDetection.timestamp >= start_time)
    if end_time:
        detection_filters.append(VehicleDetection.timestamp <= end_time)
    if zone_id:
        detection_filters.append(VehicleDetection.camera.has(Camera.zone_id == zone_id))

    if detection_filters:
        query = query.filter(Vehicle.detections.any(*detection_filters))

    vehicles = query.order_by(Vehicle.last_seen_at.desc()).offset(offset).limit(limit).all()

    # Log search audit event
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="search_plate" if plate else "search_vehicle",
        target_entity="vehicle",
        query_params={
            "plate": plate,
            "vehicle_type": vehicle_type,
            "color": color,
            "camera_id": camera_id,
            "zone_id": zone_id,
            "results_count": len(vehicles)
        },
        ip_address=client_ip
    )

    summaries = [compute_vehicle_summary(v, db) for v in vehicles]
    return summaries

@router.get("/{vehicle_id_or_plate}", response_model=VehicleSummary)
def get_vehicle_profile(
    vehicle_id_or_plate: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive vehicle profile by vehicle ID or primary plate number.
    Logs profile view to audit trail.
    """
    clean_target = vehicle_id_or_plate.strip().upper()
    
    # Try ID first, then plate
    vehicle = None
    if vehicle_id_or_plate.isdigit():
        vehicle = db.query(Vehicle).filter(Vehicle.id == int(vehicle_id_or_plate)).first()
    
    if not vehicle:
        vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == clean_target).first()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{vehicle_id_or_plate}' not found in database"
        )

    # Log profile view
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="view_vehicle",
        target_entity="vehicle",
        target_id=str(vehicle.id),
        query_params={"plate": vehicle.primary_plate},
        ip_address=client_ip
    )

    return compute_vehicle_summary(vehicle, db)

@router.get("/{vehicle_id_or_plate}/detections", response_model=List[dict])
def get_vehicle_detections(
    vehicle_id_or_plate: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full chronological detection timeline for a vehicle including camera names and alerts.
    """
    clean_target = vehicle_id_or_plate.strip().upper()
    vehicle = None
    if vehicle_id_or_plate.isdigit():
        vehicle = db.query(Vehicle).filter(Vehicle.id == int(vehicle_id_or_plate)).first()
    if not vehicle:
        vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == clean_target).first()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{vehicle_id_or_plate}' not found"
        )

    detections = db.query(VehicleDetection).filter(
        VehicleDetection.vehicle_id == vehicle.id
    ).order_by(VehicleDetection.timestamp.asc()).all()

    results = []
    for d in detections:
        cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
        alert = db.query(Alert).filter(Alert.detection_id == d.id).first()
        results.append({
            "id": d.id,
            "camera_id": d.camera_id,
            "camera_name": cam.name if cam else d.camera_id,
            "zone_name": cam.zone.name if (cam and cam.zone) else "Visakhapatnam",
            "road_name": cam.road.name if (cam and cam.road) else None,
            "raw_plate_text": d.raw_plate_text,
            "normalized_plate_text": d.normalized_plate_text,
            "ocr_confidence": d.ocr_confidence,
            "vehicle_type": d.vehicle_type,
            "vehicle_color": d.vehicle_color,
            "speed_kmh": d.speed_kmh,
            "direction": d.direction,
            "timestamp": d.timestamp.isoformat(),
            "image_url": d.image_url,
            "is_simulated": d.is_simulated,
            "is_low_confidence": d.is_low_confidence,
            "alert": {
                "id": alert.id,
                "title": alert.title,
                "alert_type": alert.alert_type,
                "severity": alert.severity
            } if alert else None
        })

    return results

from app.engines.trajectory import trajectory_engine
from app.engines.reid import reid_engine

@router.get("/{vehicle_id_or_plate}/trajectory", response_model=TrajectoryResponse)
def get_vehicle_trajectory(
    vehicle_id_or_plate: str,
    request: Request,
    include_reid_candidates: bool = Query(True, description="Resolve ambiguous/degraded detections via Re-ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reconstruct vehicle trajectory across the city camera network.
    Applies the full trajectory reconstruction algorithm:
    - Sorts chronological detections
    - Resolves ambiguous/degraded reads via VehicleReIDEngine
    - Computes implied speed (distance / time) per camera-to-camera leg
    - Evaluates transitions against road limits, flagging physically impossible transitions
    """
    clean_target = vehicle_id_or_plate.strip().upper()
    vehicle = None
    if vehicle_id_or_plate.isdigit():
        vehicle = db.query(Vehicle).filter(Vehicle.id == int(vehicle_id_or_plate)).first()
    if not vehicle:
        vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == clean_target).first()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{vehicle_id_or_plate}' not found in database"
        )

    # Log trajectory audit event
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="view_trajectory",
        target_entity="vehicle",
        target_id=str(vehicle.id),
        query_params={"plate": vehicle.primary_plate, "include_reid": include_reid_candidates},
        ip_address=client_ip
    )

    # 1. Fetch direct detections
    direct_detections = db.query(VehicleDetection).filter(
        VehicleDetection.vehicle_id == vehicle.id
    ).all()

    # 2. If Re-ID is enabled, also search for degraded/wildcard detections in matching timeframe
    raw_hits = []
    seen_det_ids = set()

    for d in direct_detections:
        cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
        if cam:
            seen_det_ids.add(d.id)
            raw_hits.append({
                "detection_id": d.id,
                "camera_id": d.camera_id,
                "camera_name": cam.name,
                "zone_name": cam.zone.name if cam.zone else "Visakhapatnam",
                "road_name": cam.road.name if cam.road else None,
                "latitude": cam.latitude,
                "longitude": cam.longitude,
                "timestamp": d.timestamp,
                "speed_kmh": d.speed_kmh,
                "direction": d.direction,
                "raw_plate_text": d.raw_plate_text,
                "ocr_confidence": d.ocr_confidence,
                "is_low_confidence": d.is_low_confidence,
                "anomaly_flags": {}
            })

    # Search for potential ambiguous detections in DB with wildcards (e.g. AP39A?1234)
    if include_reid_candidates:
        prefix_part = vehicle.primary_plate[:4]  # e.g., 'AP39'
        candidate_dets = db.query(VehicleDetection).filter(
            VehicleDetection.raw_plate_text.like(f"{prefix_part}%"),
            VehicleDetection.is_low_confidence == True,
            ~VehicleDetection.id.in_(seen_det_ids) if seen_det_ids else True
        ).all()

        for c_det in candidate_dets:
            cam = db.query(Camera).filter(Camera.id == c_det.camera_id).first()
            if not cam:
                continue

            # Run through ReID Engine match
            match_res = reid_engine.match(
                detection={
                    "raw_plate_text": c_det.raw_plate_text,
                    "vehicle_type": c_det.vehicle_type,
                    "vehicle_color": c_det.vehicle_color,
                    "latitude": cam.latitude,
                    "longitude": cam.longitude,
                    "timestamp": c_det.timestamp
                },
                candidates=[{
                    "id": vehicle.id,
                    "primary_plate": vehicle.primary_plate,
                    "vehicle_type": vehicle.vehicle_type,
                    "vehicle_color": vehicle.color,
                    "last_detection": {
                        "latitude": raw_hits[-1]["latitude"] if raw_hits else cam.latitude,
                        "longitude": raw_hits[-1]["longitude"] if raw_hits else cam.longitude,
                        "timestamp": raw_hits[-1]["timestamp"] if raw_hits else c_det.timestamp
                    }
                }]
            )

            if match_res and match_res[0].is_probable_match:
                top_match = match_res[0]
                raw_hits.append({
                    "detection_id": c_det.id,
                    "camera_id": c_det.camera_id,
                    "camera_name": cam.name,
                    "zone_name": cam.zone.name if cam.zone else "Visakhapatnam",
                    "road_name": cam.road.name if cam.road else None,
                    "latitude": cam.latitude,
                    "longitude": cam.longitude,
                    "timestamp": c_det.timestamp,
                    "speed_kmh": c_det.speed_kmh,
                    "direction": c_det.direction,
                    "raw_plate_text": c_det.raw_plate_text,
                    "ocr_confidence": c_det.ocr_confidence,
                    "is_low_confidence": True,
                    "anomaly_flags": {
                        "reid_probabilistic_match": top_match.probabilistic_label,
                        "match_score": top_match.match_score
                    }
                })

    # Run the full Trajectory Reconstruction Engine
    reconstruction = trajectory_engine.reconstruct(
        vehicle_id=vehicle.id,
        primary_plate=vehicle.primary_plate,
        vehicle_type=vehicle.vehicle_type,
        vehicle_color=vehicle.color,
        raw_detections=raw_hits
    )

    return reconstruction
