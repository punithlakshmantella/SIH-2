import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Route, 
  ArrowUpRight, 
  Eye, 
  Camera,
  Wifi
} from 'lucide-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const fetchAlerts = () => {
    api.get<any[]>('/alerts')
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // WebSocket Live Push Integration
  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'ALERT_TRIGGERED') {
      setAlerts((prev) => [msg.data, ...prev]);
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsMessage);

  const handleResolve = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      setAlerts((prev) => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = alerts.filter(a => {
    if (filterSeverity === 'active') return !a.is_resolved;
    if (filterSeverity === 'critical') return a.severity === 'critical';
    if (filterSeverity === 'warning') return a.severity === 'warning' || a.severity === 'high';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & WebSocket Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-rose-400" />
            <span>Active Surveillance & Anomaly Alerts ({alerts.filter(a => !a.is_resolved).length})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time automated watchlist hits, speed violations, unexpected stops, and wrong-way detections
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <Wifi className="w-3 h-3 animate-pulse" />
            <span>Live Alert Push Active</span>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Alerts ({alerts.length})</option>
            <option value="active">Active Only ({alerts.filter(a => !a.is_resolved).length})</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning / High</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filtered.map((a) => {
          const plateNumber = a.plate_number || a.title?.split(':')?.[1]?.trim()?.split(' ')?.[0] || 'AP39AB1234';
          return (
            <div 
              key={a.id} 
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                a.is_resolved 
                  ? 'bg-slate-900/30 border-slate-800/80 opacity-60' 
                  : a.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-800 shadow-lg shadow-rose-950/30'
                    : 'bg-amber-950/40 border-amber-800'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  a.severity === 'critical' ? 'bg-rose-900/50 text-rose-400' : 'bg-amber-900/50 text-amber-400'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-bold text-slate-100">{a.title}</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-slate-900 text-slate-300 border border-slate-800">
                      {a.alert_type.replace(/_/g, ' ')}
                    </span>
                    {a.is_resolved && (
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                        RESOLVED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500 mt-2">
                    <span>Camera: <strong className="text-slate-300">{a.camera_name || a.camera_id}</strong></span>
                    <span>•</span>
                    <span>{new Date(a.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">Conf: {Math.round(a.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Action Links & Resolve Button */}
              <div className="flex items-center space-x-2 self-end sm:self-center">
                <Link
                  to={`/trajectory?plate=${plateNumber}`}
                  className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-bold transition flex items-center space-x-1"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Trajectory</span>
                </Link>

                {!a.is_resolved && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
