import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera as CameraIcon, CheckCircle2, AlertTriangle, XCircle, Search, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { Camera } from '../types';

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Camera[]>('/cameras')
      .then(setCameras)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = cameras.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                        c.id.toLowerCase().includes(search.toLowerCase()) ||
                        (c.road_name && c.road_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <CameraIcon className="w-5 h-5 text-cyan-400" />
            <span>Camera Sensor Network ({cameras.length})</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status, optical character recognition accuracy, latency, and throughput per camera
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by camera ID, name, road corridor..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Statuses</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">{c.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  c.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  c.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {c.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-1">{c.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{c.road_name} • {c.zone_name}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-[11px] font-mono text-slate-300">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">FPS</span>
                <span>{c.fps}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Latency</span>
                <span>{c.latency_ms}ms</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">OCR Acc</span>
                <span className="font-bold text-cyan-400">{c.ocr_accuracy}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Dir: {c.direction}bound</span>
              <Link
                to={`/cameras/${c.id}`}
                className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                <span>Telemetry</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
