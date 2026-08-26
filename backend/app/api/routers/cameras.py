from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.models import Camera, CameraHealth, Zone, Road, User
from app.schemas.camera import CameraOut, CameraCreate, CameraHealthOut

router = APIRouter(prefix="/cameras", tags=["Cameras Network"])

@router.get("", response_model=List[CameraOut])
def list_cameras(
    zone_id: Optional[int] = Query(None, description="Filter by zone ID"),
    status: Optional[str] = Query(None, description="Filter by status (online, warning, offline)"),
    road_id: Optional[int] = Query(None, description="Filter by road ID"),
    direction: Optional[str] = Query(None, description="Filter by direction (NB, SB, EB, WB)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all camera nodes with status, metrics, real OCR accuracy, and zone information.
    """
    query = db.query(Camera)
    if zone_id:
        query = query.filter(Camera.zone_id == zone_id)
    if status:
        query = query.filter(Camera.status == status.lower())
    if road_id:
        query = query.filter(Camera.road_id == road_id)
    if direction:
        query = query.filter(Camera.direction == direction.upper())

    cameras = query.all()
    results = []
    for c in cameras:
        results.append(CameraOut(
            id=c.id,
            name=c.name,
            latitude=c.latitude,
            longitude=c.longitude,
            road_id=c.road_id,
            zone_id=c.zone_id,
            zone_name=c.zone.name if c.zone else None,
            road_name=c.road.name if c.road else None,
            direction=c.direction,
            status=c.status,
            fps=c.fps,
            latency_ms=c.latency_ms,
            last_heartbeat=c.last_heartbeat,
            ocr_accuracy=c.ocr_accuracy,
            vehicles_per_min=c.vehicles_per_min,
            is_simulation=c.is_simulation,
            created_at=c.created_at
        ))
    return results

@router.get("/{camera_id}", response_model=CameraOut)
def get_camera_by_id(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information for a specific camera node.
    """
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID '{camera_id}' not found"
        )
    return CameraOut(
        id=camera.id,
        name=camera.name,
        latitude=camera.latitude,
        longitude=camera.longitude,
        road_id=camera.road_id,
        zone_id=camera.zone_id,
        zone_name=camera.zone.name if camera.zone else None,
        road_name=camera.road.name if camera.road else None,
        direction=camera.direction,
        status=camera.status,
        fps=camera.fps,
        latency_ms=camera.latency_ms,
        last_heartbeat=camera.last_heartbeat,
        ocr_accuracy=camera.ocr_accuracy,
        vehicles_per_min=camera.vehicles_per_min,
        is_simulation=camera.is_simulation,
        created_at=camera.created_at
    )

@router.get("/{camera_id}/health", response_model=List[CameraHealthOut])
def get_camera_health_history(
    camera_id: str,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get health logs and connectivity telemetry for a camera.
    """
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera '{camera_id}' not found")

    health_logs = db.query(CameraHealth).filter(
        CameraHealth.camera_id == camera_id
    ).order_by(CameraHealth.timestamp.desc()).limit(limit).all()

    return health_logs

@router.post("", response_model=CameraOut, status_code=status.HTTP_201_CREATED)
def create_camera_node(
    camera_in: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["System Administrator", "Municipal/Smart City Authority"]))
):
    """
    Register a new camera node (Admin or Smart City Authority only).
    """
    existing = db.query(Camera).filter(Camera.id == camera_in.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Camera with ID '{camera_in.id}' already exists"
        )

    zone = db.query(Zone).filter(Zone.id == camera_in.zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zone ID {camera_in.zone_id} does not exist"
        )

    camera = Camera(
        id=camera_in.id,
        name=camera_in.name,
        latitude=camera_in.latitude,
        longitude=camera_in.longitude,
        road_id=camera_in.road_id,
        zone_id=camera_in.zone_id,
        direction=camera_in.direction,
        status=camera_in.status,
        fps=camera_in.fps,
        latency_ms=camera_in.latency_ms,
        ocr_accuracy=0.0,
        is_simulation=True
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return CameraOut(
        id=camera.id,
        name=camera.name,
        latitude=camera.latitude,
        longitude=camera.longitude,
        road_id=camera.road_id,
        zone_id=camera.zone_id,
        zone_name=zone.name,
        direction=camera.direction,
        status=camera.status,
        fps=camera.fps,
        latency_ms=camera.latency_ms,
        last_heartbeat=camera.last_heartbeat,
        ocr_accuracy=camera.ocr_accuracy,
        vehicles_per_min=camera.vehicles_per_min,
        is_simulation=camera.is_simulation,
        created_at=camera.created_at
    )
