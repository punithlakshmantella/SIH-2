export type UserRole = 
  | "System Administrator"
  | "Traffic Police"
  | "Control Room Operator"
  | "Authorized Investigator"
  | "Traffic Analyst"
  | "Municipal/Smart City Authority";

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  badge_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export interface Camera {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  road_id?: number;
  zone_id: number;
  zone_name?: string;
  road_name?: string;
  direction: string;
  status: "online" | "warning" | "offline";
  fps: number;
  latency_ms: number;
  last_heartbeat?: string;
  ocr_accuracy: number;
  vehicles_per_min: number;
  is_simulation: boolean;
  created_at: string;
}

export interface Zone {
  id: number;
  name: string;
  code?: string;
  description?: string;
  risk_level: string;
  polygon_geojson?: any;
  camera_count: number;
  created_at: string;
}

export interface Road {
  id: number;
  name: string;
  zone_id: number;
  zone_name?: string;
  road_type: string;
  speed_limit_kmh: number;
  length_km: number;
  is_congested: boolean;
  camera_count: number;
  created_at: string;
}

export interface Detection {
  id: number;
  camera_id: string;
  camera_name?: string;
  zone_name?: string;
  vehicle_id?: number;
  raw_plate_text: string;
  normalized_plate_text: string;
  ocr_confidence: number;
  vehicle_type: string;
  vehicle_color: string;
  speed_kmh: number;
  direction: string;
  timestamp: string;
  image_url?: string;
  is_simulated: boolean;
  is_low_confidence: boolean;
}

export interface MajorFlow {
  id: number;
  origin_name: string;
  dest_name: string;
  origin_camera_id: string;
  dest_camera_id: string;
  origin_camera_name?: string;
  dest_camera_name?: string;
  vehicle_count: number;
  avg_speed_kmh: number;
  avg_travel_time_sec: number;
}

export interface RecentIncident {
  id: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  camera_id?: string;
  camera_name?: string;
  vehicle_plate?: string;
  timestamp: string;
  target_url: string;
  is_resolved: boolean;
}

export interface Alert {
  id: number;
  vehicle_id?: number;
  vehicle_plate?: string;
  detection_id?: number;
  camera_id?: string;
  camera_name?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  title: string;
  description?: string;
  confidence: number;
  timestamp: string;
  is_resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
}

export interface VehicleSummary {
  id: number;
  primary_plate: string;
  vehicle_type: string;
  make?: string;
  model?: string;
  color: string;
  first_seen_at?: string;
  last_seen_at?: string;
  last_camera_id?: string;
  last_camera_name?: string;
  last_zone_name?: string;
  total_detections: number;
  cameras_visited_count: number;
  total_distance_km: number;
  avg_speed_kmh: number;
  alert_count: number;
  is_flagged: boolean;
}

export interface TrajectoryPoint {
  sequence_index: number;
  detection_id?: number;
  camera_id: string;
  camera_name: string;
  zone_name: string;
  road_name?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed_kmh?: number | null;
  distance_from_prev_km?: number | null;
  travel_time_sec?: number | null;
  implied_speed_kmh?: number | null;
  direction: string;
  raw_plate_read?: string;
  ocr_confidence?: number;
  detection_confidence?: number;
  match_type?: 'DIRECT_VERIFIED' | 'OCR_ASSISTED_MATCH' | 'PROBABILISTIC_MATCH' | 'FLAGGED_IMPOSSIBLE' | string;
  validation_status?: 'FIRST_CHECKPOINT' | 'VERIFIED' | 'OCR_ASSISTED' | 'ANOMALOUS' | string;
  prev_camera_id?: string | null;
  prev_camera_name?: string | null;
  is_impossible_transition: boolean;
  is_low_confidence: boolean;
  anomaly_flags?: any;
}

export interface TrajectoryResponse {
  vehicle_id: number;
  primary_plate: string;
  vehicle_type: string;
  vehicle_color: string;
  total_points: number;
  verified_points_count?: number;
  degraded_points_count?: number;
  anomaly_points_count?: number;
  total_distance_km?: number | null;
  total_duration_minutes?: number | null;
  avg_speed_kmh?: number | null;
  max_speed_threshold_kmh?: number;
  first_seen_at?: string;
  last_seen_at?: string;
  points: TrajectoryPoint[];
  has_impossible_transitions: boolean;
  status_summary: string;
}

export interface CongestionData {
  heatmap_points: Array<{
    latitude: number;
    longitude: number;
    intensity: number;
    camera_id: string;
    camera_name: string;
    road_name: string;
    severity: string;
  }>;
  affected_corridors: Array<{
    road_id: number;
    road_name: string;
    zone_name: string;
    severity: string;
    current_density: number;
    speed_limit_kmh: number;
    duration_minutes: number;
  }>;
  city: string;
  timestamp: string;
}

export interface DashboardStats {
  cameras: {
    total: number;
    registered?: number;
    online: number;
    warning: number;
    offline: number;
    health_pct: number;
  };
  vehicles_detected_today: number;
  total_vehicles_registered: number;
  active_alerts: number;
  blacklist_matches: number;
  avg_speed_kmh: number;
  congested_roads: {
    congested: number;
    total: number;
  };
  major_flows?: MajorFlow[];
  recent_incidents?: RecentIncident[];
  recent_detections: Detection[];
  city: string;
  last_updated: string;
}

export interface SampleFootage {
  filename: string;
  title: string;
  condition: 'clean' | 'degraded' | 'dataset' | string;
  condition_badge: string;
  ground_truth: string;
  description: string;
  expected_behavior: string;
  url: string;
}

export interface CandidateCharacter {
  glyph_index: number;
  char: string;
  confidence: number;
}

export interface ANPRResult {
  raw_text: string;
  normalized_plate: string;
  confidence: number;
  is_low_confidence: boolean;
  confidence_label: string;
  vehicle_type: string;
  vehicle_color: string;
  bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
  preprocessing_applied: string[];
  execution_time_ms: number;
  source_type: string;
  detection_confidence: number;
  ocr_confidence: number;
  detection_time_ms: number;
  ocr_time_ms: number;
  ground_truth?: string;
  is_match?: boolean;
  format_valid: boolean;
  format_status: string;
  format_description: string;
  enhanced_image_base64?: string;
  plate_crop_base64?: string;
  original_image_base64?: string;
  candidate_characters?: CandidateCharacter[];
  model_info?: {
    detector: string;
    ocr_engine: string;
    device: string;
    inference_mode: string;
  };
}

