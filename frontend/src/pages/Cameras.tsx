import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera as CameraIcon, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  ArrowUpRight, 
  RefreshCw, 
  SlidersHorizontal,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';
import { Camera, Zone } from '../types';

export interface CameraHealthInfo {
  health: 'healthy' | 'degraded' | 'offline';
  label: string;
  color: string;
  badgeBg: string;
  issues: string[];
}

// Configurable prototype health threshold evaluator
export const evaluateCameraHealth = (c: Camera): CameraHealthInfo => {
  if (c.status === 'offline' || c.fps === 0) {
    return {
      health: 'offline',
      label: 'OFFLINE',
      color: 'text-rose-400',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800',
      issues: ['Stream Disconnected']
    };
  }

  const issues: string[] = [];
  if (c.ocr_accuracy < 80) {
    issues.push('LOW OCR PERFORMANCE');
  } else if (c.ocr_accuracy < 93) {
    issues.push('LOWER OCR PERFORMANCE');
  }

  if (c.latency_ms > 100) {
    issues.push('HIGH LATENCY');
  } else if (c.latency_ms > 70) {
    issues.push('ELEVATED LATENCY');
  }

  if (c.fps < 22) {
    issues.push('LOW FPS');
  } else if (c.fps < 26) {
    issues.push('REDUCED FPS');
  }

  if (c.status === 'warning' || issues.length > 0) {
    return {
      health: 'degraded',
      label: 'DEGRADED',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800',
      issues: issues.length > 0 ? issues : ['Operational Warning']
    };
  }

  return {
    health: 'healthy',
    label: 'HEALTHY',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    issues: []
  };
};

