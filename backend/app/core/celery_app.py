from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "city_vision_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

@celery_app.task(name="app.core.celery_app.health_ping_task")
def health_ping_task():
    """Stub task for Celery worker health check."""
    return {"status": "ok", "worker": "city_vision_worker"}
