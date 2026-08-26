"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-26 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. roles
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # 2. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('badge_number', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 3. zones
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('polygon_geojson', sa.JSON(), nullable=True),
        sa.Column('risk_level', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_zones_id'), 'zones', ['id'], unique=False)
    op.create_index(op.f('ix_zones_name'), 'zones', ['name'], unique=True)

    # 4. roads
    op.create_table(
        'roads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('road_type', sa.String(length=50), nullable=True),
        sa.Column('speed_limit_kmh', sa.Float(), nullable=True),
        sa.Column('length_km', sa.Float(), nullable=True),
        sa.Column('coordinates', sa.JSON(), nullable=True),
        sa.Column('is_congested', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roads_id'), 'roads', ['id'], unique=False)
    op.create_index(op.f('ix_roads_name'), 'roads', ['name'], unique=False)
    op.create_index(op.f('ix_roads_zone_id'), 'roads', ['zone_id'], unique=False)

    # 5. cameras
    op.create_table(
        'cameras',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('road_id', sa.Integer(), nullable=True),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('direction', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('fps', sa.Float(), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=True),
        sa.Column('last_heartbeat', sa.DateTime(), nullable=True),
        sa.Column('ocr_accuracy', sa.Float(), nullable=True),
        sa.Column('vehicles_per_min', sa.Float(), nullable=True),
        sa.Column('is_simulation', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['road_id'], ['roads.id'], ),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cameras_id'), 'cameras', ['id'], unique=False)
    op.create_index(op.f('ix_cameras_zone_id'), 'cameras', ['zone_id'], unique=False)

    # 6. camera_health
    op.create_table(
        'camera_health',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('camera_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('latency_ms', sa.Float(), nullable=True),
        sa.Column('packet_loss_pct', sa.Float(), nullable=True),
        sa.Column('fps_actual', sa.Float(), nullable=True),
        sa.Column('error_message', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_camera_health_camera_id'), 'camera_health', ['camera_id'], unique=False)
    op.create_index(op.f('ix_camera_health_id'), 'camera_health', ['id'], unique=False)
    op.create_index(op.f('ix_camera_health_timestamp'), 'camera_health', ['timestamp'], unique=False)
    op.create_index('ix_camera_health_cam_time', 'camera_health', ['camera_id', 'timestamp'], unique=False)

    # 7. vehicles
    op.create_table(
        'vehicles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('primary_plate', sa.String(length=50), nullable=False),
        sa.Column('vehicle_type', sa.String(length=50), nullable=True),
        sa.Column('make', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_camera_id', sa.String(length=50), nullable=True),
        sa.Column('total_detections', sa.Integer(), nullable=True),
        sa.Column('is_flagged', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['last_camera_id'], ['cameras.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicles_id'), 'vehicles', ['id'], unique=False)
    op.create_index(op.f('ix_vehicles_primary_plate'), 'vehicles', ['primary_plate'], unique=True)

    # 8. plates
    op.create_table(
        'plates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plate_number', sa.String(length=50), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('state_code', sa.String(length=10), nullable=True),
        sa.Column('rto_code', sa.String(length=10), nullable=True),
        sa.Column('series', sa.String(length=10), nullable=True),
        sa.Column('num_part', sa.String(length=10), nullable=True),
        sa.Column('is_standard', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plates_id'), 'plates', ['id'], unique=False)
    op.create_index(op.f('ix_plates_plate_number'), 'plates', ['plate_number'], unique=False)
    op.create_index(op.f('ix_plates_vehicle_id'), 'plates', ['vehicle_id'], unique=False)

    # 9. vehicle_detections
    op.create_table(
        'vehicle_detections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('camera_id', sa.String(length=50), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=True),
        sa.Column('raw_plate_text', sa.String(length=50), nullable=False),
        sa.Column('normalized_plate_text', sa.String(length=50), nullable=False),
        sa.Column('ocr_confidence', sa.Float(), nullable=True),
        sa.Column('vehicle_type', sa.String(length=50), nullable=True),
        sa.Column('vehicle_color', sa.String(length=50), nullable=True),
        sa.Column('speed_kmh', sa.Float(), nullable=True),
        sa.Column('direction', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('image_url', sa.String(length=255), nullable=True),
        sa.Column('crop_url', sa.String(length=255), nullable=True),
        sa.Column('is_simulated', sa.Boolean(), nullable=True),
        sa.Column('is_low_confidence', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_detections_camera_id'), 'vehicle_detections', ['camera_id'], unique=False)
    op.create_index(op.f('ix_vehicle_detections_id'), 'vehicle_detections', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_detections_normalized_plate_text'), 'vehicle_detections', ['normalized_plate_text'], unique=False)
    op.create_index(op.f('ix_vehicle_detections_timestamp'), 'vehicle_detections', ['timestamp'], unique=False)
    op.create_index(op.f('ix_vehicle_detections_vehicle_id'), 'vehicle_detections', ['vehicle_id'], unique=False)
    op.create_index('ix_detections_camera_time', 'vehicle_detections', ['camera_id', 'timestamp'], unique=False)
    op.create_index('ix_detections_plate_time', 'vehicle_detections', ['normalized_plate_text', 'timestamp'], unique=False)
    op.create_index('ix_detections_vehicle_time', 'vehicle_detections', ['vehicle_id', 'timestamp'], unique=False)

    # 10. vehicle_features
    op.create_table(
        'vehicle_features',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('detection_id', sa.Integer(), nullable=True),
        sa.Column('color_histogram', sa.JSON(), nullable=True),
        sa.Column('embedding_vector', sa.JSON(), nullable=True),
        sa.Column('feature_type', sa.String(length=50), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['detection_id'], ['vehicle_detections.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_features_id'), 'vehicle_features', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_features_vehicle_id'), 'vehicle_features', ['vehicle_id'], unique=False)

    # 11. trajectory_events
    op.create_table(
        'trajectory_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('detection_id', sa.Integer(), nullable=True),
        sa.Column('camera_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('speed_kmh', sa.Float(), nullable=True),
        sa.Column('distance_from_prev_km', sa.Float(), nullable=True),
        sa.Column('travel_time_sec', sa.Float(), nullable=True),
        sa.Column('implied_speed_kmh', sa.Float(), nullable=True),
        sa.Column('direction', sa.String(length=50), nullable=True),
        sa.Column('is_impossible_transition', sa.Boolean(), nullable=True),
        sa.Column('anomaly_flags', sa.JSON(), nullable=True),
        sa.Column('sequence_index', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ),
        sa.ForeignKeyConstraint(['detection_id'], ['vehicle_detections.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trajectory_events_camera_id'), 'trajectory_events', ['camera_id'], unique=False)
    op.create_index(op.f('ix_trajectory_events_id'), 'trajectory_events', ['id'], unique=False)
    op.create_index(op.f('ix_trajectory_events_timestamp'), 'trajectory_events', ['timestamp'], unique=False)
    op.create_index(op.f('ix_trajectory_events_vehicle_id'), 'trajectory_events', ['vehicle_id'], unique=False)
    op.create_index('ix_trajectory_camera_time', 'trajectory_events', ['camera_id', 'timestamp'], unique=False)
    op.create_index('ix_trajectory_vehicle_time', 'trajectory_events', ['vehicle_id', 'timestamp'], unique=False)

    # 12. alerts
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=True),
        sa.Column('detection_id', sa.Integer(), nullable=True),
        sa.Column('camera_id', sa.String(length=50), nullable=True),
        sa.Column('alert_type', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ),
        sa.ForeignKeyConstraint(['detection_id'], ['vehicle_detections.id'], ),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_camera_id'), 'alerts', ['camera_id'], unique=False)
    op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=False)
    op.create_index(op.f('ix_alerts_timestamp'), 'alerts', ['timestamp'], unique=False)
    op.create_index(op.f('ix_alerts_vehicle_id'), 'alerts', ['vehicle_id'], unique=False)
    op.create_index('ix_alerts_type_time', 'alerts', ['alert_type', 'timestamp'], unique=False)
    op.create_index('ix_alerts_vehicle_time', 'alerts', ['vehicle_id', 'timestamp'], unique=False)

    # 13. watchlists
    op.create_table(
        'watchlists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plate_number', sa.String(length=50), nullable=False),
        sa.Column('reason_category', sa.String(length=100), nullable=False),
        sa.Column('priority', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_watchlists_id'), 'watchlists', ['id'], unique=False)
    op.create_index(op.f('ix_watchlists_plate_number'), 'watchlists', ['plate_number'], unique=True)

    # 14. cases
    op.create_table(
        'cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_number', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('case_type', sa.String(length=100), nullable=True),
        sa.Column('subject_vehicle_id', sa.Integer(), nullable=True),
        sa.Column('subject_plate', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('assigned_investigator_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_investigator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['subject_vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cases_case_number'), 'cases', ['case_number'], unique=True)
    op.create_index(op.f('ix_cases_id'), 'cases', ['id'], unique=False)
    op.create_index(op.f('ix_cases_subject_plate'), 'cases', ['subject_plate'], unique=False)

    # 15. case_events
    op.create_table(
        'case_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('evidence_data', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_events_case_id'), 'case_events', ['case_id'], unique=False)
    op.create_index(op.f('ix_case_events_id'), 'case_events', ['id'], unique=False)

    # 16. traffic_metrics
    op.create_table(
        'traffic_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('road_id', sa.Integer(), nullable=True),
        sa.Column('camera_id', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('vehicle_count', sa.Integer(), nullable=True),
        sa.Column('avg_speed_kmh', sa.Float(), nullable=True),
        sa.Column('density_level', sa.String(length=50), nullable=True),
        sa.Column('occupancy_rate', sa.Float(), nullable=True),
        sa.Column('peak_hour_flag', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['camera_id'], ['cameras.id'], ),
        sa.ForeignKeyConstraint(['road_id'], ['roads.id'], ),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_traffic_metrics_id'), 'traffic_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_traffic_metrics_road_id'), 'traffic_metrics', ['road_id'], unique=False)
    op.create_index(op.f('ix_traffic_metrics_timestamp'), 'traffic_metrics', ['timestamp'], unique=False)
    op.create_index(op.f('ix_traffic_metrics_zone_id'), 'traffic_metrics', ['zone_id'], unique=False)
    op.create_index('ix_traffic_metrics_road_time', 'traffic_metrics', ['road_id', 'timestamp'], unique=False)
    op.create_index('ix_traffic_metrics_zone_time', 'traffic_metrics', ['zone_id', 'timestamp'], unique=False)

    # 17. traffic_flows
    op.create_table(
        'traffic_flows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('origin_camera_id', sa.String(length=50), nullable=False),
        sa.Column('dest_camera_id', sa.String(length=50), nullable=False),
        sa.Column('origin_zone_id', sa.Integer(), nullable=False),
        sa.Column('dest_zone_id', sa.Integer(), nullable=False),
        sa.Column('vehicle_count', sa.Integer(), nullable=True),
        sa.Column('avg_travel_time_sec', sa.Float(), nullable=True),
        sa.Column('avg_speed_kmh', sa.Float(), nullable=True),
        sa.Column('timestamp_window_start', sa.DateTime(), nullable=False),
        sa.Column('timestamp_window_end', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['dest_camera_id'], ['cameras.id'], ),
        sa.ForeignKeyConstraint(['dest_zone_id'], ['zones.id'], ),
        sa.ForeignKeyConstraint(['origin_camera_id'], ['cameras.id'], ),
        sa.ForeignKeyConstraint(['origin_zone_id'], ['zones.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_traffic_flows_dest_camera_id'), 'traffic_flows', ['dest_camera_id'], unique=False)
    op.create_index(op.f('ix_traffic_flows_id'), 'traffic_flows', ['id'], unique=False)
    op.create_index(op.f('ix_traffic_flows_origin_camera_id'), 'traffic_flows', ['origin_camera_id'], unique=False)
    op.create_index('ix_flows_origin_dest', 'traffic_flows', ['origin_camera_id', 'dest_camera_id'], unique=False)

    # 18. congestion_records
    op.create_table(
        'congestion_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('road_id', sa.Integer(), nullable=False),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=True),
        sa.Column('current_density', sa.Float(), nullable=True),
        sa.Column('predicted_density_15min', sa.Float(), nullable=True),
        sa.Column('predicted_density_30min', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=50), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('is_prototype_prediction', sa.Boolean(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['road_id'], ['roads.id'], ),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_congestion_records_id'), 'congestion_records', ['id'], unique=False)
    op.create_index(op.f('ix_congestion_records_road_id'), 'congestion_records', ['road_id'], unique=False)
    op.create_index(op.f('ix_congestion_records_timestamp'), 'congestion_records', ['timestamp'], unique=False)
    op.create_index(op.f('ix_congestion_records_zone_id'), 'congestion_records', ['zone_id'], unique=False)
    op.create_index('ix_congestion_road_time', 'congestion_records', ['road_id', 'timestamp'], unique=False)
    op.create_index('ix_congestion_zone_time', 'congestion_records', ['zone_id', 'timestamp'], unique=False)

    # 19. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_entity', sa.String(length=100), nullable=True),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('query_params', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_action_time', 'audit_logs', ['action', 'timestamp'], unique=False)
    op.create_index('ix_audit_user_time', 'audit_logs', ['user_id', 'timestamp'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('congestion_records')
    op.drop_table('traffic_flows')
    op.drop_table('traffic_metrics')
    op.drop_table('case_events')
    op.drop_table('cases')
    op.drop_table('watchlists')
    op.drop_table('alerts')
    op.drop_table('trajectory_events')
    op.drop_table('vehicle_features')
    op.drop_table('vehicle_detections')
    op.drop_table('plates')
    op.drop_table('vehicles')
    op.drop_table('camera_health')
    op.drop_table('cameras')
    op.drop_table('roads')
    op.drop_table('zones')
    op.drop_table('users')
    op.drop_table('roles')
