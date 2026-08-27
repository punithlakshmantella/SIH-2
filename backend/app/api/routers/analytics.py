from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
from app.engines.analytics import analytics_engine
from app.engines.analytics.od_engine import compute_od_flows_from_trajectory

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
    Get Origin-Destination flow vectors from the pre-aggregated traffic_flows table.
    Used by the Analytics summary page.
    """
    return analytics_engine.compute_origin_destination_flows(
        db=db,
        zone_id=zone_id,
        vehicle_type=vehicle_type
    )

@router.get("/od-transitions")
def get_od_transitions(
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter"),
    zone_id: Optional[int] = Query(None, description="Optional zone filter"),
    view_mode: str = Query("camera", description="View mode: 'camera' or 'zone'"),
    limit: int = Query(30, le=100, description="Max transitions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compute Origin-Destination transitions derived from trajectory_events.
    Each consecutive (camera_A -> camera_B) pair per vehicle is one transition.
    Includes physics validation (impossible transitions flagged via 120 km/h threshold).
    Returns camera-to-camera or zone-to-zone aggregation depending on view_mode.
    """
    return compute_od_flows_from_trajectory(
        db=db,
        start_time=start_time,
        end_time=end_time,
        zone_id=zone_id,
        view_mode=view_mode,
        limit=limit
    )

@router.get("/congestion")
def get_congestion_heatmap(
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter"),
    zone_id: Optional[int] = Query(None, description="Zone filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dynamic city-wide congestion density points, corridor hotspots, bottleneck detection,
    and network health metrics computed from camera detections & trajectory data.
    """
    return analytics_engine.get_congestion_heatmap_data(
        db=db,
        start_time=start_time,
        end_time=end_time,
        zone_id=zone_id
    )

@router.get("/congestion/predict")
def predict_corridor_congestion(
    road_id: int = Query(..., description="Target Road corridor ID"),
    horizon_minutes: int = Query(15, description="Prediction horizon in minutes (15, 30, 60)"),
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Prototype congestion forecast model (Observed series + Predicted density over N-minute horizon).
    Explicitly advisory with full explainability and transparent disclaimer.
    """
    try:
        return analytics_engine.predict_congestion_prototype(
            db=db,
            road_id=road_id,
            horizon_minutes=horizon_minutes,
            start_time=start_time,
            end_time=end_time
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
