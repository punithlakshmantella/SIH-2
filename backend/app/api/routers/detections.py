from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import VehicleDetection, Camera, Vehicle, User
from app.schemas.detection import DetectionOut, DetectionCreate

router = APIRouter(prefix="/detections", tags=["Vehicle Detections Feed"])

@router.get("", response_model=List[DetectionOut])
def list_detections(
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle ID"),
    plate: Optional[str] = Query(None, description="Filter by plate number"),
    is_low_confidence: Optional[bool] = Query(None, description="Filter low confidence reads"),
    start_time: Optional[datetime] = Query(None, description="Start timestamp"),
    end_time: Optional[datetime] = Query(None, description="End timestamp"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List chronological vehicle detections feed with camera and OCR details.
    """
    query = db.query(VehicleDetection)

    if camera_id:
        query = query.filter(VehicleDetection.camera_id == camera_id)
    if vehicle_id:
        query = query.filter(VehicleDetection.vehicle_id == vehicle_id)
    if plate:
        query = query.filter(VehicleDetection.normalized_plate_text.ilike(f"%{plate.strip().upper()}%"))
    if is_low_confidence is not None:
        query = query.filter(VehicleDetection.is_low_confidence == is_low_confidence)
    if start_time:
        query = query.filter(VehicleDetection.timestamp >= start_time)
    if end_time:
        query = query.filter(VehicleDetection.timestamp <= end_time)

    detections = query.order_by(VehicleDetection.timestamp.desc()).offset(offset).limit(limit).all()

    results = []
    for d in detections:
        cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
        results.append(DetectionOut(
            id=d.id,
            camera_id=d.camera_id,
            camera_name=cam.name if cam else d.camera_id,
            zone_name=cam.zone.name if (cam and cam.zone) else None,
            vehicle_id=d.vehicle_id,
            raw_plate_text=d.raw_plate_text,
            normalized_plate_text=d.normalized_plate_text,
            ocr_confidence=d.ocr_confidence,
            vehicle_type=d.vehicle_type,
            vehicle_color=d.vehicle_color,
            speed_kmh=d.speed_kmh,
            direction=d.direction,
            timestamp=d.timestamp,
            image_url=d.image_url,
            is_simulated=d.is_simulated,
            is_low_confidence=d.is_low_confidence
        ))

    return results

@router.get("/{detection_id}", response_model=DetectionOut)
def get_detection_by_id(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed detection event evidence by ID.
    """
    d = db.query(VehicleDetection).filter(VehicleDetection.id == detection_id).first()
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection event #{detection_id} not found"
        )
    cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
    return DetectionOut(
        id=d.id,
        camera_id=d.camera_id,
        camera_name=cam.name if cam else d.camera_id,
        zone_name=cam.zone.name if (cam and cam.zone) else None,
        vehicle_id=d.vehicle_id,
        raw_plate_text=d.raw_plate_text,
        normalized_plate_text=d.normalized_plate_text,
        ocr_confidence=d.ocr_confidence,
        vehicle_type=d.vehicle_type,
        vehicle_color=d.vehicle_color,
        speed_kmh=d.speed_kmh,
        direction=d.direction,
        timestamp=d.timestamp,
        image_url=d.image_url,
        is_simulated=d.is_simulated,
        is_low_confidence=d.is_low_confidence
    )

import asyncio
from app.engines.alerts import alert_engine
from app.ws.manager import ws_manager

@router.post("", response_model=DetectionOut, status_code=status.HTTP_201_CREATED)
def create_detection(
    det_in: DetectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingest a new vehicle detection event, match with vehicle registry,
    evaluate alert rules, and broadcast to connected clients via WebSocket.
    """
    cam = db.query(Camera).filter(Camera.id == det_in.camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{det_in.camera_id}' not found")

    norm_plate = det_in.raw_plate_text.strip().upper().replace(" ", "").replace("-", "")

    # Lookup or create vehicle
    vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == norm_plate).first()
    if not vehicle:
        vehicle = Vehicle(
            primary_plate=norm_plate,
            vehicle_type=det_in.vehicle_type or "car",
            color=det_in.vehicle_color or "white",
            make="Unknown",
            model="Vehicle",
            first_seen_at=det_in.timestamp or datetime.utcnow(),
            last_seen_at=det_in.timestamp or datetime.utcnow(),
            last_camera_id=det_in.camera_id,
            total_detections=1,
            is_flagged=False
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
    else:
        vehicle.last_seen_at = det_in.timestamp or datetime.utcnow()
        vehicle.last_camera_id = det_in.camera_id
        vehicle.total_detections = (vehicle.total_detections or 0) + 1
        db.commit()

    # Create detection record
    detection = VehicleDetection(
        camera_id=det_in.camera_id,
        vehicle_id=vehicle.id,
        raw_plate_text=det_in.raw_plate_text,
        normalized_plate_text=norm_plate,
        ocr_confidence=det_in.ocr_confidence if det_in.ocr_confidence is not None else 0.95,
        vehicle_type=det_in.vehicle_type or vehicle.vehicle_type,
        vehicle_color=det_in.vehicle_color or vehicle.color,
        speed_kmh=det_in.speed_kmh if det_in.speed_kmh is not None else 45.0,
        direction=det_in.direction or cam.direction,
        timestamp=det_in.timestamp or datetime.utcnow(),
        image_url=det_in.image_url,
        is_simulated=det_in.is_simulated if det_in.is_simulated is not None else False,
        is_low_confidence=(det_in.ocr_confidence < 0.70) if det_in.ocr_confidence is not None else False
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)

    # Evaluate Alert Rules
    alert_engine.process_detection(db, detection)

    # Broadcast DETECTION_CREATED over WebSocket
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ws_manager.broadcast("DETECTION_CREATED", {
                "id": detection.id,
                "camera_id": detection.camera_id,
                "camera_name": cam.name,
                "zone_name": cam.zone.name if cam.zone else "Visakhapatnam",
                "vehicle_id": vehicle.id,
                "raw_plate_text": detection.raw_plate_text,
                "normalized_plate_text": detection.normalized_plate_text,
                "ocr_confidence": detection.ocr_confidence,
                "vehicle_type": detection.vehicle_type,
                "vehicle_color": detection.vehicle_color,
                "speed_kmh": detection.speed_kmh,
                "direction": detection.direction,
                "timestamp": detection.timestamp.isoformat(),
                "is_low_confidence": detection.is_low_confidence
            }))
    except Exception:
        pass

    return DetectionOut(
        id=detection.id,
        camera_id=detection.camera_id,
        camera_name=cam.name,
        zone_name=cam.zone.name if cam.zone else None,
        vehicle_id=detection.vehicle_id,
        raw_plate_text=detection.raw_plate_text,
        normalized_plate_text=detection.normalized_plate_text,
        ocr_confidence=detection.ocr_confidence,
        vehicle_type=detection.vehicle_type,
        vehicle_color=detection.vehicle_color,
        speed_kmh=detection.speed_kmh,
        direction=detection.direction,
        timestamp=detection.timestamp,
        image_url=detection.image_url,
        is_simulated=detection.is_simulated,
        is_low_confidence=detection.is_low_confidence
    )
