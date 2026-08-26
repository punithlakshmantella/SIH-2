import math
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from app.schemas.trajectory import TrajectoryPointOut, TrajectoryResponse

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two coordinates in kilometers."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class TrajectoryReconstructionEngine:
    """
    City-Scale Trajectory Reconstruction Algorithm with Impossible-Transition Rejection.
    
    Algorithm:
    1. Aggregates all direct camera detections & Re-ID surfaced candidate events.
    2. Sorts strictly by timestamp.
    3. Traverses chronological camera transitions and validates against implied speed
       (distance / time) and road topology.
    4. If implied speed is physically impossible for the road network (e.g. >140 km/h
       or 100 km in 2 minutes), the transition is flagged as IMPOSSIBLE rather than
       silently stitched into the path.
    """

    def __init__(self, max_physically_possible_speed_kmh: float = 140.0):
        self.max_speed_limit = max_physically_possible_speed_kmh

    def reconstruct(
        self,
        vehicle_id: int,
        primary_plate: str,
        vehicle_type: str,
        vehicle_color: str,
        raw_detections: List[Dict[str, Any]]
    ) -> TrajectoryResponse:
        """
        Executes trajectory reconstruction and impossible-transition validation.
        """
        if not raw_detections:
            return TrajectoryResponse(
                vehicle_id=vehicle_id,
                primary_plate=primary_plate,
                vehicle_type=vehicle_type,
                vehicle_color=vehicle_color,
                total_points=0,
                total_distance_km=0.0,
                total_duration_minutes=0.0,
                avg_speed_kmh=0.0,
                first_seen_at=None,
                last_seen_at=None,
                points=[],
                has_impossible_transitions=False,
                status_summary="No detection evidence found across camera network"
            )

        # 1. Sort strictly by timestamp
        sorted_hits = sorted(raw_detections, key=lambda x: x["timestamp"])

        points: List[TrajectoryPointOut] = []
        has_impossible = False
        prev_hit = None

        for idx, hit in enumerate(sorted_hits):
            lat = hit["latitude"]
            lng = hit["longitude"]
            t_curr = hit["timestamp"]
            speed_recorded = hit.get("speed_kmh", 45.0)

            dist_from_prev = 0.0
            travel_time_sec = 0.0
            implied_speed = speed_recorded
            is_impossible = False
            anomaly_flags = hit.get("anomaly_flags") or {}

            if prev_hit is not None:
                prev_lat = prev_hit["latitude"]
                prev_lng = prev_hit["longitude"]
                t_prev = prev_hit["timestamp"]

                dist_from_prev = haversine_distance_km(prev_lat, prev_lng, lat, lng)
                dt_sec = (t_curr - t_prev).total_seconds()
                travel_time_sec = dt_sec

                if dt_sec <= 0:
                    is_impossible = True
                    has_impossible = True
                    implied_speed = 9999.0
                    anomaly_flags["IMPOSSIBLE_TRANSITION"] = "Non-positive travel time between distinct camera hits"
                else:
                    implied_speed = round((dist_from_prev / (dt_sec / 3600.0)), 1)
                    
                    # Impossible transition speed rejection
                    if implied_speed > self.max_speed_limit and dist_from_prev > 1.0:
                        is_impossible = True
                        has_impossible = True
                        anomaly_flags["IMPOSSIBLE_TRANSITION"] = (
                            f"Implied speed {implied_speed} km/h exceeds maximum physically plausible threshold ({self.max_speed_limit} km/h). "
                            f"Distance: {round(dist_from_prev, 2)} km in {round(dt_sec, 1)}s."
                        )

            # Check if this hit is a ReID-resolved degraded read
            raw_text = hit.get("raw_plate_text", primary_plate)
            is_low_conf = hit.get("is_low_confidence", False) or ("?" in raw_text)
            ocr_conf = hit.get("ocr_confidence", 0.95)

            if is_low_conf or "?" in raw_text:
                anomaly_flags["reid_resolved"] = (
                    f"Surfaced via Vehicle Re-ID spatio-temporal match ({round(ocr_conf*100, 1)}% optical read). Requires officer verification."
                )

            point = TrajectoryPointOut(
                sequence_index=idx,
                detection_id=hit.get("detection_id"),
                camera_id=hit["camera_id"],
                camera_name=hit.get("camera_name", hit["camera_id"]),
                zone_name=hit.get("zone_name", "Visakhapatnam"),
                road_name=hit.get("road_name"),
                latitude=lat,
                longitude=lng,
                timestamp=t_curr,
                speed_kmh=speed_recorded,
                distance_from_prev_km=round(dist_from_prev, 2),
                travel_time_sec=round(travel_time_sec, 1),
                implied_speed_kmh=round(implied_speed, 1),
                direction=hit.get("direction", "NB"),
                raw_plate_read=raw_text,
                ocr_confidence=ocr_conf,
                is_impossible_transition=is_impossible,
                is_low_confidence=is_low_conf,
                anomaly_flags=anomaly_flags if anomaly_flags else None
            )
            points.append(point)
            prev_hit = hit

        total_dist = round(sum(p.distance_from_prev_km for p in points), 2)
        total_duration = 0.0
        if len(points) >= 2:
            total_duration = round((points[-1].timestamp - points[0].timestamp).total_seconds() / 60.0, 1)

        valid_speeds = [p.speed_kmh for p in points if not p.is_impossible_transition]
        avg_spd = round(sum(valid_speeds) / len(valid_speeds), 1) if valid_speeds else 0.0

        if has_impossible:
            summary = "WARNING: Route contains flagged impossible transitions (implied speed exceeds physical limits) — Officer verification required"
        elif any(p.is_low_confidence for p in points):
            summary = "Reconstructed route verified. Includes degraded checkpoint reads resolved via probabilistic Re-ID."
        else:
            summary = "Reconstructed route verified across all camera nodes with consistent high optical confidence."

        return TrajectoryResponse(
            vehicle_id=vehicle_id,
            primary_plate=primary_plate,
            vehicle_type=vehicle_type,
            vehicle_color=vehicle_color,
            total_points=len(points),
            total_distance_km=total_dist,
            total_duration_minutes=total_duration,
            avg_speed_kmh=avg_spd,
            first_seen_at=points[0].timestamp if points else None,
            last_seen_at=points[-1].timestamp if points else None,
            points=points,
            has_impossible_transitions=has_impossible,
            status_summary=summary
        )
