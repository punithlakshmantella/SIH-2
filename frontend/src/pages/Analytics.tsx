import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  Car,
  Compass,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  Flame,
  ArrowRight,
  Lightbulb,
  Camera,
  Map,
  FileDown,
  Users,
  Gauge,
  ThumbsUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { Zone } from '../types';

const COLORS = ['#0284c7', '#38bdf8', '#818cf8', '#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#6366f1'];

const TIME_RANGES = [
  { label: 'Last 1 Hour',  value: '1h',  hours: 1 },
  { label: 'Last 6 Hours', value: '6h',  hours: 6 },
  { label: 'Last 24 Hours',value: '24h', hours: 24 },
  { label: 'Last 7 Days',  value: '7d',  hours: 168 },
];

function congestionColor(level: string) {
  switch (level) {
    case 'SEVERE':   return 'text-rose-400 bg-rose-950/40 border-rose-800';
    case 'HIGH':     return 'text-orange-400 bg-orange-950/40 border-orange-800';
    case 'MODERATE': return 'text-amber-400 bg-amber-950/40 border-amber-800';
    case 'LOW':      return 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
    default:         return 'text-slate-500 bg-slate-50/40 border-slate-200';
  }
}

function networkStatusStyle(status: string) {
  switch (status) {
    case 'OPTIMAL':   return 'text-emerald-400';
    case 'DEGRADED':  return 'text-amber-400';
    case 'CRITICAL':  return 'text-rose-400';
    default:          return 'text-slate-500';
  }
}

