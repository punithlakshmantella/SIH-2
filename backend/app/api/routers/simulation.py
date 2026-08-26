from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.models.models import User
from app.engines.simulation import simulation_engine

router = APIRouter(prefix="/simulation", tags=["Camera Simulation Engine"])

@router.get("/status")
def get_simulation_status(current_user: User = Depends(get_current_user)):
    """
    Get current simulation engine state (running/stopped, event rate, total emitted).
    """
    return simulation_engine.get_status()

@router.post("/start")
def start_simulation(current_user: User = Depends(get_current_user)):
    """
    Start city-scale multi-camera synthetic traffic stream.
    All emitted detections are strictly labeled DEMO / SYNTHETIC DATA.
    """
    return simulation_engine.start()

@router.post("/stop")
def stop_simulation(current_user: User = Depends(get_current_user)):
    """
    Stop the simulation stream cleanly without interrupting the rest of the application.
    """
    return simulation_engine.stop()
