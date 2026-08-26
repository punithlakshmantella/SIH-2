try:
    import redis
except ImportError:
    redis = None

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import logging

from app.core.config import settings
from app.api.api_v1 import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("city-vision-backend")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="City-Wide Vehicle Intelligence Platform (SIH26127 - BEL)"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Core API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

from app.ws.manager import ws_manager

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "city": settings.map_config.get("city", "Visakhapatnam"),
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """
    Health check endpoint verifying PostgreSQL and Redis reachability.
    """
    health_status = {
        "status": "ok",
        "service": "city-vision-backend",
        "postgres": {"connected": False, "message": "untested"},
        "redis": {"connected": False, "message": "untested"},
        "environment": {
            "city": settings.map_config.get("city", "Visakhapatnam"),
            "database_url": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL
        }
    }

    # 1. Test PostgreSQL connectivity
    try:
        from app.db.session import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health_status["postgres"] = {"connected": True, "message": "Database is reachable"}
    except Exception as e:
        logger.warning(f"Database connection check: {str(e)}")
        health_status["postgres"] = {"connected": False, "message": f"Database check: {str(e)}"}
        health_status["status"] = "degraded"

    # 2. Test Redis connectivity
    if redis:
        try:
            r = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
            if r.ping():
                health_status["redis"] = {"connected": True, "message": "Redis is reachable"}
        except Exception as e:
            logger.warning(f"Redis connection check: {str(e)}")
            health_status["redis"] = {"connected": False, "message": f"Redis check: {str(e)}"}
            health_status["status"] = "degraded"
    else:
        health_status["redis"] = {"connected": False, "message": "Redis client library not installed on local host"}

    if health_status["postgres"]["connected"]:
        health_status["status"] = "ok"

    return health_status
