from fastapi import APIRouter

from app.api.routers.auth import router as auth_router
from app.api.routers.cameras import router as cameras_router
from app.api.routers.vehicles import router as vehicles_router
from app.api.routers.detections import router as detections_router
from app.api.routers.zones import router as zones_router
from app.api.routers.roads import router as roads_router
from app.api.routers.alerts import router as alerts_router
from app.api.routers.watchlist import router as watchlist_router
from app.api.routers.anpr import router as anpr_router
from app.api.routers.dashboard import router as dashboard_router
from app.api.routers.analytics import router as analytics_router
from app.api.routers.simulation import router as simulation_router
from app.api.routers.cases import router as cases_router
from app.api.routers.reports import router as reports_router
from app.api.routers.system_config import router as system_config_router
from app.api.routers.video_tracking import router as video_tracking_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(cameras_router)
api_router.include_router(vehicles_router)
api_router.include_router(detections_router)
api_router.include_router(zones_router)
api_router.include_router(roads_router)
api_router.include_router(alerts_router)
api_router.include_router(watchlist_router)
api_router.include_router(anpr_router)
api_router.include_router(analytics_router)
api_router.include_router(simulation_router)
api_router.include_router(cases_router)
api_router.include_router(reports_router)
api_router.include_router(system_config_router)
api_router.include_router(video_tracking_router)
