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
  ArrowDown,
  RefreshCw, 
  Radio, 
  Activity,
  Layers,
  MapPin,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  TrendingUp,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardStats, Camera as CameraType } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [livePulse, setLivePulse] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Fetch Executive Stats & Cameras
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
      setError(err.message || 'Failed to load executive stats');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Initialize Interactive Mini GIS Map for Live City Situation
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7290, 83.2850],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false
    });

    // High performance dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

  // Update Map Markers when camera data arrives
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
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${markerColor};"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 170px; padding: 2px;">
          <div style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span>${cam.name}</span>
            <span style="font-size: 10px; font-family: monospace; padding: 1px 4px; border-radius: 4px; background: ${markerColor}22; color: ${markerColor}; font-weight: 700; text-transform: uppercase;">
              ${cam.status}
            </span>
          </div>
          <div style="color: #475569; font-size: 11px; margin-bottom: 2px;">ID: <span style="font-family: monospace; font-weight: 600;">${cam.id}</span></div>
          <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">Zone: <b>${cam.zone_name || 'Visakhapatnam'}</b></div>
          <div style="margin-top: 6px;">
            <a href="/cameras/${cam.id}" style="display: block; text-align: center; background: #0284c7; color: #ffffff; padding: 3px 6px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 600;">
              View Sensor Feed →
            </a>
          </div>
        </div>
      `);

      marker.addTo(markersGroupRef.current!);
    });
  }, [cameras]);

  // Handle Real-Time WebSocket Push Events
  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'DETECTION_CREATED') {
      const det = msg.data;
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1000);

      setStats((prev) => {
        if (!prev) return prev;
        const updatedDets = [det, ...prev.recent_detections.slice(0, 9)];
        return {
          ...prev,
          vehicles_detected_today: prev.vehicles_detected_today + 1,
          recent_detections: updatedDets
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

        const updatedIncidents = prev.recent_incidents ? [newIncident, ...prev.recent_incidents.slice(0, 4)] : [newIncident];

        return {
          ...prev,
          active_alerts: prev.active_alerts + 1,
          blacklist_matches: msg.data.alert_type === 'watchlist_match' ? prev.blacklist_matches + 1 : prev.blacklist_matches,
          recent_incidents: updatedIncidents
        };
      });
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsMessage);

  // Helper to format incident icon and style
  const getIncidentMeta = (incident: any) => {
    const type = incident.alert_type?.toLowerCase() || '';
    if (type.includes('watchlist') || type.includes('blacklist')) {
      return {
        icon: ShieldAlert,
        badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800',
        dotColor: 'bg-rose-400',
        label: 'Watchlist Match'
      };
    }
    if (type.includes('impossible') || type.includes('anomaly') || type.includes('speed')) {
      return {
        icon: AlertTriangle,
        badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800',
        dotColor: 'bg-amber-400',
        label: 'Route Anomaly'
      };
    }
    if (type.includes('camera') || type.includes('failure') || type.includes('offline')) {
      return {
        icon: XCircle,
        badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800',
        dotColor: 'bg-rose-500',
        label: 'Camera Offline'
      };
    }
    return {
      icon: Flame,
      badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-800',
      dotColor: 'bg-orange-400',
      label: 'Traffic Spike'
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Banner & Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center space-x-2">
              <span>CITY VISION</span>
              <span className="text-cyan-400 font-mono">—</span>
              <span className="text-cyan-300 font-extrabold">VISAKHAPATNAM</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/90 text-purple-300 border border-purple-700/80 font-mono font-bold tracking-wider">
              DEMO / SYNTHETIC DATA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>City-Wide Multi-Camera ANPR Trajectory & Traffic Analytics Command Center</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* WebSocket Push Live Status */}
          <div className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center space-x-1.5 border transition ${
            isConnected
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-lg shadow-emerald-950/40'
              : 'bg-amber-950/90 text-amber-300 border-amber-700/80'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>WEBSOCKET LIVE PUSH</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>CONNECTING WS...</span>
              </>
            )}
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION: CITY STATUS (6 Core KPI Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              CITY STATUS
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Synced: {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* 1. CAMERA NETWORK */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold tracking-tight uppercase text-slate-300">Camera Network</span>
              <CameraIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black text-slate-100 font-mono">
                  {stats ? `${stats.cameras.online} / ${stats.cameras.total}` : '--'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                  ONLINE
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-2 font-mono">
                <span className="text-slate-300 font-medium">
                  {stats ? stats.cameras.total : 0} REGISTERED
                </span>
                <span>•</span>
                <span className="text-rose-400 font-semibold">
                  {stats ? stats.cameras.offline : 0} OFFLINE
                </span>
              </div>
            </div>
          </div>

          {/* 2. DETECTIONS STREAM */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold tracking-tight uppercase text-slate-300">Detections Stream</span>
              <Car className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-black text-slate-100 font-mono transition-all ${livePulse ? 'text-cyan-400 scale-105' : ''}`}>
                {stats ? stats.vehicles_detected_today.toLocaleString() : '--'}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1.5">
                Vehicle/ANPR detections
              </div>
            </div>
          </div>

          {/* 3. ACTIVE ALERTS */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold tracking-tight uppercase text-slate-300">Active Alerts</span>
              <Bell className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-400 font-mono">
                {stats ? stats.active_alerts : '--'}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1.5">
                Events requiring attention
              </div>
            </div>
          </div>

          {/* 4. WATCHLIST MATCHES */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold tracking-tight uppercase text-slate-300">Watchlist Matches</span>
              <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-400 font-mono">
                {stats ? stats.blacklist_matches : '--'}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1.5">
                Authorized watchlist matches
              </div>
            </div>
          </div>

          {/* 5. AVG FLOW SPEED */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold tracking-tight uppercase text-slate-300">Avg Flow Speed</span>
              <Gauge className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {stats ? `${stats.avg_speed_kmh} km/h` : '--'}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1.5">
                Arterial roads
              </div>
            </div>
          </div>

          {/* 6. CONGESTED ROADS */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold tracking-tight uppercase text-slate-300">Congested Roads</span>
              <Flame className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-orange-400 font-mono">
                {stats ? `${stats.congested_roads.congested} / ${stats.congested_roads.total}` : '--'}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-1.5">
                High-occupancy corridors
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: LIVE CITY SITUATION (Interactive GIS Map) */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight font-mono">
                LIVE CITY SITUATION
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live GIS spatial overview of sensor telemetry, traffic velocity corridors, and hotlist alerts
            </p>
          </div>

          <Link
            to="/live-map"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20 group shrink-0"
          >
            <span>OPEN LIVE CITY MAP</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </Link>
        </div>

        {/* Map Container with Overlay Legends */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800">
          <div ref={mapContainerRef} className="w-full h-[360px] z-0" />

          {/* Map Overlay HUD Legend */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 space-y-2 shadow-2xl">
            <div className="flex items-center space-x-4 flex-wrap gap-y-1">
              <span className="font-mono font-bold text-slate-400 uppercase text-[10px]">Traffic Status:</span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Low</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Moderate</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span>High</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>Severe</span></span>
            </div>
            <div className="flex items-center space-x-4 flex-wrap gap-y-1 border-t border-slate-800/80 pt-1.5">
              <span className="font-mono font-bold text-slate-400 uppercase text-[10px]">Camera Status:</span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Online ({stats?.cameras.online || 0})</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Warning ({stats?.cameras.warning || 0})</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>Offline ({stats?.cameras.offline || 0})</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: TWO-COLUMN INTELLIGENCE GRID: MAJOR FLOWS & RECENT INCIDENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAJOR TRAFFIC FLOWS */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight font-mono">
                  MAJOR TRAFFIC FLOWS
                </h2>
              </div>
              <Link
                to="/traffic-flow"
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition"
              >
                <span>VIEW OD ANALYTICS</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Primary origin → destination arterial corridors ranked by vehicle density
            </p>

            <div className="mt-4 space-y-2.5">
              {stats?.major_flows && stats.major_flows.length > 0 ? (
                stats.major_flows.map((flow, index) => (
                  <div
                    key={flow.id || index}
                    onClick={() => navigate('/traffic-flow')}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-cyan-500/60 hover:bg-slate-900/90 transition cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition truncate">
                          <span className="truncate">{flow.origin_name}</span>
                          <span className="text-cyan-400 font-mono">→</span>
                          <span className="truncate">{flow.dest_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2 font-mono">
                          <span>Avg {flow.avg_speed_kmh} km/h</span>
                          <span>•</span>
                          <span>{Math.round(flow.avg_travel_time_sec / 60)} min travel time</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <div className="text-xs font-black text-cyan-400 font-mono">
                        {flow.vehicle_count.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">
                        vehicles
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 text-center text-xs text-slate-500 font-mono">
                  Loading major traffic movements...
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/traffic-flow"
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center space-x-1.5"
            >
              <span>VIEW OD ANALYTICS</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </Link>
          </div>
        </div>

        {/* RECENT INCIDENTS */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight font-mono">
                  RECENT INCIDENTS
                </h2>
              </div>
              <Link
                to="/alerts"
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition"
              >
                <span>VIEW ALL ALERTS</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Latest critical events, watchlist detections, and sensor network notifications
            </p>

            <div className="mt-4 space-y-2.5">
              {stats?.recent_incidents && stats.recent_incidents.length > 0 ? (
                stats.recent_incidents.map((incident) => {
                  const meta = getIncidentMeta(incident);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={incident.id}
                      onClick={() => navigate(incident.target_url || '/alerts')}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/90 transition cursor-pointer group flex items-start justify-between space-x-3"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${meta.badgeBg}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition truncate">
                              {incident.title}
                            </span>
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {incident.vehicle_plate || incident.camera_id || 'System'}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">
                            {incident.description}
                          </p>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono flex items-center space-x-2">
                            <span>Node: {incident.camera_name || incident.camera_id}</span>
                            <span>•</span>
                            <span className="capitalize text-slate-400">Severity: {incident.severity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                          {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 text-center text-xs text-slate-500 font-mono">
                  No active incidents flagged
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/alerts"
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center space-x-1.5"
            >
              <span>VIEW ALL ALERTS</span>
              <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION: LIVE REAL-TIME ANPR INGESTION STREAM */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight font-mono">
              LIVE REAL-TIME ANPR INGESTION STREAM
            </h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono flex items-center space-x-1 font-bold">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
            <span>WEBSOCKET PUSH</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {stats?.recent_detections && stats.recent_detections.length > 0 ? (
                stats.recent_detections.map((det) => (
                  <tr key={det.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      <div className="flex items-center space-x-2">
                        <Link to={`/vehicles/${det.normalized_plate_text}`} className="hover:underline">
                          {det.normalized_plate_text}
                        </Link>
                        {det.is_simulated ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                            SYNTHETIC
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                            VERIFIED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[150px]">
                      {det.camera_name || det.camera_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{det.zone_name}</td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5 border border-slate-600" style={{ backgroundColor: det.vehicle_color }}></span>
                      {det.vehicle_color} {det.vehicle_type}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{det.speed_kmh} km/h</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        det.is_low_confidence 
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800' 
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      }`}>
                        {Math.round(det.ocr_confidence * 100)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(det.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
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
