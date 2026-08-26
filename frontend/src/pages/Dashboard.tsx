import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, 
  Car, 
  Bell, 
  ShieldAlert, 
  Gauge, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  RefreshCw, 
  Radio, 
  Activity,
  Layers,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardStats, Detection } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [livePulse, setLivePulse] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.get<DashboardStats>('/dashboard/stats');
      setStats(data);
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
        return {
          ...prev,
          active_alerts: prev.active_alerts + 1,
          blacklist_matches: msg.data.alert_type === 'watchlist_match' ? prev.blacklist_matches + 1 : prev.blacklist_matches
        };
      });
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsMessage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Executive Surveillance Dashboard</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-mono">
              Visakhapatnam Metropolitan
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-camera ANPR ingestion, vehicle tracking & corridor intelligence
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Real WebSocket Push Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center space-x-1.5 border ${
            isConnected
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              : 'bg-amber-950/80 text-amber-400 border-amber-800'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>WEBSOCKET LIVE PUSH</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>CONNECTING WS...</span>
              </>
            )}
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Cameras */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Camera Network</span>
            <Camera className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100 font-mono">
              {stats ? stats.cameras.total : '--'}
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
              <span className="flex items-center text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3 mr-0.5" /> {stats?.cameras.online || 0}
              </span>
              <span className="flex items-center text-amber-400 font-semibold">
                <AlertTriangle className="w-3 h-3 mr-0.5" /> {stats?.cameras.warning || 0}
              </span>
              <span className="flex items-center text-rose-400 font-semibold">
                <XCircle className="w-3 h-3 mr-0.5" /> {stats?.cameras.offline || 0}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Vehicles Today */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Detections Stream</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black text-slate-100 font-mono transition-colors ${livePulse ? 'text-cyan-400 scale-105' : ''}`}>
              {stats ? stats.vehicles_detected_today.toLocaleString() : '--'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              across {stats?.total_vehicles_registered || 0} registered
            </div>
          </div>
        </div>

        {/* 3. Active Alerts */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Alerts</span>
            <Bell className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 font-mono">
              {stats ? stats.active_alerts : '--'}
            </div>
            <div className="text-[10px] text-rose-400/80 mt-1">
              Surveillance violations flagged
            </div>
          </div>
        </div>

        {/* 4. Watchlist Matches */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Watchlist Matches</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {stats ? stats.blacklist_matches : '--'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Hotlist / targets hit
            </div>
          </div>
        </div>

        {/* 5. Avg Corridor Speed */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Flow Speed</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {stats ? `${stats.avg_speed_kmh} km/h` : '--'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Arterials average velocity
            </div>
          </div>
        </div>

        {/* 6. Congestion */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Congested Roads</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-orange-400 font-mono">
              {stats ? `${stats.congested_roads.congested} / ${stats.congested_roads.total}` : '--'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Corridors at high occupancy
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Detections Feed & Quick Maps Link */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Detections Stream */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-200">Live Real-Time ANPR Ingestion Stream</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono flex items-center space-x-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span>WEBSOCKET PUSH</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
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

        {/* Quick Maps & Hub Links */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                GIS Map Overview
              </span>
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore 20 live camera sensors positioned across Visakhapatnam arterial roads, junctions, and toll gates.
            </p>
            <Link
              to="/live-map"
              className="flex items-center justify-between p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20 group"
            >
              <span>Open Live GIS Map</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Core City Zones</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Gajuwaka', 'NAD Junction', 'Maddilapalem', 'MVP Colony', 'Airport Road', 'City Centre'].map((zone, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                  <span className="truncate">{zone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
