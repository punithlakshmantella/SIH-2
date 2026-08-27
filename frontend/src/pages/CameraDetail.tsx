import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Camera as CameraIcon, 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Gauge,
  Clock,
  Zap,
  Radio,
  ExternalLink,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import { Camera as CameraType } from '../types';
import { evaluateCameraHealth } from './Cameras';

export default function CameraDetail() {
  const { id } = useParams<{ id: string }>();
  const [camera, setCamera] = useState<CameraType | null>(null);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<CameraType>(`/cameras/${id}`),
      api.get<any[]>(`/cameras/${id}/health`).catch(() => [])
    ]).then(([cam, logs]) => {
      setCamera(cam);
      setHealthLogs(logs);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <Activity className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-xs font-mono">Loading sensor telemetry & diagnostic logs...</span>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="p-8 text-center rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs space-y-3 max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="font-bold">Camera node '{id}' was not found in the database.</div>
        <Link to="/cameras" className="inline-block text-cyan-400 hover:underline font-mono">
          ← Return to Camera Sensor Network
        </Link>
      </div>
    );
  }

  const healthInfo = evaluateCameraHealth(camera);
  const isOffline = camera.status === 'offline' || camera.fps === 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/cameras"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Camera Sensor Network</span>
        </Link>

        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold">
          DEMO / SYNTHETIC TELEMETRY
        </span>
      </div>

      {/* Main Sensor Overview Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800">
                {camera.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                camera.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                camera.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                STATUS: {camera.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${healthInfo.badgeBg}`}>
                HEALTH: {healthInfo.label}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-100 mt-2">{camera.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Corridor: <b className="text-slate-300">{camera.road_name || 'Primary Corridor'}</b> • Zone: <b className="text-slate-300">{camera.zone_name}</b> • Direction: <b className="text-slate-300">{camera.direction}bound</b>
            </p>
          </div>

          <div className="text-right sm:shrink-0 text-xs font-mono text-slate-400 space-y-1">
            <div>GPS: {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}</div>
            <div className="text-[11px] text-slate-500">
              {isOffline ? 'Last heartbeat: 8 minutes ago' : 'Heartbeat nominal (12s ago)'}
            </div>
          </div>
        </div>

        {/* Anomaly Alerts on this Camera */}
        {healthInfo.issues.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs space-y-1">
            <span className="font-bold text-amber-400 font-mono flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>OPERATIONAL HEALTH WARNINGS:</span>
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {healthInfo.issues.map((issue, i) => (
                <span key={i} className="text-[10.5px] px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-amber-800 font-mono font-bold">
                  ⚠️ {issue}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Stream Rate</span>
            <div className="text-lg font-black text-slate-100 font-mono mt-1">
              {camera.fps} <span className="text-xs font-normal text-slate-400 font-sans">FPS</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Nominal: 30 FPS</span>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Network Latency</span>
            <div className="text-lg font-black text-slate-100 font-mono mt-1">
              {isOffline ? 'N/A' : `${camera.latency_ms} ms`}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Nominal: &lt; 70 ms</span>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">OCR Confidence</span>
            <div className="text-lg font-black text-cyan-400 font-mono mt-1">
              {isOffline ? 'N/A' : `${camera.ocr_accuracy}%`}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Baseline: &gt; 93%</span>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Throughput</span>
            <div className="text-lg font-black text-slate-100 font-mono mt-1">
              {camera.vehicles_per_min} <span className="text-xs font-normal text-slate-400 font-sans">vpm</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Vehicle rate</span>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex items-center space-x-3 pt-2">
          <Link
            to={`/live-map`}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>LOCATE ON LIVE GIS MAP</span>
          </Link>

          <Link
            to={`/anpr`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>ANPR STREAM INSPECTOR</span>
          </Link>
        </div>
      </div>

      {/* Heartbeat Logs Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Recent Heartbeat & Diagnostic Logs</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">Real-time edge polling</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Node Status</th>
                <th className="p-2.5">Latency</th>
                <th className="p-2.5">Packet Loss</th>
                <th className="p-2.5">FPS Actual</th>
                <th className="p-2.5">Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {healthLogs && healthLogs.length > 0 ? (
                healthLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-2.5 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2.5 font-bold uppercase">
                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] ${
                        log.status === 'online' ? 'text-emerald-400 bg-emerald-950' : 'text-amber-400 bg-amber-950'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2.5">{log.latency_ms} ms</td>
                    <td className="p-2.5">{log.packet_loss_pct}%</td>
                    <td className="p-2.5">{log.fps_actual} FPS</td>
                    <td className="p-2.5 text-slate-400">{log.error_message || 'Stream nominal • 0 packet drops'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 font-mono text-xs">
                    {isOffline ? 'Camera stream offline — heartbeat telemetry suspended' : 'Generating telemetry diagnostic log...'}
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
