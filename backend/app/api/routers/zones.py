from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import Zone, Camera, User
from app.schemas.zone_road import ZoneOut

router = APIRouter(prefix="/zones", tags=["City Zones & Geography"])

@router.get("", response_model=List[ZoneOut])
def list_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all Visakhapatnam operational zones with boundary polygons and camera counts.
    """
    zones = db.query(Zone).all()
    results = []
    for z in zones:
        cam_count = db.query(Camera).filter(Camera.zone_id == z.id).count()
        results.append(ZoneOut(
            id=z.id,
            name=z.name,
            code=z.code,
            description=z.description,
            risk_level=z.risk_level,
            polygon_geojson=z.polygon_geojson,
            camera_count=cam_count,
            created_at=z.created_at
        ))
    return results

@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone_by_id(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed zone information and polygon definition.
    """
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone with ID {zone_id} not found"
        )
    cam_count = db.query(Camera).filter(Camera.zone_id == z.id).count()
    return ZoneOut(
        id=z.id,
        name=z.name,
        code=z.code,
        description=z.description,
        risk_level=z.risk_level,
        polygon_geojson=z.polygon_geojson,
        camera_count=cam_count,
        created_at=z.created_at
    )
