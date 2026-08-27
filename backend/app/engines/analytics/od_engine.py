"""
OD Engine: Derives Origin-Destination transitions from TrajectoryEvent records.

Each consecutive (camera_A → camera_B) pair per vehicle, ordered by timestamp,
constitutes one OD transition. Physics validation (120 km/h threshold) is applied.
"""
import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import TrajectoryEvent, Camera, Vehicle, Zone

# Speed threshold for physics-based validation (same as trajectory reconstructor)
MAX_PLAUSIBLE_SPEED_KMH = 120.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance in km between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_od_flows_from_trajectory(
    db: Session,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    zone_id: Optional[int] = None,
    view_mode: str = "camera",   # "camera" or "zone"
    limit: int = 30
) -> Dict[str, Any]:
    """
    Compute OD transitions dynamically from trajectory_events.
    Returns both camera-level and zone-level aggregations, plus the OD matrix.
    """
    now = datetime.utcnow()
    if not end_time:
        end_time = now
    if not start_time:
        start_time = end_time - timedelta(hours=24)

    # Preload camera lookup for efficiency
    cameras: Dict[str, Any] = {}
    for cam in db.query(Camera).all():
        cameras[cam.id] = cam

    # Preload zone lookup
    zones: Dict[int, str] = {}
    for z in db.query(Zone).all():
        zones[z.id] = z.name

    # Fetch all trajectory events in window, ordered by vehicle + timestamp
    events = (
        db.query(TrajectoryEvent)
        .filter(
            TrajectoryEvent.timestamp >= start_time,
            TrajectoryEvent.timestamp <= end_time,
        )
        .order_by(TrajectoryEvent.vehicle_id, TrajectoryEvent.timestamp)
        .all()
    )

    # Group by vehicle
    vehicle_events: Dict[int, list] = {}
    for ev in events:
        vehicle_events.setdefault(ev.vehicle_id, []).append(ev)

    # Build transitions
    camera_pair_map: Dict[tuple, Dict] = {}     # (origin_cam_id, dest_cam_id) -> aggregated data
    zone_pair_map: Dict[tuple, Dict] = {}       # (origin_zone_id, dest_zone_id) -> aggregated data
    route_anomalies: list = []
    valid_transitions = 0
    excluded_count = 0

    for vehicle_id, evs in vehicle_events.items():
        # Sort by timestamp just in case
        evs_sorted = sorted(evs, key=lambda e: e.timestamp)

        for i in range(len(evs_sorted) - 1):
            o_ev = evs_sorted[i]
            d_ev = evs_sorted[i + 1]

            # Skip same camera transitions
            if o_ev.camera_id == d_ev.camera_id:
                continue

            o_cam = cameras.get(o_ev.camera_id)
            d_cam = cameras.get(d_ev.camera_id)
            if not o_cam or not d_cam:
                excluded_count += 1
                continue

            # Zone filter
            if zone_id and o_cam.zone_id != zone_id and d_cam.zone_id != zone_id:
                continue

            # Timestamp validation
            dt_sec = (d_ev.timestamp - o_ev.timestamp).total_seconds()
            if dt_sec <= 0:
                excluded_count += 1
                continue

            # Compute distance
            dist_km = _haversine_km(o_cam.latitude, o_cam.longitude, d_cam.latitude, d_cam.longitude)
            implied_speed = (dist_km / dt_sec * 3600) if dt_sec > 0 else None

            # Physics validation
            is_impossible = (
                implied_speed is not None and implied_speed > MAX_PLAUSIBLE_SPEED_KMH
            )
            validation_status = "FLAGGED_IMPOSSIBLE" if is_impossible else "VERIFIED"

            if is_impossible:
                route_anomalies.append({
                    "origin_camera_id": o_ev.camera_id,
                    "origin_camera_name": o_cam.name,
                    "origin_zone": zones.get(o_cam.zone_id, "Unknown"),
                    "dest_camera_id": d_ev.camera_id,
                    "dest_camera_name": d_cam.name,
                    "dest_zone": zones.get(d_cam.zone_id, "Unknown"),
                    "vehicle_id": vehicle_id,
                    "dist_km": round(dist_km, 2),
                    "elapsed_sec": round(dt_sec, 1),
                    "implied_speed_kmh": round(implied_speed, 1),
                    "reason": f"Required transit speed {implied_speed:.1f} km/h exceeds {MAX_PLAUSIBLE_SPEED_KMH} km/h threshold",
                    "timestamp": o_ev.timestamp.isoformat()
                })

            valid_transitions += 1

            # Camera-level aggregation
            cam_key = (o_ev.camera_id, d_ev.camera_id)
            if cam_key not in camera_pair_map:
                camera_pair_map[cam_key] = {
                    "origin_camera_id": o_ev.camera_id,
                    "origin_camera_name": o_cam.name,
                    "origin_zone_id": o_cam.zone_id,
                    "origin_zone": zones.get(o_cam.zone_id, "Unknown"),
                    "origin_coords": [o_cam.latitude, o_cam.longitude],
                    "dest_camera_id": d_ev.camera_id,
                    "dest_camera_name": d_cam.name,
                    "dest_zone_id": d_cam.zone_id,
                    "dest_zone": zones.get(d_cam.zone_id, "Unknown"),
                    "dest_coords": [d_cam.latitude, d_cam.longitude],
                    "transition_count": 0,
                    "travel_times": [],
                    "implied_speeds": [],
                    "impossible_count": 0,
                    "verified_count": 0,
                    "dist_km": round(dist_km, 2),
                }
            entry = camera_pair_map[cam_key]
            entry["transition_count"] += 1
            entry["travel_times"].append(dt_sec)
            if implied_speed is not None:
                entry["implied_speeds"].append(implied_speed)
            if is_impossible:
                entry["impossible_count"] += 1
            else:
                entry["verified_count"] += 1

            # Zone-level aggregation
            zone_key = (o_cam.zone_id, d_cam.zone_id)
            if zone_key not in zone_pair_map:
                zone_pair_map[zone_key] = {
                    "origin_zone_id": o_cam.zone_id,
                    "origin_zone": zones.get(o_cam.zone_id, "Unknown"),
                    "dest_zone_id": d_cam.zone_id,
                    "dest_zone": zones.get(d_cam.zone_id, "Unknown"),
                    "transition_count": 0,
                    "travel_times": [],
                    "implied_speeds": [],
                }
            z_entry = zone_pair_map[zone_key]
            z_entry["transition_count"] += 1
            z_entry["travel_times"].append(dt_sec)
            if implied_speed is not None:
                z_entry["implied_speeds"].append(implied_speed)

    # Finalize camera-level pairs
    camera_flows = []
    total_transitions = sum(v["transition_count"] for v in camera_pair_map.values())

    for key, v in sorted(camera_pair_map.items(), key=lambda x: -x[1]["transition_count"])[:limit]:
        avg_time = round(sum(v["travel_times"]) / len(v["travel_times"]), 1) if v["travel_times"] else None
        avg_speed = round(sum(v["implied_speeds"]) / len(v["implied_speeds"]), 1) if v["implied_speeds"] else None
        pct = round(v["transition_count"] / max(total_transitions, 1) * 100, 1)

        # Determine dominant status
        if v["impossible_count"] > 0 and v["impossible_count"] >= v["verified_count"]:
            status = "ANOMALOUS"
        elif v["impossible_count"] > 0:
            status = "PARTIAL_ANOMALY"
        else:
            status = "VERIFIED"

        # Throughput per hour
        window_hours = (end_time - start_time).total_seconds() / 3600
        throughput_per_hour = round(v["transition_count"] / max(window_hours, 1), 1)

        camera_flows.append({
            "pair_key": f"{key[0]}_{key[1]}",
            "origin_camera_id": v["origin_camera_id"],
            "origin_camera_name": v["origin_camera_name"],
            "origin_zone": v["origin_zone"],
            "origin_zone_id": v["origin_zone_id"],
            "origin_coords": v["origin_coords"],
            "dest_camera_id": v["dest_camera_id"],
            "dest_camera_name": v["dest_camera_name"],
            "dest_zone": v["dest_zone"],
            "dest_zone_id": v["dest_zone_id"],
            "dest_coords": v["dest_coords"],
            "transition_count": v["transition_count"],
            "pct_of_total": pct,
            "avg_travel_time_sec": avg_time,
            "avg_implied_speed_kmh": avg_speed,
            "throughput_per_hour": throughput_per_hour,
            "dist_km": v["dist_km"],
            "verified_count": v["verified_count"],
            "impossible_count": v["impossible_count"],
            "validation_status": status,
            "flow_label": f"{v['origin_zone']} → {v['dest_zone']}",
            "vehicle_count": v["transition_count"],   # alias for map compatibility
            "avg_travel_time_sec_label": f"{int(avg_time)}s" if avg_time else "N/A",
            "avg_speed_kmh": avg_speed
        })

    # Finalize zone-level pairs
    zone_flows = []
    for key, v in sorted(zone_pair_map.items(), key=lambda x: -x[1]["transition_count"]):
        avg_time = round(sum(v["travel_times"]) / len(v["travel_times"]), 1) if v["travel_times"] else None
        avg_speed = round(sum(v["implied_speeds"]) / len(v["implied_speeds"]), 1) if v["implied_speeds"] else None
        pct = round(v["transition_count"] / max(total_transitions, 1) * 100, 1)
        zone_flows.append({
            "pair_key": f"z{key[0]}_z{key[1]}",
            "origin_zone_id": v["origin_zone_id"],
            "origin_zone": v["origin_zone"],
            "dest_zone_id": v["dest_zone_id"],
            "dest_zone": v["dest_zone"],
            "transition_count": v["transition_count"],
            "pct_of_total": pct,
            "avg_travel_time_sec": avg_time,
            "avg_implied_speed_kmh": avg_speed,
        })

    # Build OD Matrix (zone × zone)
    all_zone_ids = sorted(set(
        list(zones.keys())
    ))
    od_matrix = {
        str(o): {str(d): 0 for d in all_zone_ids}
        for o in all_zone_ids
    }
    for key, v in zone_pair_map.items():
        o_id, d_id = key
        if str(o_id) in od_matrix and str(d_id) in od_matrix[str(o_id)]:
            od_matrix[str(o_id)][str(d_id)] = v["transition_count"]

    # Zone labels for matrix
    zone_labels = [{"id": str(zid), "name": zones.get(zid, f"Zone {zid}")} for zid in all_zone_ids]

    # Summary KPIs
    all_times = [t for v in camera_pair_map.values() for t in v["travel_times"]]
    all_speeds = [s for v in camera_pair_map.values() for s in v["implied_speeds"] if s <= MAX_PLAUSIBLE_SPEED_KMH]
    avg_transit_time = round(sum(all_times) / len(all_times), 1) if all_times else None
    avg_transit_speed = round(sum(all_speeds) / len(all_speeds), 1) if all_speeds else None
    top_corridor = camera_flows[0]["flow_label"] if camera_flows else None
    unique_vehicles = len(vehicle_events)
    total_anomalies = len(route_anomalies)

    return {
        "time_window": {
            "start": start_time.isoformat(),
            "end": end_time.isoformat()
        },
        "data_note": "DEMO / SYNTHETIC — OD transitions derived from prototype trajectory_events data (SIH evaluation).",
        "summary": {
            "valid_transitions": valid_transitions,
            "excluded_records": excluded_count,
            "unique_vehicles": unique_vehicles,
            "route_anomalies": total_anomalies,
            "avg_transit_time_sec": avg_transit_time,
            "avg_transit_speed_kmh": avg_transit_speed,
            "top_corridor": top_corridor,
        },
        "camera_flows": camera_flows,
        "zone_flows": zone_flows,
        "od_matrix": od_matrix,
        "zone_labels": zone_labels,
        "route_anomalies": route_anomalies[:10],
    }
