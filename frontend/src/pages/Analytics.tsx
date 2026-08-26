import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Activity, 
  Car, 
  Compass, 
  Filter, 
  RefreshCw, 
  Layers,
  Gauge,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { api } from '../services/api';
import { Zone } from '../types';

export default function Analytics() {
  const [data, setData] = useState<any | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(true);

  // Load zones
  useEffect(() => {
    api.get<Zone[]>('/zones').then(setZones).catch(console.error);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (timeRange === '7d') {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '12h') {
        start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      }

      let url = `/analytics/overview?start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(now.toISOString())}`;
      if (selectedZone !== 'all') {
        url += `&zone_id=${selectedZone}`;
      }

      const res = await api.get<any>(url);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedZone]);

  const COLORS = ['#0284c7', '#38bdf8', '#818cf8', '#a855f7', '#f43f5e', '#10b981'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>City-Wide Traffic Analytics & Mobility Insights</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time aggregate volume trends, velocity distributions, and vehicle classifications for Visakhapatnam
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="12h">Last 12 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 block">Total Volume Ingested</span>
          <span className="text-2xl font-black font-mono text-slate-100 mt-1 block">
            {data ? data.summary.total_volume.toLocaleString() : '--'}
          </span>
          <span className="text-[10px] text-cyan-400 font-mono mt-1 block">ANPR camera detections</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 block">Average Corridor Velocity</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {data ? `${data.summary.avg_speed_kmh} km/h` : '--'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Across tracked road network</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 block">Identified Peak Transit Hour</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {data ? data.summary.peak_hour : '--'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Peak volume: {data?.summary.peak_volume || 0} vehicles
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 block">Network Operational Status</span>
          <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
            OPTIMAL
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Visakhapatnam metropolitan grid</span>
        </div>
      </div>

      {/* Hourly Volume & Velocity Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Hourly Traffic Volume vs Corridor Velocity Profile</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly detection distribution and average recorded vehicle speed across camera network
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          {data?.hourly_trends && data.hourly_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="volume" name="Vehicles Ingested" stroke="#0284c7" fillOpacity={1} fill="url(#volumeGrad)" />
                <Area type="monotone" dataKey="avg_speed_kmh" name="Avg Velocity (km/h)" stroke="#10b981" fillOpacity={1} fill="url(#speedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Loading hourly trend series...
            </div>
          )}
        </div>
      </div>

      {/* Grid: Vehicle Types & Direction Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vehicle Classification Bar Chart */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Car className="w-4 h-4 text-blue-400" />
              <span>Vehicle Classification Breakdown</span>
            </h2>
          </div>

          <div className="h-64 w-full">
            {data?.vehicle_type_distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.vehicle_type_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" name="Vehicle Count" fill="#0284c7" radius={[6, 6, 0, 0]}>
                    {data.vehicle_type_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Loading vehicle distribution...
              </div>
            )}
          </div>
        </div>

        {/* Direction Distribution */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Directional Movement Vectors</span>
          </h2>

          <div className="space-y-3 pt-2">
            {data?.direction_distribution?.map((d: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">{d.direction}</span>
                  <span className="font-bold text-slate-100">{d.count} hits</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" 
                    style={{ width: `${Math.min(100, (d.count / Math.max(data.summary.total_volume, 1)) * 100 * 2.5)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono">
              Computed from live camera vector streams in Visakhapatnam
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
