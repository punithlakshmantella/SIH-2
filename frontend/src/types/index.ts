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

export interface DashboardStats {
  cameras: {
    total: number;
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
  recent_detections: Detection[];
  city: string;
  last_updated: string;
}
