import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    VehicleDetection, Vehicle, Camera, Road, Alert, Watchlist,
    TrafficFlow, CongestionRecord, CameraHealth, User
)

router = APIRouter(prefix="/reports", tags=["Mobility & Surveillance Reports Export"])

@router.get("/traffic-volume.csv")
def export_traffic_volume_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export corridor vehicle volume, recorded velocities, and optical read quality to CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Detection_ID", "Timestamp_UTC", "Camera_ID", "Camera_Name", "Zone",
        "Plate_Number", "Vehicle_Type", "Color", "Recorded_Speed_KMH",
        "Direction", "OCR_Confidence", "Is_Simulated", "Is_Low_Confidence"
    ])

    detections = db.query(VehicleDetection).order_by(VehicleDetection.timestamp.desc()).limit(1000).all()
    for d in detections:
        cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
        writer.writerow([
            d.id,
            d.timestamp.isoformat(),
            d.camera_id,
            cam.name if cam else d.camera_id,
            cam.zone.name if (cam and cam.zone) else "Visakhapatnam",
            d.normalized_plate_text,
            d.vehicle_type,
            d.vehicle_color,
            d.speed_kmh,
            d.direction,
            f"{d.ocr_confidence:.2f}",
            d.is_simulated,
            d.is_low_confidence
        ])

    csv_data = output.getvalue()
    filename = f"visakhapatnam_traffic_volume_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/alerts.csv")
def export_alerts_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export active and historical security anomaly alerts log to CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Alert_ID", "Timestamp_UTC", "Alert_Type", "Severity",
        "Title", "Camera_ID", "Vehicle_ID", "Confidence", "Is_Resolved", "Description"
    ])

    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
    for a in alerts:
        writer.writerow([
            a.id,
            a.timestamp.isoformat(),
            a.alert_type,
            a.severity,
            a.title,
            a.camera_id,
            a.vehicle_id or "N/A",
            f"{a.confidence:.2f}",
            a.is_resolved,
            a.description
        ])

    csv_data = output.getvalue()
    filename = f"cityvision_alerts_log_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/origin-destination.csv")
def export_od_flows_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export Origin-Destination transition matrix and commuter flow volumes to CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Flow_ID", "Origin_Camera_ID", "Origin_Camera_Name", "Origin_Zone",
        "Destination_Camera_ID", "Destination_Camera_Name", "Destination_Zone",
        "Commuter_Vehicle_Count", "Avg_Travel_Time_Sec", "Avg_Speed_KMH"
    ])

    flows = db.query(TrafficFlow).all()
    for f in flows:
        o_cam = db.query(Camera).filter(Camera.id == f.origin_camera_id).first()
        d_cam = db.query(Camera).filter(Camera.id == f.dest_camera_id).first()
        writer.writerow([
            f.id,
            f.origin_camera_id,
            o_cam.name if o_cam else f.origin_camera_id,
            o_cam.zone.name if (o_cam and o_cam.zone) else "Visakhapatnam",
            f.dest_camera_id,
            d_cam.name if d_cam else f.dest_camera_id,
            d_cam.zone.name if (d_cam and d_cam.zone) else "Visakhapatnam",
            f.vehicle_count,
            f.avg_travel_time_sec,
            f.avg_speed_kmh
        ])

    csv_data = output.getvalue()
    filename = f"visakhapatnam_od_matrix_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/camera-health.csv")
def export_camera_health_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export camera sensor network telemetry and OCR accuracy records to CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Camera_ID", "Camera_Name", "Zone", "Road_Corridor", "Status",
        "Direction", "Stream_FPS", "Latency_MS", "Real_OCR_Accuracy_Pct", "Throughput_VPM"
    ])

    cams = db.query(Camera).all()
    for c in cams:
        writer.writerow([
            c.id,
            c.name,
            c.zone.name if c.zone else "Visakhapatnam",
            c.road.name if c.road else "Corridor",
            c.status,
            c.direction,
            c.fps,
            c.latency_ms,
            c.ocr_accuracy,
            c.vehicles_per_min
        ])

    csv_data = output.getvalue()
    filename = f"visakhapatnam_camera_health_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
