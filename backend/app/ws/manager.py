import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("cityvision.ws")

class ConnectionManager:
    """
    Manages active WebSocket client connections for real-time live telemetry,
    detections, and alert broadcasts.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts a typed JSON payload to all active client connections.
        """
        payload = {
            "type": event_type,
            "data": data
        }
        message = json.dumps(payload, default=str)
        dead_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = ConnectionManager()
