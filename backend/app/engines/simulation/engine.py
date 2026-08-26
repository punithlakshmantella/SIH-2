import asyncio
import random
import logging
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.models import Camera, Vehicle, VehicleDetection
from app.engines.alerts import alert_engine
from app.ws.manager import ws_manager

logger = logging.getLogger("cityvision.simulation")

SYNTHETIC_PLATES = [
    "AP31AB5512", "AP31CD8891", "AP31EF2341", "AP39GH7711", "AP39JK9900",
    "AP31LM4567", "AP39PQ1122", "AP31RS3344", "AP39TU5566", "AP31VW7788",
    "TS09AB1001", "TS09CD2002", "KA01EF3003", "OD02GH4004", "MH12JK5005"
]

VEHICLE_TYPES = ["car", "motorcycle", "auto_rickshaw", "truck", "bus"]
VEHICLE_COLORS = ["white", "silver", "black", "red", "blue", "yellow"]

class CameraSimulationEngine:
    """
    City-Scale Multi-Camera Synthetic Traffic Simulation Engine.
    Emits continuous synthetic vehicle detections moving across Visakhapatnam camera nodes.
    Every emitted event is strictly labeled is_simulated = True.
    """
    def __init__(self):
        self.is_running = False
        self.event_rate_hz = 1.5  # ~1-2 detections per second
        self.total_emitted = 0
        self._task: asyncio.Task | None = None

    def start(self):
        if self.is_running:
            return {"status": "already_running", "is_running": True}
        self.is_running = True
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._simulation_loop())
        except RuntimeError:
            import threading
            self._thread = threading.Thread(target=lambda: asyncio.run(self._simulation_loop()), daemon=True)
            self._thread.start()
        logger.info("Camera Simulation Engine started successfully.")
        return {"status": "started", "is_running": True, "event_rate_hz": self.event_rate_hz}

    def stop(self):
        if not self.is_running:
            return {"status": "not_running", "is_running": False}
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Camera Simulation Engine stopped.")
        return {"status": "stopped", "is_running": False, "total_emitted": self.total_emitted}

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "event_rate_hz": self.event_rate_hz,
            "total_emitted": self.total_emitted,
            "active_simulated_vehicles": len(SYNTHETIC_PLATES),
            "label": "DEMO / SYNTHETIC DATA"
        }

    async def _simulation_loop(self):
        while self.is_running:
            try:
                db: Session = SessionLocal()
                try:
                    self._generate_step(db)
                finally:
                    db.close()
                self.total_emitted += 1
                await asyncio.sleep(1.0 / self.event_rate_hz)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                await asyncio.sleep(2.0)

    def _generate_step(self, db: Session):
        # Pick random camera from seeded database
        cameras = db.query(Camera).filter(Camera.status == "online").all()
        if not cameras:
            cameras = db.query(Camera).all()
        if not cameras:
            return

        cam = random.choice(cameras)
        plate = random.choice(SYNTHETIC_PLATES)
        v_type = random.choice(VEHICLE_TYPES)
        color = random.choice(VEHICLE_COLORS)

        # Realistic velocity with occasional speed violation for alert generation
        base_speed = cam.road.speed_limit_kmh if cam.road else 50.0
        if random.random() < 0.08:  # 8% chance of speed violation
            speed = round(base_speed + random.uniform(26.0, 45.0), 1)
        else:
            speed = round(max(20.0, base_speed + random.uniform(-15.0, 10.0)), 1)

        # Synthetic OCR confidence (clearly labeled)
        conf = round(random.uniform(0.85, 0.99), 2)
        if random.random() < 0.05:  # 5% chance of low conf
            conf = round(random.uniform(0.55, 0.68), 2)

        # Lookup or create synthetic vehicle
        vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == plate).first()
        if not vehicle:
            vehicle = Vehicle(
                primary_plate=plate,
                vehicle_type=v_type,
                color=color,
                make="Simulated",
                model="Vehicle",
                first_seen_at=datetime.utcnow(),
                last_seen_at=datetime.utcnow(),
                last_camera_id=cam.id,
                total_detections=1,
                is_flagged=False
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)
        else:
            vehicle.last_seen_at = datetime.utcnow()
            vehicle.last_camera_id = cam.id
            vehicle.total_detections = (vehicle.total_detections or 0) + 1
            db.commit()

        detection = VehicleDetection(
            camera_id=cam.id,
            vehicle_id=vehicle.id,
            raw_plate_text=plate,
            normalized_plate_text=plate,
            ocr_confidence=conf,
            vehicle_type=v_type,
            vehicle_color=color,
            speed_kmh=speed,
            direction=cam.direction,
            timestamp=datetime.utcnow(),
            is_simulated=True,
            is_low_confidence=(conf < 0.70)
        )
        db.add(detection)
        db.commit()
        db.refresh(detection)

        # Check alert engine rules (will evaluate speed violations & watchlist matches)
        alert_engine.process_detection(db, detection)

        # Broadcast over WebSocket
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(ws_manager.broadcast("DETECTION_CREATED", {
                    "id": detection.id,
                    "camera_id": cam.id,
                    "camera_name": cam.name,
                    "zone_name": cam.zone.name if cam.zone else "Visakhapatnam",
                    "vehicle_id": vehicle.id,
                    "raw_plate_text": detection.raw_plate_text,
                    "normalized_plate_text": detection.normalized_plate_text,
                    "ocr_confidence": detection.ocr_confidence,
                    "vehicle_type": detection.vehicle_type,
                    "vehicle_color": detection.vehicle_color,
                    "speed_kmh": detection.speed_kmh,
                    "direction": detection.direction,
                    "timestamp": detection.timestamp.isoformat(),
                    "is_simulated": True,
                    "is_low_confidence": detection.is_low_confidence,
                    "data_source_label": "DEMO / SYNTHETIC DATA"
                }))
        except Exception:
            pass

simulation_engine = CameraSimulationEngine()
