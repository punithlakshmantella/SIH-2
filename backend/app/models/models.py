from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, 
    Text, JSON, Index, func
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

# 1. Role Model
class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="role")

# 2. User Model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    badge_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    watchlists = relationship("Watchlist", back_populates="creator")
    cases = relationship("Case", back_populates="assigned_investigator")
    audit_logs = relationship("AuditLog", back_populates="user")

# 3. Zone Model
class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(50), nullable=True)
    description = Column(String(255), nullable=True)
    polygon_geojson = Column(JSON, nullable=True)
    risk_level = Column(String(50), default="low")  # low, moderate, high
    created_at = Column(DateTime, default=datetime.utcnow)

    roads = relationship("Road", back_populates="zone")
    cameras = relationship("Camera", back_populates="zone")
    traffic_metrics = relationship("TrafficMetric", back_populates="zone")
    congestion_records = relationship("CongestionRecord", back_populates="zone")

# 4. Road Model
class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    road_type = Column(String(50), default="arterial")  # highway, arterial, collector, local, rural
    speed_limit_kmh = Column(Float, default=60.0)
    length_km = Column(Float, default=5.0)
    coordinates = Column(JSON, nullable=True)
    is_congested = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="roads")
    cameras = relationship("Camera", back_populates="road")
    traffic_metrics = relationship("TrafficMetric", back_populates="road")
    congestion_records = relationship("CongestionRecord", back_populates="road")

# 5. Camera Model
class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(50), primary_key=True, index=True)  # e.g., CAM-VIS-001
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    direction = Column(String(50), default="NB")  # NB, SB, EB, WB, Both
    status = Column(String(50), default="online")  # online, warning, offline
    fps = Column(Float, default=30.0)
    latency_ms = Column(Float, default=45.0)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    ocr_accuracy = Column(Float, default=0.0)  # Real OCR accuracy from test runs
    vehicles_per_min = Column(Float, default=12.0)
    is_simulation = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="cameras")
    road = relationship("Road", back_populates="cameras")
    detections = relationship("VehicleDetection", back_populates="camera")
    health_logs = relationship("CameraHealth", back_populates="camera")
    trajectory_events = relationship("TrajectoryEvent", back_populates="camera")
    alerts = relationship("Alert", back_populates="camera")

# 6. Camera Health Log Model
class CameraHealth(Base):
    __tablename__ = "camera_health"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(50), nullable=False)
    latency_ms = Column(Float, default=40.0)
    packet_loss_pct = Column(Float, default=0.0)
    fps_actual = Column(Float, default=30.0)
    error_message = Column(String(255), nullable=True)

    camera = relationship("Camera", back_populates="health_logs")

    __table_args__ = (
        Index("ix_camera_health_cam_time", "camera_id", "timestamp"),
    )

# 7. Vehicle Model
class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    primary_plate = Column(String(50), unique=True, nullable=False, index=True)
    vehicle_type = Column(String(50), default="car")  # car, motorcycle, truck, bus, auto_rickshaw
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), default="white")
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    last_camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=True)
    total_detections = Column(Integer, default=1)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    plates = relationship("Plate", back_populates="vehicle")
    detections = relationship("VehicleDetection", back_populates="vehicle")
    features = relationship("VehicleFeature", back_populates="vehicle")
    trajectory_events = relationship("TrajectoryEvent", back_populates="vehicle")
    alerts = relationship("Alert", back_populates="vehicle")
    cases = relationship("Case", back_populates="subject_vehicle")

# 8. Plate Model
class Plate(Base):
    __tablename__ = "plates"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(50), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    state_code = Column(String(10), default="AP")
    rto_code = Column(String(10), default="39")
    series = Column(String(10), default="AB")
    num_part = Column(String(10), default="1234")
    is_standard = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="plates")

# 9. Vehicle Detection Model
class VehicleDetection(Base):
    __tablename__ = "vehicle_detections"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    raw_plate_text = Column(String(50), nullable=False)
    normalized_plate_text = Column(String(50), nullable=False, index=True)
    ocr_confidence = Column(Float, default=0.95)
    vehicle_type = Column(String(50), default="car")
    vehicle_color = Column(String(50), default="white")
    speed_kmh = Column(Float, default=45.0)
    direction = Column(String(50), default="NB")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    image_url = Column(String(255), nullable=True)
    crop_url = Column(String(255), nullable=True)
    is_simulated = Column(Boolean, default=True)
    is_low_confidence = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", back_populates="detections")
    vehicle = relationship("Vehicle", back_populates="detections")
    trajectory_events = relationship("TrajectoryEvent", back_populates="detection")
    alerts = relationship("Alert", back_populates="detection")

    __table_args__ = (
        Index("ix_detections_camera_time", "camera_id", "timestamp"),
        Index("ix_detections_vehicle_time", "vehicle_id", "timestamp"),
        Index("ix_detections_plate_time", "normalized_plate_text", "timestamp"),
    )

# 10. Vehicle Features / Re-ID Embedding Model
class VehicleFeature(Base):
    __tablename__ = "vehicle_features"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    detection_id = Column(Integer, ForeignKey("vehicle_detections.id"), nullable=True)
    color_histogram = Column(JSON, nullable=True)
    embedding_vector = Column(JSON, nullable=True)
    feature_type = Column(String(50), default="osnet_clip_stub")
    confidence = Column(Float, default=0.9)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="features")

