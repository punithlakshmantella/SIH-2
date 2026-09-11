import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { 
  Camera as CameraIcon, 
  Car, 
  Bell, 
  ShieldAlert, 
  Gauge, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  ArrowRight,
  RefreshCw, 
  Radio, 
  Activity,
  MapPin,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  AlertCircle,
  Search,
  FolderKanban,
  Video,
  FileText,
  Calendar,
  Layers,
  BarChart3,
  GitFork,
  UploadCloud,
  FileVideo,
  Route,
  X,
  Eye,
  ShieldCheck,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import { normalizeRole, AppRole } from '../utils/rbac';
import { DashboardStats, Camera as CameraType } from '../types';

// =========================================================================
// HELPER: Interactive Mini GIS Map
// =========================================================================
function MiniGISMap({ cameras }: { cameras: CameraType[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7290, 83.2850],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || cameras.length === 0) return;
    markersGroupRef.current.clearLayers();

    cameras.forEach((cam) => {
      const isOnline = cam.status === 'online';
      const isWarning = cam.status === 'warning';
      const markerColor = isOnline ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
      const glowColor = isOnline ? 'rgba(16, 185, 129, 0.4)' : isWarning ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';

      const customIcon = L.divIcon({
        className: 'city-vision-pin',
        html: `
          <div style="
            background: #0f172a;
            border: 2px solid ${markerColor};
            box-shadow: 0 0 10px ${glowColor};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: ${markerColor};"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; color: #0f172a; min-width: 150px;">
          <div style="font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 3px;">
            ${cam.name}
          </div>
          <div style="color: #64748b;">Node: <b>${cam.id}</b></div>
          <div style="color: #64748b;">Zone: <b>${cam.zone_name || 'Visakhapatnam'}</b></div>
          <div style="margin-top: 4px; font-weight: 700; color: ${markerColor}; text-transform: uppercase;">
            Status: ${cam.status}
          </div>
        </div>
      `);
      marker.addTo(markersGroupRef.current!);
    });
  }, [cameras]);

  return <div ref={mapContainerRef} className="w-full h-[320px] z-0" />;
}

