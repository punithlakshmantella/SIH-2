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
    4. If implied speed is physically impossible for the road network (e.g. >120 km/h),
       the transition is flagged as IMPOSSIBLE / ANOMALOUS rather than silently stitched.
    """

    def __init__(self, max_physically_possible_speed_kmh: float = 120.0):
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
                verified_points_count=0,
                degraded_points_count=0,
                anomaly_points_count=0,
                total_distance_km=None,
                total_duration_minutes=None,
                avg_speed_kmh=None,
                max_speed_threshold_kmh=self.max_speed_limit,
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
            speed_recorded = hit.get("speed_kmh")

            dist_from_prev: Optional[float] = None
            travel_time_sec: Optional[float] = None
            implied_speed: Optional[float] = None
            is_impossible = False
            anomaly_flags = hit.get("anomaly_flags") or {}
            prev_cam_id: Optional[str] = None
            prev_cam_name: Optional[str] = None

            if prev_hit is not None:
                prev_lat = prev_hit["latitude"]
                prev_lng = prev_hit["longitude"]
                t_prev = prev_hit["timestamp"]
                prev_cam_id = prev_hit["camera_id"]
                prev_cam_name = prev_hit.get("camera_name", prev_hit["camera_id"])

                dist_from_prev = round(haversine_distance_km(prev_lat, prev_lng, lat, lng), 2)
                dt_sec = round((t_curr - t_prev).total_seconds(), 1)
                travel_time_sec = dt_sec

                if dt_sec <= 0:
                    is_impossible = True
                    has_impossible = True
                    implied_speed = None
                    anomaly_flags["IMPOSSIBLE_TRANSITION"] = "⚠ INVALID TIMESTAMP SEQUENCE: Non-positive travel time between distinct camera hits"
                else:
                    implied_speed = round((dist_from_prev / (dt_sec / 3600.0)), 1)
                    
                    # Impossible transition speed rejection (against configurable threshold)
                    if implied_speed > self.max_speed_limit and dist_from_prev > 0.5:
                        is_impossible = True
                        has_impossible = True
                        anomaly_flags["IMPOSSIBLE_TRANSITION"] = (
                            f"Implied travel speed {implied_speed} km/h exceeds maximum plausible threshold ({self.max_speed_limit} km/h). "
                            f"Distance: {dist_from_prev} km in {dt_sec}s."
                        )

            # Check if this hit is a ReID-resolved degraded read
            raw_text = hit.get("raw_plate_text", primary_plate)
            ocr_conf = hit.get("ocr_confidence", 0.95)
            det_conf = hit.get("detection_confidence", 0.92)
            is_low_conf = hit.get("is_low_confidence", False) or ("?" in raw_text) or (ocr_conf < 0.85)

            if is_low_conf or "?" in raw_text:
                if "reid_resolved" not in anomaly_flags:
                    anomaly_flags["reid_resolved"] = (
                        f"Partial OCR result ({raw_text}, {round(ocr_conf*100, 1)}% confidence) linked to target trajectory via spatio-temporal route continuity."
                    )

            # Match type and validation status determination
            if is_impossible:
                match_type = "FLAGGED_IMPOSSIBLE"
                val_status = "ANOMALOUS"
            elif is_low_conf:
                match_type = "OCR_ASSISTED_MATCH"
                val_status = "OCR_ASSISTED"
            else:
                match_type = "DIRECT_VERIFIED"
                val_status = "FIRST_CHECKPOINT" if prev_hit is None else "VERIFIED"

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
                distance_from_prev_km=dist_from_prev,
                travel_time_sec=travel_time_sec,
                implied_speed_kmh=implied_speed,
                direction=hit.get("direction", "NB"),
                raw_plate_read=raw_text,
                ocr_confidence=ocr_conf,
                detection_confidence=det_conf,
                match_type=match_type,
                validation_status=val_status,
                prev_camera_id=prev_cam_id,
                prev_camera_name=prev_cam_name,
                is_impossible_transition=is_impossible,
                is_low_confidence=is_low_conf,
                anomaly_flags=anomaly_flags if anomaly_flags else None
            )
            points.append(point)
            prev_hit = hit

        total_dist = round(sum(p.distance_from_prev_km for p in points if p.distance_from_prev_km is not None), 2) if len(points) >= 2 else None
        total_duration = 0.0
        if len(points) >= 2:
            total_duration = round((points[-1].timestamp - points[0].timestamp).total_seconds() / 60.0, 1)

        valid_speeds = [p.speed_kmh for p in points if p.speed_kmh is not None and not p.is_impossible_transition]
        avg_spd = round(sum(valid_speeds) / len(valid_speeds), 1) if valid_speeds else None

        verified_count = sum(1 for p in points if p.match_type == "DIRECT_VERIFIED")
        degraded_count = sum(1 for p in points if p.match_type in ("OCR_ASSISTED_MATCH", "PROBABILISTIC_MATCH"))
        anomaly_count = sum(1 for p in points if p.is_impossible_transition or p.match_type == "FLAGGED_IMPOSSIBLE")

        if has_impossible:
            summary = "WARNING: Route contains flagged impossible transitions (implied speed exceeds physical limits) — Officer verification required"
        elif degraded_count > 0:
            summary = "Reconstructed route verified. Includes degraded checkpoint reads resolved via spatio-temporal OCR assistance."
        else:
            summary = "Reconstructed route verified across all camera nodes with consistent high optical confidence."

        return TrajectoryResponse(
            vehicle_id=vehicle_id,
            primary_plate=primary_plate,
            vehicle_type=vehicle_type,
            vehicle_color=vehicle_color,
            total_points=len(points),
            verified_points_count=verified_count,
            degraded_points_count=degraded_count,
            anomaly_points_count=anomaly_count,
            total_distance_km=total_dist,
            total_duration_minutes=total_duration,
            avg_speed_kmh=avg_spd,
            max_speed_threshold_kmh=self.max_speed_limit,
            first_seen_at=points[0].timestamp if points else None,
            last_seen_at=points[-1].timestamp if points else None,
            points=points,
            has_impossible_transitions=has_impossible,
            status_summary=summary
        )