# 11. Trajectory Event Model
class TrajectoryEvent(Base):
    __tablename__ = "trajectory_events"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    detection_id = Column(Integer, ForeignKey("vehicle_detections.id"), nullable=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=45.0)
    distance_from_prev_km = Column(Float, default=0.0)
    travel_time_sec = Column(Float, default=0.0)
    implied_speed_kmh = Column(Float, default=0.0)
    direction = Column(String(50), default="NB")
    is_impossible_transition = Column(Boolean, default=False)
    anomaly_flags = Column(JSON, nullable=True)
    sequence_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="trajectory_events")
    detection = relationship("VehicleDetection", back_populates="trajectory_events")
    camera = relationship("Camera", back_populates="trajectory_events")

    __table_args__ = (
        Index("ix_trajectory_vehicle_time", "vehicle_id", "timestamp"),
        Index("ix_trajectory_camera_time", "camera_id", "timestamp"),
    )

# 12. Alert Model
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    detection_id = Column(Integer, ForeignKey("vehicle_detections.id"), nullable=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=True, index=True)
    alert_type = Column(String(100), nullable=False)  # watchlist_match, route_anomaly, unexpected_stop, wrong_way, excessive_speed, camera_failure, traffic_spike
    severity = Column(String(50), default="warning")  # info, warning, critical
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="alerts")
    detection = relationship("VehicleDetection", back_populates="alerts")
    camera = relationship("Camera", back_populates="alerts")

    __table_args__ = (
        Index("ix_alerts_type_time", "alert_type", "timestamp"),
        Index("ix_alerts_vehicle_time", "vehicle_id", "timestamp"),
    )

# 13. Watchlist Model
class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(50), unique=True, nullable=False, index=True)
    reason_category = Column(String(100), nullable=False)  # stolen, active_investigation, authorized_watchlist, traffic_violator, other
    priority = Column(String(50), default="high")  # low, medium, high, urgent
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", back_populates="watchlists")

# 14. Case Model
class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    case_type = Column(String(100), default="theft")  # theft, surveillance, traffic_incident, security_threat
    subject_vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    subject_plate = Column(String(50), nullable=False, index=True)
    status = Column(String(50), default="open")  # open, investigating, closed, archived
    priority = Column(String(50), default="medium")  # urgent, high, medium, low
    assigned_investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subject_vehicle = relationship("Vehicle", back_populates="cases")
    assigned_investigator = relationship("User", back_populates="cases")
    events = relationship("CaseEvent", back_populates="case")

# 15. Case Event Model
class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)  # detection_tagged, note_added, status_change, evidence_attached
    description = Column(Text, nullable=False)
    evidence_data = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="events")

# 16. Traffic Metric Model
class TrafficMetric(Base):
    __tablename__ = "traffic_metrics"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    vehicle_count = Column(Integer, default=0)
    avg_speed_kmh = Column(Float, default=45.0)
    density_level = Column(String(50), default="low")  # low, moderate, high, severe
    occupancy_rate = Column(Float, default=0.25)
    peak_hour_flag = Column(Boolean, default=False)

    zone = relationship("Zone", back_populates="traffic_metrics")
    road = relationship("Road", back_populates="traffic_metrics")

    __table_args__ = (
        Index("ix_traffic_metrics_zone_time", "zone_id", "timestamp"),
        Index("ix_traffic_metrics_road_time", "road_id", "timestamp"),
    )

# 17. Traffic Flow (OD) Model
class TrafficFlow(Base):
    __tablename__ = "traffic_flows"

    id = Column(Integer, primary_key=True, index=True)
    origin_camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    dest_camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    origin_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    dest_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    vehicle_count = Column(Integer, default=0)
    avg_travel_time_sec = Column(Float, default=300.0)
    avg_speed_kmh = Column(Float, default=45.0)
    timestamp_window_start = Column(DateTime, nullable=False)
    timestamp_window_end = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("ix_flows_origin_dest", "origin_camera_id", "dest_camera_id"),
    )

# 18. Congestion Record & Prediction Model
class CongestionRecord(Base):
    __tablename__ = "congestion_records"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False, index=True)
    severity = Column(String(50), default="moderate")  # low, moderate, high, severe
    current_density = Column(Float, default=0.5)
    predicted_density_15min = Column(Float, default=0.55)
    predicted_density_30min = Column(Float, default=0.60)
    risk_level = Column(String(50), default="medium")  # low, medium, high
    duration_minutes = Column(Integer, default=15)
    is_prototype_prediction = Column(Boolean, default=True)  # Clearly labeled as prototype
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    road = relationship("Road", back_populates="congestion_records")
    zone = relationship("Zone", back_populates="congestion_records")

    __table_args__ = (
        Index("ix_congestion_road_time", "road_id", "timestamp"),
        Index("ix_congestion_zone_time", "zone_id", "timestamp"),
    )

# 19. Audit Log Model
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # view_vehicle, search_plate, update_watchlist, export_report, login, view_investigation
    target_entity = Column(String(100), nullable=True)  # vehicle, plate, case, camera, user
    target_id = Column(String(100), nullable=True)
    query_params = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_user_time", "user_id", "timestamp"),
        Index("ix_audit_action_time", "action", "timestamp"),
    )