interface CameraSummary {
  total: number;
  online: number;
  warning: number;
  offline: number;
  avgFps: string;
  avgLatency: number;
  avgOcr: string;
  healthyCount: number;
  degradedCount: number;
  offlineHealthCount: number;
  lowestOcrCam: Camera | null;
  highestLatencyCam: Camera | null;
  lowestFpsCam: Camera | null;
}

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'warning' | 'offline'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'degraded' | 'offline'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'id' | 'ocr_asc' | 'latency_desc' | 'fps_asc' | 'fps_desc' | 'health' | 'status' | 'zone'
  >('id');

  const fetchCamerasAndZones = async () => {
    setLoading(true);
    try {
      const [camsData, zonesData] = await Promise.all([
        api.get<Camera[]>('/cameras'),
        api.get<Zone[]>('/zones').catch(() => [])
      ]);
      setCameras(camsData);
      setZones(zonesData);
    } catch (err) {
      console.error('Failed to load camera network', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCamerasAndZones();
  }, []);

  // Compute dynamic summary statistics
  const summary = useMemo<CameraSummary>(() => {
    const total = cameras.length;
    const online = cameras.filter(c => c.status === 'online').length;
    const warning = cameras.filter(c => c.status === 'warning').length;
    const offline = cameras.filter(c => c.status === 'offline').length;

    // Filter out offline cameras for meaningful operational averages
    const activeCams = cameras.filter(c => c.status !== 'offline' && c.fps > 0);
    const avgFps = activeCams.length > 0 
      ? (activeCams.reduce((acc, c) => acc + c.fps, 0) / activeCams.length).toFixed(1) 
      : '0.0';
    const avgLatency = activeCams.length > 0 
      ? Math.round(activeCams.reduce((acc, c) => acc + c.latency_ms, 0) / activeCams.length) 
      : 0;
    const avgOcr = activeCams.length > 0 
      ? (activeCams.reduce((acc, c) => acc + c.ocr_accuracy, 0) / activeCams.length).toFixed(1) 
      : '0.0';

    // Health breakdowns
    let healthyCount = 0;
    let degradedCount = 0;
    let offlineHealthCount = 0;

    let lowestOcrCam: Camera | null = null;
    let highestLatencyCam: Camera | null = null;
    let lowestFpsCam: Camera | null = null;

    cameras.forEach(c => {
      const evalHealth = evaluateCameraHealth(c);
      if (evalHealth.health === 'healthy') healthyCount++;
      else if (evalHealth.health === 'degraded') degradedCount++;
      else offlineHealthCount++;

      // Anomaly callouts (for active cameras)
      if (c.status !== 'offline' && c.fps > 0) {
        if (!lowestOcrCam || c.ocr_accuracy < lowestOcrCam.ocr_accuracy) {
          lowestOcrCam = c;
        }
        if (!highestLatencyCam || c.latency_ms > highestLatencyCam.latency_ms) {
          highestLatencyCam = c;
        }
        if (!lowestFpsCam || c.fps < lowestFpsCam.fps) {
          lowestFpsCam = c;
        }
      }
    });

    return {
      total,
      online,
      warning,
      offline,
      avgFps,
      avgLatency,
      avgOcr,
      healthyCount,
      degradedCount,
      offlineHealthCount,
      lowestOcrCam,
      highestLatencyCam,
      lowestFpsCam
    };
  }, [cameras]);

  // Filtered & Sorted Cameras
  const processedCameras = useMemo(() => {
    return cameras
      .filter(c => {
        // Search filter (ID, name, road, zone)
        const q = search.toLowerCase().trim();
        const matchSearch = !q || 
          c.id.toLowerCase().includes(q) || 
          c.name.toLowerCase().includes(q) || 
          (c.road_name && c.road_name.toLowerCase().includes(q)) ||
          (c.zone_name && c.zone_name.toLowerCase().includes(q));

        // Status filter
        const matchStatus = statusFilter === 'all' || c.status === statusFilter;

        // Health filter
        const evalHealth = evaluateCameraHealth(c);
        const matchHealth = healthFilter === 'all' || evalHealth.health === healthFilter;

        // Zone filter
        const matchZone = zoneFilter === 'all' || 
          (c.zone_name && c.zone_name.toLowerCase() === zoneFilter.toLowerCase()) ||
          c.zone_id.toString() === zoneFilter;

        return matchSearch && matchStatus && matchHealth && matchZone;
      })
      .sort((a, b) => {
        if (sortBy === 'id') {
          return a.id.localeCompare(b.id);
        }
        if (sortBy === 'ocr_asc') {
          const aOcr = a.status === 'offline' ? 999 : a.ocr_accuracy;
          const bOcr = b.status === 'offline' ? 999 : b.ocr_accuracy;
          return aOcr - bOcr;
        }
        if (sortBy === 'latency_desc') {
          return b.latency_ms - a.latency_ms;
        }
        if (sortBy === 'fps_asc') {
          const aFps = a.status === 'offline' ? 999 : a.fps;
          const bFps = b.status === 'offline' ? 999 : b.fps;
          return aFps - bFps;
        }
        if (sortBy === 'fps_desc') {
          return b.fps - a.fps;
        }
        if (sortBy === 'health') {
          const rank = { offline: 1, degraded: 2, healthy: 3 };
          const aRank = rank[evaluateCameraHealth(a).health];
          const bRank = rank[evaluateCameraHealth(b).health];
          return aRank - bRank;
        }
        if (sortBy === 'status') {
          const rank = { warning: 1, offline: 2, online: 3 };
          return rank[a.status] - rank[b.status];
        }
        if (sortBy === 'zone') {
          return (a.zone_name || '').localeCompare(b.zone_name || '');
        }
        return 0;
      });
  }, [cameras, search, statusFilter, healthFilter, zoneFilter, sortBy]);

  const lowestOcr = summary.lowestOcrCam;
  const highestLatency = summary.highestLatencyCam;
  const lowestFps = summary.lowestFpsCam;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER & TELEMETRY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center space-x-2">
              <CameraIcon className="w-5 h-5 text-cyan-400" />
              <span>CAMERA SENSOR NETWORK</span>
              <span className="text-cyan-400 font-mono font-normal">({summary.total} TOTAL)</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/90 text-purple-300 border border-purple-700/80 font-mono font-bold tracking-wider">
              DEMO / SYNTHETIC TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status, optical character recognition confidence, network latency, and stream throughput per sensor node
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCamerasAndZones}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC SUMMARY & OPERATIONAL METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total & Online Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Sensors Online</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {summary.online} <span className="text-sm font-normal text-slate-400 font-mono">/ {summary.total}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center space-x-2">
              <span className="text-amber-400 font-semibold">{summary.warning} Warning</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{summary.offline} Offline</span>
            </div>
          </div>
        </div>

        {/* Health Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Health Status</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-100 font-mono">
              {summary.healthyCount} <span className="text-xs font-semibold text-emerald-400">HEALTHY</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center space-x-2">
              <span className="text-amber-400 font-semibold">{summary.degradedCount} Degraded</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{summary.offlineHealthCount} Offline</span>
            </div>
          </div>
        </div>

        {/* Average Stream FPS */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Average FPS</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {summary.avgFps} <span className="text-xs font-normal text-slate-400 font-sans">FPS</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Active streams nominal
            </div>
          </div>
        </div>

        {/* Average Network Latency */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Average Latency</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-100 font-mono">
              {summary.avgLatency} <span className="text-xs font-normal text-slate-400 font-sans">ms</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Edge-to-core roundtrip
            </div>
          </div>
        </div>

        {/* Average OCR Confidence */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">OCR Confidence</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-cyan-300 font-mono">
              {summary.avgOcr}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Operational confidence
            </div>
          </div>
        </div>

        {/* Health Overview Callout Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-cyan-400 uppercase font-mono">Node Health Ratio</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-100 font-mono">
              {summary.total > 0 ? Math.round((summary.healthyCount / summary.total) * 100) : 0}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Network operating ratio
            </div>
          </div>
        </div>
      </div>

      {/* 3. CAMERA HEALTH OVERVIEW & ANOMALY CALLOUTS */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              CAMERA HEALTH OVERVIEW & NOTABLE ANOMALIES
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Evaluated against operational baseline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          {/* Lowest OCR Anomaly */}
          {lowestOcr && (
            <div
              onClick={() => setSearch(lowestOcr.id)}
              className="p-3 rounded-xl bg-slate-950/70 border border-amber-900/60 hover:border-amber-500/60 transition cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Lowest OCR Performance
                </span>
                <div className="font-mono font-bold text-slate-200 group-hover:text-cyan-300 transition mt-0.5">
                  {lowestOcr.id} — <span className="text-amber-400">{lowestOcr.ocr_accuracy}%</span>
                </div>
                <div className="text-[10.5px] text-slate-400 truncate max-w-[200px]">
                  {lowestOcr.name}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold uppercase shrink-0">
                DEGRADED
              </span>
            </div>
          )}

          {/* Highest Latency Anomaly */}
          {highestLatency && (
            <div
              onClick={() => setSearch(highestLatency.id)}
              className="p-3 rounded-xl bg-slate-950/70 border border-amber-900/60 hover:border-amber-500/60 transition cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Highest Network Latency
                </span>
                <div className="font-mono font-bold text-slate-200 group-hover:text-cyan-300 transition mt-0.5">
                  {highestLatency.id} — <span className="text-amber-400">{highestLatency.latency_ms} ms</span>
                </div>
                <div className="text-[10.5px] text-slate-400 truncate max-w-[200px]">
                  {highestLatency.name}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold uppercase shrink-0">
                DEGRADED
              </span>
            </div>
          )}

          {/* Lowest FPS Anomaly */}
          {lowestFps && (
            <div
              onClick={() => setSearch(lowestFps.id)}
              className="p-3 rounded-xl bg-slate-950/70 border border-amber-900/60 hover:border-amber-500/60 transition cursor-pointer flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
                  Lowest Stream Rate
                </span>
                <div className="font-mono font-bold text-slate-200 group-hover:text-cyan-300 transition mt-0.5">
                  {lowestFps.id} — <span className="text-amber-400">{lowestFps.fps} FPS</span>
                </div>
                <div className="text-[10.5px] text-slate-400 truncate max-w-[200px]">
                  {lowestFps.name}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold uppercase shrink-0">
                DEGRADED
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. COMPREHENSIVE FILTER & SORT CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Camera ID (e.g. CAM-NAD-009), Name, Corridor..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses ({cameras.length})</option>
            <option value="online">Online ({summary.online})</option>
            <option value="warning">Warning ({summary.warning})</option>
            <option value="offline">Offline ({summary.offline})</option>
          </select>

          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Health ({cameras.length})</option>
            <option value="healthy">Healthy ({summary.healthyCount})</option>
            <option value="degraded">Degraded ({summary.degradedCount})</option>
            <option value="offline">Offline ({summary.offlineHealthCount})</option>
          </select>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Zones ({zones.length || 6})</option>
            {zones.map(z => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            >
              <option value="id">Sort: Camera ID</option>
              <option value="ocr_asc">Sort: Lowest OCR Performance</option>
              <option value="latency_desc">Sort: Highest Latency</option>
              <option value="fps_asc">Sort: Lowest FPS</option>
              <option value="fps_desc">Sort: Highest FPS</option>
              <option value="health">Sort: Health (Issues First)</option>
              <option value="status">Sort: Status</option>
              <option value="zone">Sort: Zone</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. CAMERA SENSOR GRID */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span>Showing <b className="text-slate-200">{processedCameras.length}</b> of {cameras.length} camera nodes</span>
          {(search || statusFilter !== 'all' || healthFilter !== 'all' || zoneFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setHealthFilter('all');
                setZoneFilter('all');
                setSortBy('id');
              }}
              className="text-cyan-400 hover:underline font-mono"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedCameras.map(c => {
            const healthInfo = evaluateCameraHealth(c);
            const isOffline = c.status === 'offline' || c.fps === 0;

            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl bg-slate-900/70 border transition flex flex-col justify-between space-y-3.5 group hover:bg-slate-900/90 ${
                  healthInfo.health === 'degraded' 
                    ? 'border-amber-900/70 hover:border-amber-600/80 shadow-lg shadow-amber-950/20' 
                    : healthInfo.health === 'offline'
                    ? 'border-rose-900/70 hover:border-rose-600/80 shadow-lg shadow-rose-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{c.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase font-mono ${
                        c.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        c.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    {/* Calculated Health Badge */}
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase font-mono border ${healthInfo.badgeBg}`}>
                      {healthInfo.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 mt-2 group-hover:text-cyan-300 transition">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.road_name || 'Corridor Link'} • <span className="text-slate-300 font-medium">{c.zone_name}</span>
                  </p>
                </div>

                {/* Problem Indicators & Anomaly Badges */}
                {healthInfo.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {healthInfo.issues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-amber-800/80 font-mono font-bold tracking-tight"
                      >
                        ⚠️ {issue}
                      </span>
                    ))}
                  </div>
                )}

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800/80 text-[11px] font-mono text-slate-300 bg-slate-950/40 rounded-xl px-2.5">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">FPS Rate</span>
                    <span className={`font-bold ${isOffline ? 'text-slate-500' : c.fps < 25 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {c.fps} FPS
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">Latency</span>
                    <span className={`font-bold ${isOffline ? 'text-slate-500' : c.latency_ms > 70 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {isOffline ? 'N/A' : `${c.latency_ms} ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-mono">OCR Conf</span>
                    <span className={`font-bold ${isOffline ? 'text-slate-500' : c.ocr_accuracy < 93 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {isOffline ? 'N/A' : `${c.ocr_accuracy}%`}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                    <span>Dir: {c.direction}bound</span>
                    <span>•</span>
                    <span>{isOffline ? 'Last: 8m ago' : 'Heartbeat: 12s ago'}</span>
                  </div>

                  <Link
                    to={`/cameras/${c.id}`}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 hover:text-cyan-300 font-bold border border-slate-700 transition group-hover:border-cyan-600/60"
                  >
                    <span>VIEW TELEMETRY</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {processedCameras.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <CameraIcon className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No camera sensor nodes matched your filter criteria.</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setHealthFilter('all');
                setZoneFilter('all');
              }}
              className="text-xs text-cyan-400 hover:underline font-mono font-bold"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
