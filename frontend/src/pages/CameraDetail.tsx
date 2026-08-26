import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Camera, ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, Gauge } from 'lucide-react';
import { api } from '../services/api';
import { Camera as CameraType } from '../types';

export default function CameraDetail() {
  const { id } = useParams<{ id: string }>();
  const [camera, setCamera] = useState<CameraType | null>(null);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<CameraType>(`/cameras/${id}`),
      api.get<any[]>(`/cameras/${id}/health`)
    ]).then(([cam, logs]) => {
      setCamera(cam);
      setHealthLogs(logs);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-xs">Loading camera telemetry...</div>;
  }

  if (!camera) {
    return <div className="text-center py-12 text-rose-400 text-xs">Camera not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/cameras" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Cameras</span>
      </Link>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-cyan-400">{camera.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                camera.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                camera.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {camera.status}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-1">{camera.name}</h1>
            <p className="text-xs text-slate-400">{camera.road_name} • {camera.zone_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Stream Rate</span>
            <span className="text-sm font-bold text-slate-200 font-mono">{camera.fps} FPS</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Network Latency</span>
            <span className="text-sm font-bold text-slate-200 font-mono">{camera.latency_ms} ms</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">OCR Accuracy (Real)</span>
            <span className="text-sm font-bold text-cyan-400 font-mono">{camera.ocr_accuracy}%</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Throughput</span>
            <span className="text-sm font-bold text-slate-200 font-mono">{camera.vehicles_per_min} vpm</span>
          </div>
        </div>
      </div>

      {/* Health Logs */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Recent Heartbeat & Telemetry Logs</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Latency</th>
                <th className="p-2.5">Packet Loss</th>
                <th className="p-2.5">FPS</th>
                <th className="p-2.5">Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {healthLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-2.5 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2.5 font-bold uppercase">{log.status}</td>
                  <td className="p-2.5">{log.latency_ms}ms</td>
                  <td className="p-2.5">{log.packet_loss_pct}%</td>
                  <td className="p-2.5">{log.fps_actual}</td>
                  <td className="p-2.5 text-slate-400">{log.error_message || 'Stream nominal'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
