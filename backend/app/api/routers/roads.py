from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import Road, Zone, Camera, User
from app.schemas.zone_road import RoadOut

router = APIRouter(prefix="/roads", tags=["City Roads & Corridors"])

@router.get("", response_model=List[RoadOut])
def list_roads(
    zone_id: Optional[int] = Query(None, description="Filter by zone ID"),
    is_congested: Optional[bool] = Query(None, description="Filter by congestion state"),
    road_type: Optional[str] = Query(None, description="highway, arterial, collector, local, rural"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all road segments with speed limits, lengths, and congestion status.
    """
    query = db.query(Road)
    if zone_id:
        query = query.filter(Road.zone_id == zone_id)
    if is_congested is not None:
        query = query.filter(Road.is_congested == is_congested)
    if road_type:
        query = query.filter(Road.road_type == road_type.lower())

    roads = query.all()
    results = []
    for r in roads:
        cam_count = db.query(Camera).filter(Camera.road_id == r.id).count()
        results.append(RoadOut(
            id=r.id,
            name=r.name,
            zone_id=r.zone_id,
            zone_name=r.zone.name if r.zone else None,
            road_type=r.road_type,
            speed_limit_kmh=r.speed_limit_kmh,
            length_km=r.length_km,
            is_congested=r.is_congested,
            camera_count=cam_count,
            created_at=r.created_at
        ))
    return results

@router.get("/{road_id}", response_model=RoadOut)
def get_road_by_id(
    road_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed road corridor data.
    """
    r = db.query(Road).filter(Road.id == road_id).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Road with ID {road_id} not found"
        )
    cam_count = db.query(Camera).filter(Camera.road_id == r.id).count()
    return RoadOut(
        id=r.id,
        name=r.name,
        zone_id=r.zone_id,
        zone_name=r.zone.name if r.zone else None,
        road_type=r.road_type,
        speed_limit_kmh=r.speed_limit_kmh,
        length_km=r.length_km,
        is_congested=r.is_congested,
        camera_count=cam_count,
        created_at=r.created_at
    )
