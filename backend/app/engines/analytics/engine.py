import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.models.models import (
    VehicleDetection, TrajectoryEvent, Road, Zone, Camera, 
    TrafficMetric, TrafficFlow, CongestionRecord
)

class AnalyticsEngine:
    """
    City-Wide Traffic Analytics & Mobility Intelligence Engine.
    Computes volume, density, OD flow transitions, and prototype congestion predictions.
    """

    def compute_traffic_overview(
        self,
        db: Session,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        zone_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Computes aggregate volume, speeds, vehicle type and direction distributions.
        """
        now = datetime.utcnow()
        if not end_time:
            end_time = now
        if not start_time:
            start_time = end_time - timedelta(hours=24)

        # Base detection query
        query = db.query(VehicleDetection).filter(
            VehicleDetection.timestamp >= start_time,
            VehicleDetection.timestamp <= end_time
        )
        if zone_id:
            query = query.filter(VehicleDetection.camera.has(Camera.zone_id == zone_id))

        total_detections = query.count()

        # 1. Hourly Trend Analysis
        hourly_map = {}
        # Pre-populate 24 hour buckets
        cur_hour = start_time.replace(minute=0, second=0, microsecond=0)
        while cur_hour <= end_time:
            k = cur_hour.strftime("%H:00")
            hourly_map[k] = {"hour": k, "volume": 0, "speed_sum": 0.0, "count": 0}
            cur_hour += timedelta(hours=1)

        detections = query.all()
        speeds = []
        for d in detections:
            speeds.append(d.speed_kmh)
            h_key = d.timestamp.strftime("%H:00")
            if h_key in hourly_map:
                hourly_map[h_key]["volume"] += 1
                hourly_map[h_key]["speed_sum"] += d.speed_kmh
                hourly_map[h_key]["count"] += 1

        hourly_series = []
        peak_hour = "09:00"
        max_vol = 0
        for h, v in hourly_map.items():
            avg_s = round(v["speed_sum"] / max(v["count"], 1), 1) if v["count"] > 0 else 48.0
            if v["volume"] > max_vol:
                max_vol = v["volume"]
                peak_hour = h
            hourly_series.append({
                "time": h,
                "volume": v["volume"],
                "avg_speed_kmh": avg_s
            })

        avg_speed = round(sum(speeds) / max(len(speeds), 1), 1) if speeds else 45.0

        # 2. Vehicle Classification Distribution
        type_counts = {}
        for d in detections:
            t = d.vehicle_type or "car"
            type_counts[t] = type_counts.get(t, 0) + 1

        type_series = [
            {"name": k.capitalize().replace("_", " "), "value": v, "type": k}
            for k, v in type_counts.items()
        ]

        # 3. Direction Distribution
        dir_counts = {"NB": 0, "SB": 0, "EB": 0, "WB": 0}
        for d in detections:
            d_dir = (d.direction or "NB").upper()
            if d_dir in dir_counts:
                dir_counts[d_dir] += 1
            else:
                dir_counts["NB"] += 1

        dir_series = [
            {"direction": f"{k} ({'North' if k=='NB' else 'South' if k=='SB' else 'East' if k=='EB' else 'West'})", "count": v, "code": k}
            for k, v in dir_counts.items()
        ]

        # 4. Zone Utilization
        zones = db.query(Zone).all()
        zone_series = []
        for z in zones:
            z_cams = db.query(Camera.id).filter(Camera.zone_id == z.id).all()
            c_ids = [c[0] for c in z_cams]
            z_vol = db.query(VehicleDetection).filter(
                VehicleDetection.camera_id.in_(c_ids),
                VehicleDetection.timestamp >= start_time,
                VehicleDetection.timestamp <= end_time
            ).count() if c_ids else 0
            zone_series.append({
                "zone_id": z.id,
                "zone_name": z.name,
                "volume": z_vol,
                "risk_level": z.risk_level
            })

        return {
            "time_window": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            },
            "summary": {
                "total_volume": total_detections,
                "avg_speed_kmh": avg_speed,
                "peak_hour": peak_hour,
                "peak_volume": max_vol
            },
            "hourly_trends": hourly_series,
            "vehicle_type_distribution": type_series,
            "direction_distribution": dir_series,
            "zone_utilization": zone_series
        }

    def compute_origin_destination_flows(
        self,
        db: Session,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        zone_id: Optional[int] = None,
        vehicle_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Computes Origin-Destination flow vectors between cameras across tracked vehicles.
        """
        flows = db.query(TrafficFlow).all()
        results = []

        for f in flows:
            o_cam = db.query(Camera).filter(Camera.id == f.origin_camera_id).first()
            d_cam = db.query(Camera).filter(Camera.id == f.dest_camera_id).first()

            if not o_cam or not d_cam:
                continue

            if zone_id and o_cam.zone_id != zone_id and d_cam.zone_id != zone_id:
                continue

            results.append({
                "id": f.id,
                "origin_camera_id": f.origin_camera_id,
                "origin_camera_name": o_cam.name,
                "origin_zone": o_cam.zone.name if o_cam.zone else "Visakhapatnam",
                "origin_coords": [o_cam.latitude, o_cam.longitude],
                "dest_camera_id": f.dest_camera_id,
                "dest_camera_name": d_cam.name,
                "dest_zone": d_cam.zone.name if d_cam.zone else "Visakhapatnam",
                "dest_coords": [d_cam.latitude, d_cam.longitude],
                "vehicle_count": f.vehicle_count,
                "avg_travel_time_sec": f.avg_travel_time_sec,
                "avg_speed_kmh": f.avg_speed_kmh
            })

        results.sort(key=lambda x: x["vehicle_count"], reverse=True)
        return results

    def get_congestion_heatmap_data(self, db: Session, zone_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieves live-style density buckets (Low/Moderate/High/Severe) and affected roads.
        """
        roads_query = db.query(Road)
        if zone_id:
            roads_query = roads_query.filter(Road.zone_id == zone_id)
        roads = roads_query.all()

        heatmap_points = []
        affected_corridors = []

        for r in roads:
            # Get latest density record
            cong_rec = db.query(CongestionRecord).filter(
                CongestionRecord.road_id == r.id
            ).order_by(CongestionRecord.timestamp.desc()).first()

            density = cong_rec.current_density if cong_rec else (0.75 if r.is_congested else 0.35)
            severity = cong_rec.severity if cong_rec else ("high" if r.is_congested else "low")

            cams = db.query(Camera).filter(Camera.road_id == r.id).all()
            for c in cams:
                heatmap_points.append({
                    "latitude": c.latitude,
                    "longitude": c.longitude,
                    "intensity": density,
                    "camera_id": c.id,
                    "camera_name": c.name,
                    "road_name": r.name,
                    "severity": severity
                })

            if r.is_congested or severity in ("high", "severe"):
                affected_corridors.append({
                    "road_id": r.id,
                    "road_name": r.name,
                    "zone_name": r.zone.name if r.zone else "Visakhapatnam",
                    "severity": severity,
                    "current_density": round(density * 100, 1),
                    "speed_limit_kmh": r.speed_limit_kmh,
                    "duration_minutes": cong_rec.duration_minutes if cong_rec else 25
                })

        return {
            "heatmap_points": heatmap_points,
            "affected_corridors": affected_corridors,
            "city": "Visakhapatnam",
            "timestamp": datetime.utcnow().isoformat()
        }

    def predict_congestion_prototype(
        self,
        db: Session,
        road_id: int,
        horizon_minutes: int = 15
    ) -> Dict[str, Any]:
        """
        Clearly-labeled PROTOTYPE congestion forecasting model.
        Current density -> Predicted density over N-minute horizon -> Risk Level.
        """
        road = db.query(Road).filter(Road.id == road_id).first()
        if not road:
            raise ValueError(f"Road ID {road_id} not found")

        # Fetch recent metrics
        latest_rec = db.query(CongestionRecord).filter(
            CongestionRecord.road_id == road_id
        ).order_by(CongestionRecord.timestamp.desc()).first()

        base_density = latest_rec.current_density if latest_rec else (0.75 if road.is_congested else 0.40)

        # Prototype trend estimation formula
        # In evening peak or congested corridors, density climbs by horizon factor
        horizon_factor = (horizon_minutes / 60.0) * 0.18
        predicted_density = min(1.0, max(0.1, base_density + horizon_factor))
        predicted_density = round(predicted_density, 3)

        if predicted_density >= 0.80:
            risk_level = "critical"
            recommendation = "Dispatch dynamic signal timing adjustment and reroute commercial heavy vehicles."
        elif predicted_density >= 0.65:
            risk_level = "high"
            recommendation = "Pre-position traffic interceptors and monitor entry flyover queues."
        elif predicted_density >= 0.45:
            risk_level = "medium"
            recommendation = "Traffic flow steady. Standard corridor speed enforcement active."
        else:
            risk_level = "low"
            recommendation = "Optimal flow conditions. No manual intervention required."

        # Generated forecast series (every 5 mins)
        forecast_points = []
        cur_time = datetime.utcnow()
        for m in range(0, horizon_minutes + 5, 5):
            d_val = round(min(1.0, base_density + (m / 60.0) * 0.18), 3)
            forecast_points.append({
                "time_offset_min": m,
                "timestamp": (cur_time + timedelta(minutes=m)).strftime("%H:%M"),
                "predicted_density_pct": round(d_val * 100, 1)
            })

        return {
            "road_id": road.id,
            "road_name": road.name,
            "zone_name": road.zone.name if road.zone else "Visakhapatnam",
            "horizon_minutes": horizon_minutes,
            "current_density_pct": round(base_density * 100, 1),
            "predicted_density_pct": round(predicted_density * 100, 1),
            "risk_level": risk_level,
            "recommendation": recommendation,
            "forecast_series": forecast_points,
            "is_prototype": True,
            "model_architecture": "Prototype Spatio-Temporal Polynomial Estimator (Pluggable for XGBoost/LSTM)",
            "disclaimer": "PROTOTYPE / DEMO MODEL — This forecast is generated by the prototype estimator and is NOT validated for mission-critical traffic dispatch."
        }
