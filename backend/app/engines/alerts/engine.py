import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import (
    VehicleDetection, Vehicle, Camera, Road, Alert, Watchlist
)
from app.ws.manager import ws_manager

logger = logging.getLogger("cityvision.alerts")

class AlertRuleEngine:
    """
    Real-Time Surveillance Alert Rule Engine.
    Evaluates incoming detections against security and traffic anomaly rules.
    """

    def process_detection(self, db: Session, detection: VehicleDetection) -> List[Alert]:
        """
        Evaluates detection against all active rule definitions.
        Persists generated alerts and broadcasts them over WebSocket.
        """
        generated_alerts: List[Alert] = []

        norm_plate = (detection.normalized_plate_text or detection.raw_plate_text).strip().upper()
        cam = db.query(Camera).filter(Camera.id == detection.camera_id).first()
        road = db.query(Road).filter(Road.id == cam.road_id).first() if cam else None
        vehicle = db.query(Vehicle).filter(Vehicle.id == detection.vehicle_id).first() if detection.vehicle_id else None

        # Rule 1: Watchlist / Blacklist Match
        watchlist_entry = db.query(Watchlist).filter(
            Watchlist.plate_number == norm_plate,
            Watchlist.is_active == True
        ).first()

        if watchlist_entry:
            severity = "critical" if watchlist_entry.priority in ("urgent", "high") else "warning"
            title = f"Watchlist Target Hit: {norm_plate}"
            desc = (
                f"Vehicle {norm_plate} flagged under category '{watchlist_entry.reason_category}' "
                f"detected at {cam.name if cam else detection.camera_id}."
            )
            if watchlist_entry.notes:
                desc += f" Case Note: {watchlist_entry.notes}"

            alert = Alert(
                camera_id=detection.camera_id,
                vehicle_id=detection.vehicle_id,
                detection_id=detection.id,
                alert_type="watchlist_match",
                severity=severity,
                title=title,
                description=desc,
                confidence=detection.ocr_confidence,
                is_resolved=False,
                timestamp=datetime.utcnow()
            )
            db.add(alert)
            generated_alerts.append(alert)

        # Rule 2: Excessive Speed Violation
        speed_limit = road.speed_limit_kmh if road else 60.0
        if detection.speed_kmh > (speed_limit + 25.0):
            alert = Alert(
                camera_id=detection.camera_id,
                vehicle_id=detection.vehicle_id,
                detection_id=detection.id,
                alert_type="overspeeding",
                severity="high" if detection.speed_kmh > (speed_limit + 40.0) else "medium",
                title=f"Excessive Speed Violation: {norm_plate} ({detection.speed_kmh} km/h)",
                description=(
                    f"Vehicle {norm_plate} clocked at {detection.speed_kmh} km/h "
                    f"in a {speed_limit} km/h zone on {road.name if road else 'Corridor'}."
                ),
                confidence=0.98,
                is_resolved=False,
                timestamp=datetime.utcnow()
            )
            db.add(alert)
            generated_alerts.append(alert)

        # Rule 3: Unexpected Stop in Active Fast Corridor
        if detection.speed_kmh < 2.0 and road and road.road_type in ("highway", "arterial", "expressway"):
            alert = Alert(
                camera_id=detection.camera_id,
                vehicle_id=detection.vehicle_id,
                detection_id=detection.id,
                alert_type="unexpected_stop",
                severity="medium",
                title=f"Unexpected Stationary Vehicle: {norm_plate}",
                description=f"Vehicle stationary (0 km/h) in active travel lane on {road.name}.",
                confidence=0.92,
                is_resolved=False,
                timestamp=datetime.utcnow()
            )
            db.add(alert)
            generated_alerts.append(alert)

        if generated_alerts:
            db.commit()
            for a in generated_alerts:
                db.refresh(a)
                self._broadcast_alert(a, norm_plate, cam.name if cam else detection.camera_id)

        return generated_alerts

    def _broadcast_alert(self, alert: Alert, plate: str, camera_name: str):
        """
        Sends WebSocket push to all connected operators.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(ws_manager.broadcast("ALERT_TRIGGERED", {
                    "id": alert.id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "description": alert.description,
                    "camera_id": alert.camera_id,
                    "camera_name": camera_name,
                    "vehicle_id": alert.vehicle_id,
                    "plate_number": plate,
                    "confidence": alert.confidence,
                    "timestamp": alert.timestamp.isoformat(),
                    "is_resolved": alert.is_resolved
                }))
        except Exception as e:
            logger.warning(f"Failed to push alert to WebSocket: {e}")

alert_engine = AlertRuleEngine()