// =========================================================================
// ROLE 1: TRAFFIC POLICE DASHBOARD
// Allowed modules only: Live Camera Status, Active Alerts, Vehicle Search, Current Traffic Status.
// NO analytics cards.
// =========================================================================
function TrafficPoliceDashboard({ 
  stats, 
  cameras, 
  navigate 
}: { 
  stats: DashboardStats | null; 
  cameras: CameraType[]; 
  navigate: (path: string) => void; 
}) {
  const [searchPlate, setSearchPlate] = useState('');

  const handleVehicleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim()) {
      navigate(`/vehicles?q=${encodeURIComponent(searchPlate.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Camera Status & Active Alerts KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Camera Status */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Live Camera Status</span>
            <CameraIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats ? `${stats.cameras.online} / ${stats.cameras.total}` : '--'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono font-bold">
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 font-mono">
              <span className="text-rose-500 font-semibold">{stats ? stats.cameras.offline : 0} Offline</span>
              <span> • </span>
              <span className="text-amber-500 font-semibold">{stats ? stats.cameras.warning : 0} Degraded</span>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Active Alerts</span>
            <Bell className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 font-mono">
              {stats ? stats.active_alerts : '--'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              Live traffic incidents & violations
            </div>
          </div>
        </div>

        {/* Detections Observed Today */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Vehicles Sighted</span>
            <Car className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats ? stats.vehicles_detected_today.toLocaleString() : '--'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              ANPR reads across active patrol sectors
            </div>
          </div>
        </div>

        {/* Current Corridor Condition */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Corridor Congestion</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-orange-600 font-mono">
              {stats ? `${stats.congested_roads.congested} / ${stats.congested_roads.total}` : '--'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              Major roads under heavy patrol load
            </div>
          </div>
        </div>
      </div>

      {/* 2. Vehicle Search Quick Action Bar */}
      <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-cyan-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Quick Vehicle Plate Search
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Field Officer Lookup</span>
        </div>

        <form onSubmit={handleVehicleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              placeholder="Enter license plate number (e.g. AP39AB1234)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-sm"
          >
            Search Vehicle
          </button>
        </form>
      </div>

      {/* 3. Current Traffic Status & Active Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Current Traffic Status Map */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                Current Traffic & Camera Status (Visakhapatnam)
              </h2>
            </div>
            <Link
              to="/live-map"
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1"
            >
              <span>Full Live Map</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200">
            <MiniGISMap cameras={cameras} />
          </div>
        </div>

        {/* Right: Active Field Alerts */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-rose-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Active Alerts & Incidents
                </h2>
              </div>
              <Link
                to="/alerts"
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto">
              {stats?.recent_incidents && stats.recent_incidents.length > 0 ? (
                stats.recent_incidents.map((incident) => (
                  <div
                    key={incident.id}
                    onClick={() => navigate('/alerts')}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/70 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {incident.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-mono font-bold uppercase">
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {incident.description}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between font-mono">
                      <span>Node: {incident.camera_name || incident.camera_id}</span>
                      <span>{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-mono">
                  No active traffic incidents flagged
                </div>
              )}
            </div>
          </div>

          <Link
            to="/alerts"
            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition flex items-center justify-center space-x-1.5"
          >
            <span>Open Active Alerts Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// ROLE 2: INVESTIGATOR DASHBOARD
// Allowed widgets: Suspect Vehicles, Recent Cases, Uploaded Videos, Watchlist Hits, Investigation Timeline.
// =========================================================================
interface VehicleModalData {
  plate: string;
  type: string;
  color: string;
  makeModel: string;
  owner: string;
  regStatus: string;
  statusBadge: string;
  lastSeen: string;
  currentLocation: string;
  cameras: string[];
  history: Array<{ time: string; camera: string; speed: string; notes?: string }>;
}

const VEHICLE_INTELLIGENCE_DB: Record<string, VehicleModalData> = {
  'AP39AB1234': {
    plate: 'AP39AB1234',
    type: 'Light Motor Vehicle (SUV / 4-Wheeler)',
    color: 'Pearl Arctic White',
    makeModel: 'Hyundai Creta SX (O) Diesel',
    owner: 'Vikramaditya Rao (UID: IND-AP-2024-8891)',
    regStatus: 'FLAGGED — Visakhapatnam CID Surveillance Directive',
    statusBadge: 'CRITICAL SUSPECT',
    lastSeen: 'Today at 09:55:00 AM',
    currentLocation: 'Siripuram Circle North ANPR (CAM-CTR-005)',
    cameras: [
      'CAM-RUR-001 • Sabbavaram Rural Outpost',
      'CAM-HWY-002 • NH16 South Highway Corridor',
      'CAM-TOL-003 • Aganampudi Toll Plaza',
      'CAM-CTR-005 • Siripuram Circle North ANPR'
    ],
    history: [
      { time: '09:15:00 AM', camera: 'CAM-RUR-001 (Sabbavaram Outpost)', speed: '62.0 km/h', notes: 'Verified direct ANPR match' },
      { time: '09:25:00 AM', camera: 'CAM-HWY-002 (NH16 South Corridor)', speed: '78.0 km/h', notes: 'Excess highway velocity advisory' },
      { time: '09:35:00 AM', camera: 'CAM-TOL-003 (Aganampudi Toll)', speed: '24.0 km/h', notes: 'Degraded OCR (AP39A?1234); Re-ID confirmed' },
      { time: '09:55:00 AM', camera: 'CAM-CTR-005 (Siripuram Circle)', speed: '48.0 km/h', notes: 'High-confidence sighting in commercial zone' },
    ]
  },
  'AP31TX9901': {
    plate: 'AP31TX9901',
    type: 'Light Motor Vehicle (Sedan)',
    color: 'Obsidian Black',
    makeModel: 'Honda City ZX VTEC',
    owner: 'K. S. Narayana (UID: IND-AP-2021-4410)',
    regStatus: 'STOLEN — FIR #412/2026 Two-Town Police Station',
    statusBadge: 'WANTED STOLEN',
    lastSeen: 'Today at 09:51:00 AM',
    currentLocation: 'Jagadamba Junction Cinema Road (CAM-JGD-003)',
    cameras: [
      'CAM-DVK-001 • Dwaraka Nagar 3rd Lane',
      'CAM-JGD-003 • Jagadamba Junction Cinema Road'
    ],
    history: [
      { time: '09:38:00 AM', camera: 'CAM-DVK-001 (Dwaraka Nagar)', speed: '35.0 km/h', notes: 'Initial sighting post-theft report' },
      { time: '09:51:00 AM', camera: 'CAM-JGD-003 (Jagadamba Junction)', speed: '42.0 km/h', notes: 'Intersection turn confirmed' },
    ]
  },
  'TS09UB4432': {
    plate: 'TS09UB4432',
    type: 'Commercial Light Goods Carrier',
    color: 'Silver Grey',
    makeModel: 'Mahindra Bolero Maxi Truck',
    owner: 'Sri Balaji Roadlines Logistics Co.',
    regStatus: 'IMPAIRED / HABITUAL SPEED VIOLATOR',
    statusBadge: 'TRAFFIC FLAGGED',
    lastSeen: 'Today at 09:43:00 AM',
    currentLocation: 'Beach Road Coastal Promenade (CAM-BCH-007)',
    cameras: [
      'CAM-BCH-007 • Beach Road Coastal Promenade',
      'CAM-RK-009 • RK Beach Submarine Museum'
    ],
    history: [
      { time: '09:43:00 AM', camera: 'CAM-BCH-007 (Beach Road)', speed: '84.0 km/h', notes: '44 km/h over coastal speed limit' },
    ]
  },
  'AP31DC0086': {
    plate: 'AP31DC0086',
    type: 'Commercial Multi-Axle Bus / Heavy Passenger',
    color: 'Dark Royal Blue',
    makeModel: 'Ashok Leyland Falcon Intercity',
    owner: 'Vizag Coastal Charters Private Ltd',
    regStatus: 'UNREGISTERED / EXPIRED FITNESS PERMIT',
    statusBadge: 'REGISTRATION EXPIRED',
    lastSeen: 'Today at 09:27:00 AM',
    currentLocation: 'Maddilapalem Bus Station ANPR (CAM-MVD-002)',
    cameras: [
      'CAM-MVD-002 • Maddilapalem Bus Station ANPR'
    ],
    history: [
      { time: '09:27:00 AM', camera: 'CAM-MVD-002 (Maddilapalem Bus Station)', speed: '28.0 km/h', notes: 'Automatic commercial permit violation triggered' },
    ]
  }
};

function InvestigatorDashboard({ 
  stats, 
  navigate 
}: { 
  stats: DashboardStats | null; 
  navigate: (path: string) => void; 
}) {
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleModalData | null>(null);
  const [unreadBadgeCount, setUnreadBadgeCount] = useState(2);

  // Live investigation alerts state (newest on top)
  const [liveAlerts, setLiveAlerts] = useState([
    {
      id: 'ALT-VSP-901',
      plate: 'AP39AB1234',
      time: 'Just now (09:55 AM)',
      cameraName: 'CAM-CTR-005',
      cameraDesc: 'Siripuram Circle North ANPR',
      location: 'Siripuram, Visakhapatnam',
      confidence: 98.6,
      alertType: 'WANTED ACCUSED',
      severity: 'critical'
    },
    {
      id: 'ALT-VSP-902',
      plate: 'AP31TX9901',
      time: '4 mins ago (09:51 AM)',
      cameraName: 'CAM-JGD-003',
      cameraDesc: 'Jagadamba Junction Cinema Road',
      location: 'Jagadamba, Visakhapatnam',
      confidence: 96.2,
      alertType: 'STOLEN VEHICLE',
      severity: 'high'
    },
    {
      id: 'ALT-VSP-903',
      plate: 'TS09UB4432',
      time: '12 mins ago (09:43 AM)',
      cameraName: 'CAM-BCH-007',
      cameraDesc: 'Beach Road Coastal Promenade',
      location: 'RK Beach, Visakhapatnam',
      confidence: 94.8,
      alertType: 'SPEED VIOLATOR',
      severity: 'medium'
    },
    {
      id: 'ALT-VSP-904',
      plate: 'AP31DC0086',
      time: '28 mins ago (09:27 AM)',
      cameraName: 'CAM-MVD-002',
      cameraDesc: 'Maddilapalem Bus Station ANPR',
      location: 'Maddilapalem, Visakhapatnam',
      confidence: 97.4,
      alertType: 'UNREGISTERED',
      severity: 'high'
    }
  ]);

  // Automated Watchlist detection creator
  const triggerWatchlistDetection = useCallback((customPlate?: string) => {
    const candidatePlates = ['AP39AB1234', 'AP31TX9901', 'TS09UB4432', 'AP31DC0086', 'KA03MN4321'];
    const selectedPlate = customPlate || candidatePlates[Math.floor(Math.random() * candidatePlates.length)];
    const camerasPool = [
      { name: 'CAM-CTR-005', desc: 'Siripuram Circle North ANPR', loc: 'Siripuram, Visakhapatnam' },
      { name: 'CAM-HWY-002', desc: 'NH16 South Highway Corridor', loc: 'Gajuwaka Corridor, Visakhapatnam' },
      { name: 'CAM-TOL-003', desc: 'Aganampudi Toll Plaza Gate 02', loc: 'Aganampudi, Visakhapatnam' },
      { name: 'CAM-BCH-007', desc: 'Beach Road Coastal Promenade', loc: 'RK Beach, Visakhapatnam' },
    ];
    const cam = camerasPool[Math.floor(Math.random() * camerasPool.length)];

    const newAlert = {
      id: `ALT-VSP-${Date.now()}`,
      plate: selectedPlate,
      time: `Just now (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      cameraName: cam.name,
      cameraDesc: cam.desc,
      location: cam.loc,
      confidence: +(97.5 + Math.random() * 2).toFixed(1),
      alertType: 'WATCHLIST HIT',
      severity: 'critical' as const
    };

    setLiveAlerts((prev) => [newAlert, ...prev]);
    setUnreadBadgeCount((count) => count + 1);
  }, []);

  // Listen for real-time watchlist detection events
  useEffect(() => {
    const handleWatchlistEvent = (e: any) => {
      const plate = e.detail?.plate;
      triggerWatchlistDetection(plate);
    };
    window.addEventListener('watchlist-vehicle-detected', handleWatchlistEvent);
    return () => window.removeEventListener('watchlist-vehicle-detected', handleWatchlistEvent);
  }, [triggerWatchlistDetection]);

  useEffect(() => {
    api.get<any[]>('/cases')
      .then((res) => setCases(res || []))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false));
  }, []);

  // Update live alerts if fresh incidents arrive from server/websocket
  useEffect(() => {
    if (stats?.recent_incidents && stats.recent_incidents.length > 0) {
      const incoming = stats.recent_incidents.map((inc, idx) => ({
        id: `INC-${inc.id || idx}`,
        plate: inc.vehicle_plate || 'AP39AB1234',
        time: 'Just now',
        cameraName: inc.camera_name || 'CAM-CTR-005',
        cameraDesc: inc.camera_name || 'City Surveillance ANPR',
        location: 'Visakhapatnam Metropolitan Area',
        confidence: 97.8,
        alertType: (inc.alert_type || 'WATCHLIST HIT').toUpperCase().replace('_', ' '),
        severity: inc.severity || 'high'
      }));

      setLiveAlerts((prev) => {
        const existingIds = new Set(prev.map(p => p.plate + p.time));
        const newItems = incoming.filter(i => !existingIds.has(i.plate + i.time));
        if (newItems.length > 0) {
          setUnreadBadgeCount((prevCount) => prevCount + newItems.length);
        }
        return [...newItems, ...prev];
      });
    }
  }, [stats?.recent_incidents]);

  const openVehicleModal = (plate: string) => {
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase();
    const data = VEHICLE_INTELLIGENCE_DB[cleanPlate] || {
      plate: cleanPlate,
      type: 'Light Motor Vehicle (Sedan / Hatchback)',
      color: 'Standard Metallic',
      makeModel: 'Registered Civilian Vehicle',
      owner: 'State Vehicle Registry Entity (AP RTO)',
      regStatus: 'Active Registration — Police Flagged Subject',
      statusBadge: 'INVESTIGATION TARGET',
      lastSeen: 'Today at 09:55:00 AM',
      currentLocation: 'Siripuram Circle North ANPR',
      cameras: ['CAM-CTR-005 • Siripuram Circle North ANPR', 'CAM-HWY-002 • NH16 South Highway Corridor'],
      history: [
        { time: '09:55:00 AM', camera: 'CAM-CTR-005 (Siripuram)', speed: '48.0 km/h', notes: 'Direct ANPR OCR observation' },
        { time: '09:25:00 AM', camera: 'CAM-HWY-002 (NH16 Corridor)', speed: '72.0 km/h', notes: 'Corridor passage match' }
      ]
    };
    setSelectedVehicle(data);
  };

  const suspectVehicles = [
    { plate: 'AP39AB1234', reason: 'Active Criminal Dossier (Case #BEL-2026-0914)', lastSeen: 'Siripuram Circle North ANPR', status: 'TRACKING' },
    { plate: 'AP31TX9901', reason: 'Reported Stolen White Hyundai Creta', lastSeen: 'Jagadamba Junction Cinema Road', status: 'WANTED' },
    { plate: 'TS09UB4432', reason: 'High-Speed Impaired Sighting', lastSeen: 'Beach Road Coastal Promenade', status: 'FLAGGED' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Investigation KPI Summary (All 5 Cards Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Recent Cases → Investigation Cases */}
        <div 
          onClick={() => navigate('/investigations')}
          className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-cyan-500/60 hover:shadow-md transition-all duration-200 group"
          title="Recent Cases → Investigation Cases"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Recent Cases</span>
            <div className="flex items-center space-x-1">
              <FolderKanban className="w-4 h-4 text-cyan-600" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-600 transition" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono group-hover:text-cyan-600 transition">
              {cases.length > 0 ? cases.length : '1'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Active dossiers</span>
              <span className="text-cyan-600 font-bold opacity-0 group-hover:opacity-100 transition">Investigation Cases &rarr;</span>
            </div>
          </div>
        </div>

        {/* Watchlist Hits → Watchlist */}
        <div 
          onClick={() => navigate('/watchlist')}
          className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-500/60 hover:shadow-md transition-all duration-200 group"
          title="Watchlist Hits → Watchlist"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Watchlist Hits</span>
            <div className="flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 transition" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 font-mono">
              {stats ? stats.blacklist_matches : '2'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Confirmed hotlist hits</span>
              <span className="text-amber-600 font-bold opacity-0 group-hover:opacity-100 transition">Watchlist &rarr;</span>
            </div>
          </div>
        </div>

        {/* Suspect Vehicles → Vehicle Search */}
        <div 
          onClick={() => navigate('/vehicles')}
          className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-500/60 hover:shadow-md transition-all duration-200 group"
          title="Suspect Vehicles → Vehicle Search"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Suspect Vehicles</span>
            <div className="flex items-center space-x-1">
              <Car className="w-4 h-4 text-rose-500" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-500 transition" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 font-mono">
              3 Flagged
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Target entities tracking</span>
              <span className="text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition">Vehicle Search &rarr;</span>
            </div>
          </div>
        </div>

        {/* Uploaded Videos → Video Ingestion */}
        <div 
          onClick={() => navigate('/video-ingestion')}
          className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500/60 hover:shadow-md transition-all duration-200 group"
          title="Uploaded Videos → Video Ingestion"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Uploaded Videos</span>
            <div className="flex items-center space-x-1">
              <Video className="w-4 h-4 text-blue-500" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-600 font-mono">
              2 Footage
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Corridor footage processed</span>
              <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">Video Ingestion &rarr;</span>
            </div>
          </div>
        </div>

        {/* Vehicle Route → Vehicle Route Tracking */}
        <div 
          onClick={() => navigate('/trajectory')}
          className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-purple-500/60 hover:shadow-md transition-all duration-200 group"
          title="Vehicle Route → Vehicle Route Tracking"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Vehicle Route</span>
            <div className="flex items-center space-x-1">
              <Route className="w-4 h-4 text-purple-500" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-500 transition" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-600 font-mono">
              5 Hits
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>AP39AB1234 active route</span>
              <span className="text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition">Route Tracking &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Investigation Pipeline Stepper */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-600"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              Investigation Command Workflow Pipeline
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Vehicle Search &rarr; Vehicle Details &rarr; Route Tracking &rarr; Video Evidence &rarr; Case File &rarr; Export Report
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Step 1: Vehicle Search */}
          <button
            onClick={() => navigate('/vehicles')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-cyan-50/80 border border-slate-200 hover:border-cyan-300 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 group-hover:bg-cyan-200 group-hover:text-cyan-900 transition">
                01
              </span>
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 transition" />
            </div>
            <div className="mt-2 font-bold text-xs text-slate-800 group-hover:text-cyan-900 transition">
              Vehicle Search
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Query plate, make & color
            </div>
          </button>

          {/* Step 2: Vehicle Details */}
          <button
            onClick={() => openVehicleModal('AP39AB1234')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-cyan-50/80 border border-slate-200 hover:border-cyan-300 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 group-hover:bg-cyan-200 group-hover:text-cyan-900 transition">
                02
              </span>
              <Car className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 transition" />
            </div>
            <div className="mt-2 font-bold text-xs text-slate-800 group-hover:text-cyan-900 transition">
              Vehicle Details
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Inspect identity & specs
            </div>
          </button>

          {/* Step 3: Vehicle Route Tracking */}
          <button
            onClick={() => navigate('/trajectory?plate=AP39AB1234')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/80 border border-slate-200 hover:border-purple-300 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 group-hover:bg-purple-200 group-hover:text-purple-900 transition">
                03
              </span>
              <Route className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
            </div>
            <div className="mt-2 font-bold text-xs text-slate-800 group-hover:text-purple-900 transition">
              Vehicle Route Tracking
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Corridor hops & replay
            </div>
          </button>

          {/* Step 4: Video Evidence */}
          <button
            onClick={() => navigate('/video-ingestion')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 group-hover:bg-blue-200 group-hover:text-blue-900 transition">
                04
              </span>
              <Video className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
            <div className="mt-2 font-bold text-xs text-slate-800 group-hover:text-blue-900 transition">
              Video Evidence
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              CCTV MP4 ingestion
            </div>
          </button>

          {/* Step 5: Investigation Case */}
          <button
            onClick={() => navigate('/investigations')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 group-hover:bg-indigo-200 group-hover:text-indigo-900 transition">
                05
              </span>
              <FolderKanban className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
            </div>
            <div className="mt-2 font-bold text-xs text-slate-800 group-hover:text-indigo-900 transition">
              Investigation Case
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Maintain legal chain
            </div>
          </button>

          {/* Step 6: Generate PDF Report */}
          <button
            onClick={() => navigate('/investigations/CAS-VSP-2026-0914')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 group-hover:bg-emerald-200 group-hover:text-emerald-900 transition">
                06
              </span>
              <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
            </div>
            <div className="mt-2 font-bold text-xs text-slate-800 group-hover:text-emerald-900 transition">
              Generate PDF Report
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Export CID PDF dossier
            </div>
          </button>
        </div>
      </div>

      {/* 3. NEW WIDGET: LIVE INVESTIGATION ALERTS (Newest Always On Top) */}
      <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  LIVE INVESTIGATION ALERTS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-mono font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block mr-1"></span>
                  <span>LIVE FEED</span>
                </span>
                {unreadBadgeCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center space-x-1 shadow-sm animate-pulse">
                    <Bell className="w-2.5 h-2.5 inline-block mr-0.5" />
                    <span>+{unreadBadgeCount} NEW ALERTS</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Real-time ANPR sightings, hotlist triggers & route anomalies • Newest alert always appears at top
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => triggerWatchlistDetection()}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold flex items-center space-x-1 transition shadow-sm"
              title="Test real-time automatic alert generation when a watchlist vehicle is detected"
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>Simulate Watchlist Hit</span>
            </button>
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono font-bold">
              {liveAlerts.length} Active Alerts
            </span>
            <button
              onClick={() => navigate('/watchlist')}
              className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1"
            >
              <span>Watchlist & Hotlist</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Live Alerts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {liveAlerts.map((alert) => (
            <div 
              key={alert.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between space-y-3"
            >
              {/* Alert Header: Plate Badge & Alert Type */}
              <div className="flex items-start justify-between gap-2">
                {/* Indian HSRP Plate Graphic */}
                <div 
                  onClick={() => openVehicleModal(alert.plate)}
                  className="inline-flex items-center rounded border border-slate-800 bg-white overflow-hidden shadow-sm cursor-pointer hover:border-cyan-600 transition"
                  title="Click to view vehicle dossier"
                >
                  <div className="bg-[#002B7F] px-1 py-1 flex flex-col items-center justify-center text-[7px] text-white font-bold leading-none select-none">
                    <span className="text-[6px] tracking-tighter">IND</span>
                    <span className="text-[5px] opacity-80 mt-0.5">🇮🇳</span>
                  </div>
                  <div className="px-2 py-0.5 font-mono font-black text-xs text-slate-900 tracking-wider">
                    {alert.plate}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                    alert.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : alert.severity === 'high'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-purple-100 text-purple-800 border border-purple-300'
                  }`}>
                    {alert.alertType}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {alert.time}
                  </span>
                </div>
              </div>

              {/* Alert Meta Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 block uppercase font-bold">Camera</span>
                  <span className="font-bold text-slate-800 truncate block text-[11px]">
                    {alert.cameraDesc}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block uppercase font-bold">Location</span>
                  <span className="font-medium text-slate-700 truncate block text-[11px]">
                    {alert.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                <span className="font-mono text-emerald-700 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>{alert.confidence}% Confidence</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">{alert.cameraName}</span>
              </div>

              {/* Action Buttons: Open Vehicle, View Route, Open Investigation */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => openVehicleModal(alert.plate)}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Eye className="w-3 h-3 text-slate-500" />
                  <span>Open Vehicle</span>
                </button>

                <button
                  onClick={() => navigate(`/trajectory?plate=${alert.plate}`)}
                  className="py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold transition flex items-center justify-center space-x-1"
                >
                  <Route className="w-3 h-3 text-purple-600" />
                  <span>View Route</span>
                </button>

                <button
                  onClick={() => navigate(`/investigations?plate=${alert.plate}`)}
                  className="py-1.5 px-2 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-bold transition flex items-center justify-center space-x-1"
                >
                  <FolderKanban className="w-3 h-3 text-cyan-600" />
                  <span>Open Investigation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Grid: Suspect Vehicles & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suspect Vehicles Widget */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-rose-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Suspect Vehicles
                </h2>
              </div>
              <Link to="/vehicles" className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1">
                <span>Vehicle Search</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {suspectVehicles.map((v, i) => (
                <div 
                  key={i}
                  onClick={() => openVehicleModal(v.plate)}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/80 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-cyan-700">{v.plate}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-mono font-bold">
                        {v.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{v.reason}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">Last seen: {v.lastSeen}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-cyan-600 font-bold shrink-0">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/vehicles"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <span>Search Full Vehicle Intelligence Database</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
          </Link>
        </div>

        {/* Recent Cases Widget */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Recent Cases
                </h2>
              </div>
              <Link to="/investigations" className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1">
                <span>All Cases</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {cases.length > 0 ? (
                cases.slice(0, 3).map((c) => (
                  <div 
                    key={c.id}
                    onClick={() => navigate(`/investigations/${c.case_number}`)}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/80 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-900">{c.case_number}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-mono font-bold">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-0.5 font-medium">{c.title}</p>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        Subject Plate: <span className="font-bold text-slate-700">{c.subject_plate}</span> • Evidence: {c.evidence_count} items
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))
              ) : (
                <div 
                  onClick={() => navigate('/investigations')}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-900">CAS-VSP-2026-0914</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">OPEN</span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5">Operation Coastal Vigilance: Subject AP39AB1234</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Assigned: CID Special Crime Wing</span>
                </div>
              )}
            </div>
          </div>

          <Link
            to="/investigations"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <span>Open Case Management Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
          </Link>
        </div>
      </div>

      {/* 5. Grid: Uploaded Videos & Investigation Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uploaded Videos Widget */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Uploaded Videos & Tracking
                </h2>
              </div>
              <Link to="/video-ingestion" className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1">
                <span>Upload Footage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">cctv_corridor_highway_1.mp4</span>
                    <div className="text-[10px] text-slate-400 font-mono">Camera: CAM-HWY-002 • 1080p @ 30 FPS</div>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                  PROCESSED
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">cctv_corridor_highway_2.mp4</span>
                    <div className="text-[10px] text-slate-400 font-mono">Camera: CAM-TOL-003 • 720p Degraded Feed</div>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                  PROCESSED
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/video-ingestion"
            className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition flex items-center justify-center space-x-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Ingest & Process New CCTV Video</span>
          </Link>
        </div>

        {/* Investigation Timeline Widget */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Vehicle Route Tracking (Subject AP39AB1234)
                </h2>
              </div>
              <Link to="/trajectory" className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1">
                <span>Route Tracking</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-start space-x-3 pl-1 relative before:absolute before:left-2.5 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-200">
                <div className="w-3 h-3 rounded-full bg-cyan-500 ring-2 ring-white shrink-0 mt-1"></div>
                <div className="min-w-0 pb-2">
                  <div className="font-bold text-slate-800 text-xs">Sabbavaram Rural Outpost (CAM-RUR-001)</div>
                  <div className="text-[10px] text-slate-400 font-mono">09:15:00 • 62.0 km/h • Verified Direct Match</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 pl-1 relative before:absolute before:left-2.5 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-200">
                <div className="w-3 h-3 rounded-full bg-cyan-500 ring-2 ring-white shrink-0 mt-1"></div>
                <div className="min-w-0 pb-2">
                  <div className="font-bold text-slate-800 text-xs">NH16 South Highway Corridor (CAM-HWY-002)</div>
                  <div className="text-[10px] text-slate-400 font-mono">09:25:00 • 78.0 km/h • Verified Direct Match</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 pl-1 relative before:absolute before:left-2.5 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-200">
                <div className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white shrink-0 mt-1"></div>
                <div className="min-w-0 pb-2">
                  <div className="font-bold text-slate-800 text-xs">Aganampudi Toll Plaza (CAM-TOL-003)</div>
                  <div className="text-[10px] text-amber-600 font-mono font-bold">09:35:00 • Degraded Read (AP39A?1234) • Re-ID Confirmed</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 pl-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white shrink-0 mt-1"></div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-xs">Siripuram Circle North ANPR (CAM-CTR-005)</div>
                  <div className="text-[10px] text-slate-400 font-mono">09:55:00 • 48.0 km/h • High Confidence Sighting</div>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/trajectory"
            className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition flex items-center justify-center space-x-1.5"
          >
            <span>Open Interactive Vehicle Route Tracking</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 6. VEHICLE DETAILS DRAWER / MODAL */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Indian HSRP Plate Graphic */}
                <div className="inline-flex items-center rounded-md border-2 border-slate-800 bg-white overflow-hidden shadow-sm">
                  <div className="bg-[#002B7F] px-1.5 py-1.5 flex flex-col items-center justify-center text-[8px] text-white font-bold leading-none select-none">
                    <span className="text-[7px] tracking-tighter">IND</span>
                    <span className="text-[6px] opacity-90 mt-0.5">🇮🇳</span>
                  </div>
                  <div className="px-3 py-1 font-mono font-black text-base text-slate-900 tracking-wider">
                    {selectedVehicle.plate}
                  </div>
                </div>

                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    {selectedVehicle.statusBadge}
                  </span>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Visakhapatnam Law Enforcement Intelligence Dossier
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Primary Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-600 uppercase font-bold block">Vehicle Type</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedVehicle.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase font-bold block">Make & Model</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedVehicle.makeModel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase font-bold block">Color</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedVehicle.color}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase font-bold block">Registered Owner</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedVehicle.owner}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-600 uppercase font-bold block">Registration Status</span>
                  <span className="font-bold text-rose-700 mt-0.5 block">{selectedVehicle.regStatus}</span>
                </div>
              </div>

              {/* Location & Last Seen Banner */}
              <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-cyan-800 uppercase font-bold tracking-wide">Last Known Location & Sighting</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">
                    {selectedVehicle.currentLocation}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Recorded: {selectedVehicle.lastSeen}
                  </div>
                </div>
              </div>

              {/* Cameras Observed List */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono block mb-2">
                  Surveillance Corridor Cameras ({selectedVehicle.cameras.length} nodes)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedVehicle.cameras.map((cam, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono flex items-center space-x-2">
                      <CameraIcon className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className="truncate">{cam}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detection History Timeline */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono block mb-2">
                  Temporal Detection History
                </span>
                <div className="space-y-2 border-l-2 border-cyan-500 ml-2 pl-3">
                  {selectedVehicle.history.map((h, i) => (
                    <div key={i} className="relative pb-2">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-600 ring-2 ring-white"></div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{h.camera}</span>
                        <span className="text-[10px] font-mono text-slate-500">{h.time}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center space-x-2 mt-0.5">
                        <span className="font-mono font-semibold text-cyan-700">{h.speed}</span>
                        <span>•</span>
                        <span>{h.notes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer with 3 Required Action Buttons */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const p = selectedVehicle.plate;
                  setSelectedVehicle(null);
                  navigate(`/trajectory?plate=${p}`);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Route className="w-3.5 h-3.5" />
                <span>View Route</span>
              </button>

              <button
                onClick={() => {
                  setSelectedVehicle(null);
                  navigate('/video-ingestion');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Open Video</span>
              </button>

              <button
                onClick={() => {
                  const p = selectedVehicle.plate;
                  setSelectedVehicle(null);
                  navigate(`/investigations?plate=${p}`);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/20"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Generate Investigation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// ROLE 3: TRAFFIC ANALYST DASHBOARD
// Allowed widgets: Vehicle Volume, Peak Hours, Congestion, Average Speed, Monthly Reports, Heatmap.
// =========================================================================
function TrafficAnalystDashboard({ 
  stats, 
  navigate 
}: { 
  stats: DashboardStats | null; 
  navigate: (path: string) => void; 
}) {
  return (
    <div className="space-y-6">
      {/* 1. Core Traffic Planning KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vehicle Volume */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Vehicle Volume</span>
            <BarChart3 className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats ? stats.vehicles_detected_today.toLocaleString() : '1,540'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Corridor aggregate count today
            </div>
          </div>
        </div>

        {/* Peak Hours Index */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Peak Hours</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 font-mono">
              08:00 – 11:00
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Evening Peak: 17:00 – 20:00
            </div>
          </div>
        </div>

        {/* Congestion Corridors */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Congestion</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-orange-600 font-mono">
              {stats ? `${stats.congested_roads.congested} / ${stats.congested_roads.total}` : '3 / 11'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              High-occupancy choke points
            </div>
          </div>
        </div>

        {/* Average Speed */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Average Speed</span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {stats ? `${stats.avg_speed_kmh} km/h` : '48.2 km/h'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Arterial road velocity
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid: Congestion Heatmap & Major OD Flows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap & Corridor Congestion Widget */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Congestion Heatmap & Hotspots
                </h2>
              </div>
              <Link to="/congestion" className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1">
                <span>View Heatmap</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">BRTS Expressway Corridor</div>
                  <div className="text-[10px] text-slate-500 font-mono">Zone: Maddilapalem • Density: 78%</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500 text-white font-mono font-bold">
                  HIGH DELAY
                </span>
              </div>

              <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">NAD Multi-Level Junction Ring</div>
                  <div className="text-[10px] text-slate-500 font-mono">Zone: NAD Junction • Density: 74%</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500 text-white font-mono font-bold">
                  HIGH DELAY
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">NH16 South Arterial</div>
                  <div className="text-[10px] text-slate-500 font-mono">Zone: Gajuwaka • Density: 58%</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white font-mono font-bold">
                  MODERATE
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/congestion"
            className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition flex items-center justify-center space-x-1.5"
          >
            <span>Explore Spatial Congestion Heatmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Origin-Destination (OD) Flow Widget */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <GitFork className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Origin-Destination Flows
                </h2>
              </div>
              <Link to="/traffic-flow" className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1">
                <span>OD Matrix</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {stats?.major_flows && stats.major_flows.length > 0 ? (
                stats.major_flows.slice(0, 3).map((flow, idx) => (
                  <div
                    key={flow.id || idx}
                    onClick={() => navigate('/traffic-flow')}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/80 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {flow.origin_name} <span className="text-cyan-600">→</span> {flow.dest_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Avg speed: {flow.avg_speed_kmh} km/h • {Math.round(flow.avg_travel_time_sec / 60)} min travel time
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-cyan-700">
                        {flow.vehicle_count.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase font-mono">vehicles</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  Loading OD flow data...
                </div>
              )}
            </div>
          </div>

          <Link
            to="/traffic-flow"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <span>View Full Origin-Destination Analytics</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
          </Link>
        </div>
      </div>

      {/* 3. Monthly Reports Widget */}
      <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Monthly Mobility & Traffic Planning Reports
            </h2>
          </div>
          <Link to="/reports" className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1">
            <span>All Reports</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800">Visakhapatnam Corridor Volume Report</div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">Format: CSV / PDF Export</div>
            <Link to="/reports" className="text-[10px] font-bold text-cyan-600 hover:underline mt-2 inline-block">
              Generate Report →
            </Link>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800">Peak Hour Congestion & Delay Audit</div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">Format: CSV / PDF Export</div>
            <Link to="/reports" className="text-[10px] font-bold text-cyan-600 hover:underline mt-2 inline-block">
              Generate Report →
            </Link>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800">Road Safety & Speed Compliance Summary</div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">Format: CSV / PDF Export</div>
            <Link to="/reports" className="text-[10px] font-bold text-cyan-600 hover:underline mt-2 inline-block">
              Generate Report →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// ROLE 4: ADMINISTRATOR DASHBOARD
// Complete unrestricted command center overview
// =========================================================================
function AdministratorDashboard({ 
  stats, 
  cameras, 
  navigate 
}: { 
  stats: DashboardStats | null; 
  cameras: CameraType[]; 
  navigate: (path: string) => void; 
}) {
  return (
    <div className="space-y-6">
      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Camera Network */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Camera Network</span>
            <CameraIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats ? `${stats.cameras.online} / ${stats.cameras.total}` : '--'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                ONLINE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              {stats ? stats.cameras.total : 0} nodes registered
            </div>
          </div>
        </div>

        {/* Detections Stream */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Detections Today</span>
            <Car className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats ? stats.vehicles_detected_today.toLocaleString() : '--'}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5">
              Vehicle/ANPR detections
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Active Alerts</span>
            <Bell className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 font-mono">
              {stats ? stats.active_alerts : '--'}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5">
              Events requiring action
            </div>
          </div>
        </div>

        {/* Watchlist Matches */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Watchlist Matches</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 font-mono">
              {stats ? stats.blacklist_matches : '--'}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5">
              Authorized hotlist targets
            </div>
          </div>
        </div>

        {/* Avg Flow Speed */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Avg Flow Speed</span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {stats ? `${stats.avg_speed_kmh} km/h` : '--'}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5">
              Arterial corridors
            </div>
          </div>
        </div>

        {/* Congested Roads */}
        <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase text-slate-700">Congested Roads</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-orange-600 font-mono">
              {stats ? `${stats.congested_roads.congested} / ${stats.congested_roads.total}` : '--'}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5">
              High density links
            </div>
          </div>
        </div>
      </div>

      {/* Live GIS Map Section */}
      <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-cyan-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Live City Situation (GIS Map)
            </h2>
          </div>
          <Link
            to="/live-map"
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-sm"
          >
            <span>Open Full GIS Map</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <MiniGISMap cameras={cameras} />
        </div>
      </div>

      {/* Two Column Grid: Major Flows & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Major Traffic Flows */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Major Traffic Flows
                </h2>
              </div>
              <Link to="/traffic-flow" className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center space-x-1">
                <span>View OD Analytics</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {stats?.major_flows && stats.major_flows.length > 0 ? (
                stats.major_flows.slice(0, 4).map((flow, index) => (
                  <div
                    key={flow.id || index}
                    onClick={() => navigate('/traffic-flow')}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/80 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {flow.origin_name} <span className="text-cyan-600">→</span> {flow.dest_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Avg speed: {flow.avg_speed_kmh} km/h • {Math.round(flow.avg_travel_time_sec / 60)} min travel time
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-cyan-700">
                        {flow.vehicle_count.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase font-mono">vehicles</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">Loading flow data...</div>
              )}
            </div>
          </div>

          <Link
            to="/traffic-flow"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <span>Explore Origin-Destination Flow Matrix</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
          </Link>
        </div>

        {/* Recent Incidents */}
        <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-rose-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Recent Incidents
                </h2>
              </div>
              <Link to="/alerts" className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1">
                <span>View All Alerts</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {stats?.recent_incidents && stats.recent_incidents.length > 0 ? (
                stats.recent_incidents.slice(0, 4).map((incident) => (
                  <div
                    key={incident.id}
                    onClick={() => navigate('/alerts')}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/80 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {incident.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-mono font-bold uppercase">
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {incident.description}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center justify-between">
                      <span>Node: {incident.camera_name || incident.camera_id}</span>
                      <span>{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">No active incidents flagged</div>
              )}
            </div>
          </div>

          <Link
            to="/alerts"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <span>Open Surveillance Incident Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
          </Link>
        </div>
      </div>

      {/* Real-time ANPR Ingestion Table */}
      <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Live Real-Time ANPR Ingestion Stream
            </h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono flex items-center space-x-1 font-bold">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
            <span>WEBSOCKET PUSH</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Plate Number</th>
                <th className="py-2.5 px-3">Camera Node</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Type & Color</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">OCR Conf</th>
                <th className="py-2.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {stats?.recent_detections && stats.recent_detections.length > 0 ? (
                stats.recent_detections.slice(0, 6).map((det) => (
                  <tr key={det.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-700">
                      <Link to={`/vehicles/${det.normalized_plate_text}`} className="hover:underline">
                        {det.normalized_plate_text}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 truncate max-w-[150px]">
                      {det.camera_name || det.camera_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{det.zone_name}</td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5 border border-slate-400" style={{ backgroundColor: det.vehicle_color }}></span>
                      {det.vehicle_color} {det.vehicle_type}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{det.speed_kmh} km/h</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        det.is_low_confidence 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {Math.round(det.ocr_confidence * 100)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(det.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Waiting for detection stream...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN DASHBOARD DISPATCHER
// =========================================================================
export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const currentRole = normalizeRole(user?.role);

  const fetchStats = async () => {
    try {
      const [statsData, camerasData] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<CameraType[]>('/cameras').catch(() => [])
      ]);
      setStats(statsData);
      setCameras(camerasData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load command center stats');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Real-time WebSocket push updates
  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'DETECTION_CREATED') {
      const det = msg.data;
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          vehicles_detected_today: prev.vehicles_detected_today + 1,
          recent_detections: [det, ...prev.recent_detections.slice(0, 9)]
        };
      });
    } else if (msg.type === 'ALERT_TRIGGERED') {
      setStats((prev) => {
        if (!prev) return prev;
        const newIncident = {
          id: msg.data.id || Date.now(),
          alert_type: msg.data.alert_type || 'system_alert',
          severity: msg.data.severity || 'high',
          title: msg.data.title || 'Live Surveillance Event',
          description: msg.data.description || 'Action required',
          camera_id: msg.data.camera_id,
          camera_name: msg.data.camera_name || 'Sensor Network',
          vehicle_plate: msg.data.plate_number,
          timestamp: new Date().toISOString(),
          target_url: msg.data.alert_type === 'watchlist_match' ? `/vehicles/${msg.data.plate_number}` : '/alerts',
          is_resolved: false
        };
        return {
          ...prev,
          active_alerts: prev.active_alerts + 1,
          blacklist_matches: msg.data.alert_type === 'watchlist_match' ? prev.blacklist_matches + 1 : prev.blacklist_matches,
          recent_incidents: prev.recent_incidents ? [newIncident, ...prev.recent_incidents.slice(0, 4)] : [newIncident]
        };
      });
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsMessage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Banner & Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
              <span>CITY VISION</span>
              <span className="text-cyan-600 font-mono">—</span>
              <span className="text-cyan-600 font-extrabold">{currentRole.toUpperCase()}</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 font-mono font-bold tracking-wider">
              COMMAND DASHBOARD
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
            <span>
              {currentRole === 'Traffic Police' && 'Field Traffic Monitoring, Live Cameras & Active Violations'}
              {currentRole === 'Investigator' && 'Criminal Case Dossiers, Vehicle Tracking & Vehicle Route Tracking'}
              {currentRole === 'Traffic Analyst' && 'Urban Mobility Planning, Origin-Destination & Congestion Heatmaps'}
              {currentRole === 'Administrator' && 'Master Command & Control Center Operations & Infrastructure'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* WebSocket Push Status */}
          <div className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center space-x-1.5 border transition ${
            isConnected
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>WS ACTIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>CONNECTING WS...</span>
              </>
            )}
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role-Specific Dashboard Content */}
      {currentRole === 'Traffic Police' && (
        <TrafficPoliceDashboard stats={stats} cameras={cameras} navigate={navigate} />
      )}

      {currentRole === 'Investigator' && (
        <InvestigatorDashboard stats={stats} navigate={navigate} />
      )}

      {currentRole === 'Traffic Analyst' && (
        <TrafficAnalystDashboard stats={stats} navigate={navigate} />
      )}

      {currentRole === 'Administrator' && (
        <AdministratorDashboard stats={stats} cameras={cameras} navigate={navigate} />
      )}
    </div>
  );
}
