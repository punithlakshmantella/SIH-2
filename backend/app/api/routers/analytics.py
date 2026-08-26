from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
from app.engines.analytics import analytics_engine

router = APIRouter(prefix="/analytics", tags=["Traffic & Mobility Analytics"])

@router.get("/overview")
def get_traffic_overview(
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter"),
    zone_id: Optional[int] = Query(None, description="Optional zone filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get city-wide traffic volume, velocities, peak hours, vehicle classifications, and zone utilization.
    """
    return analytics_engine.compute_traffic_overview(
        db=db,
        start_time=start_time,
        end_time=end_time,
        zone_id=zone_id
    )

@router.get("/origin-destination")
def get_origin_destination_flows(
    zone_id: Optional[int] = Query(None, description="Zone filter"),
    vehicle_type: Optional[str] = Query(None, description="Vehicle classification filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Origin-Destination mobility transition vectors between camera checkpoints.
    """
    return analytics_engine.compute_origin_destination_flows(
        db=db,
        zone_id=zone_id,
        vehicle_type=vehicle_type
    )

@router.get("/congestion")
def get_congestion_heatmap(
    zone_id: Optional[int] = Query(None, description="Zone filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live-style congestion density points and list of affected road corridors.
    """
    return analytics_engine.get_congestion_heatmap_data(
        db=db,
        zone_id=zone_id
    )

@router.get("/congestion/predict")
def predict_corridor_congestion(
    road_id: int = Query(..., description="Target Road corridor ID"),
    horizon_minutes: int = Query(15, description="Prediction horizon in minutes (15, 30, 60)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Prototype congestion forecast model (Current density -> Predicted density over N-minute horizon).
    Explicitly labeled as prototype model with full disclaimer.
    """
    try:
        return analytics_engine.predict_congestion_prototype(
            db=db,
            road_id=road_id,
            horizon_minutes=horizon_minutes
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