export default function Analytics() {
  const [data, setData]               = useState<any | null>(null);
  const [odFlows, setOdFlows]         = useState<any[]>([]);
  const [zones, setZones]             = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [timeRange, setTimeRange]     = useState<string>('24h');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Load zones once
  useEffect(() => {
    api.get<Zone[]>('/zones').then(setZones).catch(console.error);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const now   = new Date();
      const hours = TIME_RANGES.find(r => r.value === timeRange)?.hours ?? 24;
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      let url = `/analytics/overview?start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(now.toISOString())}`;
      if (selectedZone !== 'all') url += `&zone_id=${selectedZone}`;

      const [overview, flows] = await Promise.all([
        api.get<any>(url),
        api.get<any[]>('/analytics/origin-destination').catch(() => []),
      ]);
      setData(overview);
      setOdFlows(Array.isArray(flows) ? flows.slice(0, 6) : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [timeRange, selectedZone]);

  const s = data?.summary;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* 1. DEMO / SYNTHETIC DATA BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong>{' '}
          Traffic analytics are computed from prototype synthetic camera detection data seeded for SIH evaluation.
          Live Visakhapatnam traffic data requires an authorized VMS connection.
        </div>
      </div>

      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            <span>City-Wide Traffic Analytics & Mobility Insights</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregate volume trends, velocity distributions, and vehicle classifications for Visakhapatnam
          </p>
        </div>

        {/* 7, 8. FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            {TIME_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">{error}</div>
      )}

      {/* 2, 3, 4, 5, 6. KPI CARDS — 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total ANPR Detections */}
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">ANPR Detections</span>
          <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
            {s ? s.total_detections.toLocaleString() : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-cyan-600 font-mono mt-1 block">Camera detection events</span>
        </div>

        {/* Unique Vehicles */}
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Unique Vehicles</span>
          <span className="text-2xl font-black font-mono text-blue-400 mt-1 block">
            {s ? s.unique_vehicles.toLocaleString() : (loading ? '…' : '—')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Distinct registered vehicles</span>
        </div>

        {/* Avg Corridor Speed */}
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Avg Corridor Speed</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {s?.avg_speed_kmh != null ? `${s.avg_speed_kmh} km/h` : (loading ? '…' : 'N/A')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Valid speed detections only</span>
        </div>

        {/* Peak Traffic Hour */}
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Peak Traffic Hour</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {s?.peak_hour ?? (loading ? '…' : 'N/A')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            {s?.peak_volume != null ? `${s.peak_volume} detections` : 'No data'}
          </span>
        </div>

        {/* Cameras Online */}
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Cameras Online</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${networkStatusStyle(s?.network_status)}`}>
            {s ? `${s.cameras_online} / ${s.cameras_total}` : (loading ? '…' : '—')}
          </span>
          <span className={`text-[10px] font-mono font-bold mt-1 block ${networkStatusStyle(s?.network_status)}`}>
            {s?.network_status ?? (loading ? '…' : 'UNKNOWN')}
          </span>
        </div>

        {/* Congested Corridors */}
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Congested Corridors</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${s?.congested_corridors_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {s != null ? s.congested_corridors_count : (loading ? '…' : '—')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">HIGH / SEVERE level</span>
        </div>
      </div>

      {/* Camera Status Detail Row */}
      {s && (
        <div className="flex flex-wrap gap-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{s.cameras_online} Online</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-800 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{s.cameras_warning} Warning</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-800 text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            <span>{s.cameras_offline} Offline</span>
          </div>
          {s.excluded_invalid_records > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-500">
              <span>⚠ {s.excluded_invalid_records} records excluded from speed analytics (invalid/zero speed)</span>
            </div>
          )}
        </div>
      )}

      {/* 9. HOURLY TRAFFIC CHART */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-cyan-600" />
            <span>Hourly Traffic Volume vs Corridor Velocity Profile</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Detection count and average recorded vehicle speed per hour across camera network
          </p>
        </div>

        <div className="h-72 w-full">
          {data?.hourly_trends && data.hourly_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(value: any, name: string) => [
                    value != null ? (name.includes('Speed') ? `${value} km/h` : value) : 'N/A',
                    name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="volume" name="ANPR Detections" stroke="#0284c7" fillOpacity={1} fill="url(#volumeGrad)" connectNulls />
                <Area type="monotone" dataKey="avg_speed_kmh" name="Avg Speed (km/h)" stroke="#10b981" fillOpacity={1} fill="url(#speedGrad)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              {loading ? 'Loading hourly trend series…' : 'No data for selected time range.'}
            </div>
          )}
        </div>
      </div>

      {/* 10, 11. VEHICLE CLASSIFICATION + DIRECTIONAL MOVEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vehicle Classification */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Car className="w-4 h-4 text-blue-400" />
            <span>Vehicle Classification Breakdown</span>
          </h2>

          {data?.vehicle_type_distribution && data.vehicle_type_distribution.length > 0 ? (
            <div className="space-y-3">
              {data.vehicle_type_distribution.map((d: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-700">{d.name}</span>
                    <span className="font-bold text-slate-900">{d.value.toLocaleString()} <span className="text-slate-500 font-normal">({d.pct}%)</span></span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${d.pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500 text-xs">
              {loading ? 'Loading classification data…' : 'No classification data available.'}
            </div>
          )}
        </div>

        {/* Directional Movement */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Directional Movement Vectors</span>
          </h2>

          <div className="space-y-3">
            {data?.direction_distribution?.map((d: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700">{d.direction} <span className="text-slate-600">({d.code})</span></span>
                  <span className="font-bold text-slate-900">{d.count.toLocaleString()} <span className="text-slate-500 font-normal">({d.pct}%)</span></span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-50 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {s && (
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
              Total directional detections: {s.total_detections.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* 12, 13. CONGESTION OVERVIEW */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Congestion Corridor Overview</span>
          </h2>
          <Link
            to="/congestion"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800 text-rose-300 text-xs font-bold transition"
          >
            <Map className="w-3.5 h-3.5" />
            <span>View Congestion Heatmap</span>
          </Link>
        </div>

        {data?.congestion_corridors && data.congestion_corridors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase text-[10px] border-b border-slate-200">
                  <th className="text-left py-2 pr-4">Corridor</th>
                  <th className="text-left py-2 pr-4">Zone</th>
                  <th className="text-right py-2 pr-4">Avg Speed</th>
                  <th className="text-right py-2 pr-4">Volume</th>
                  <th className="text-center py-2">Congestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {data.congestion_corridors.slice(0, 8).map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-100/30 transition">
                    <td className="py-2 pr-4 text-slate-800 font-medium truncate max-w-[180px]">{c.road_name}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.zone_name}</td>
                    <td className="py-2 pr-4 text-right text-cyan-600">
                      {c.avg_speed_kmh != null ? `${c.avg_speed_kmh} km/h` : 'N/A'}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700">{c.volume_label}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${congestionColor(c.congestion_level)}`}>
                        {c.congestion_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-slate-500 text-xs text-center py-6">
            {loading ? 'Loading corridor data…' : 'No corridor data available for this time range.'}
          </div>
        )}
      </div>

      {/* 14, 15. OD FLOW SUMMARY */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <span>Major Traffic Flows & Origin-Destination</span>
          </h2>
          <Link
            to="/traffic-flow"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800 text-indigo-300 text-xs font-bold transition"
          >
            <span>View Full OD Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {odFlows.length > 0 ? (
          <div className="space-y-2">
            {odFlows.map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-200 hover:border-slate-300 transition">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-500 font-bold">{i + 1}.</span>
                  <span className="text-slate-700 font-medium">{f.flow_label || `${f.origin_zone} → ${f.dest_zone}`}</span>
                  <span className="text-slate-600 text-[10px] truncate max-w-[200px] hidden sm:block">
                    ({f.origin_camera_name} → {f.dest_camera_name})
                  </span>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-cyan-600">{f.vehicle_count.toLocaleString()}</span>
                  <span className="text-slate-500 ml-1">vehicles</span>
                  {f.avg_speed_kmh && (
                    <div className="text-[10px] text-slate-500">{f.avg_speed_kmh} km/h avg</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-xs text-center py-6">
            {loading ? 'Loading OD flows…' : 'No origin-destination flows available.'}
          </div>
        )}
      </div>

      {/* 17. TRAFFIC INSIGHTS */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span>Traffic Intelligence Insights</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-300 font-mono">Auto-generated from analytics</span>
        </h2>

        {data?.traffic_insights && data.traffic_insights.length > 0 ? (
          <ul className="space-y-2">
            {data.traffic_insights.map((insight: string, i: number) => (
              <li key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                <span className="text-cyan-600 mt-0.5 flex-shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-xs">
            {loading ? 'Generating insights…' : 'Insufficient data to generate insights for this time range.'}
          </p>
        )}
      </div>

      {/* 16. TOP CAMERA VOLUME */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Top Camera Detection Volume</span>
          </h2>
          <Link to="/cameras" className="text-xs text-cyan-600 hover:text-cyan-600 flex items-center space-x-1 transition">
            <span>Camera Network</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {data?.top_cameras && data.top_cameras.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase text-[10px] border-b border-slate-200">
                  <th className="text-left py-2 pr-4">#</th>
                  <th className="text-left py-2 pr-4">Camera ID</th>
                  <th className="text-left py-2 pr-4">Camera Name</th>
                  <th className="text-left py-2 pr-4">Zone</th>
                  <th className="text-right py-2">Detections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {data.top_cameras.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-100/30 transition">
                    <td className="py-2 pr-4 text-slate-500">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <Link to={`/cameras/${c.camera_id}`} className="text-cyan-600 hover:text-cyan-600 font-bold transition">
                        {c.camera_id}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-700 truncate max-w-[200px]">{c.camera_name}</td>
                    <td className="py-2 pr-4 text-slate-500">{c.zone_name}</td>
                    <td className="py-2 text-right font-bold text-emerald-400">{c.detections.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-slate-500 text-xs text-center py-6">
            {loading ? 'Loading camera data…' : 'No camera detection data available.'}
          </div>
        )}
      </div>

      {/* 22. EXPORT ANALYTICS */}
      <div className="flex justify-end">
        <Link
          to="/reports"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition shadow-md"
        >
          <FileDown className="w-4 h-4 text-cyan-600" />
          <span>Export Analytics to Reports</span>
        </Link>
      </div>

    </div>
  );
}
