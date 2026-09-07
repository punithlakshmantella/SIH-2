import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { 
  Flame, 
  AlertTriangle, 
  Clock, 
  Activity, 
  RefreshCw, 
  Cpu, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Camera,
  MapPin,
  GitFork,
  BarChart3,
  FileDown,
  Info,
  Layers,
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid 
} from 'recharts';
import { api } from '../services/api';
import { Road, Zone } from '../types';

const TIME_RANGES = [
  { label: 'Last 1 Hour',  value: '1h',  hours: 1 },
  { label: 'Last 6 Hours', value: '6h',  hours: 6 },
  { label: 'Last 24 Hours',value: '24h', hours: 24 },
  { label: 'Last 7 Days',  value: '7d',  hours: 168 },
];

function severityBadge(severity: string) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-950/70 text-rose-400 border-rose-800 font-bold';
    case 'high':
      return 'bg-orange-950/70 text-orange-400 border-orange-800 font-bold';
    case 'moderate':
      return 'bg-amber-950/70 text-amber-400 border-amber-800 font-bold';
    case 'low':
      return 'bg-emerald-950/70 text-emerald-400 border-emerald-800';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-300';
  }
}

function trendIcon(trend: string) {
  switch (trend?.toLowerCase()) {
    case 'increasing':
      return <TrendingUp className="w-3.5 h-3.5 text-rose-400 inline mr-1" />;
    case 'decreasing':
      return <TrendingDown className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />;
    default:
      return <Minus className="w-3.5 h-3.5 text-slate-500 inline mr-1" />;
  }
}

export default function Congestion() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  const [congestionData, setCongestionData] = useState<any | null>(null);
  const [roads, setRoads] = useState<Road[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [selectedRoadId, setSelectedRoadId] = useState<number>(1);
  const [horizonMinutes, setHorizonMinutes] = useState<number>(15);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Zones and Roads once
  useEffect(() => {
    Promise.all([
      api.get<Zone[]>('/zones').catch(() => []),
      api.get<Road[]>('/roads').catch(() => [])
    ]).then(([zList, rList]) => {
      setZones(zList);
      setRoads(rList);
      if (rList.length > 0) setSelectedRoadId(rList[0].id);
    });
  }, []);

  // Load Congestion Data with Time & Zone filters
  const fetchCongestionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const hours = TIME_RANGES.find(r => r.value === timeRange)?.hours ?? 24;
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      let url = `/analytics/congestion?start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(now.toISOString())}`;
      if (selectedZone !== 'all') url += `&zone_id=${selectedZone}`;

      const data = await api.get<any>(url);
      setCongestionData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load congestion analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedZone]);

  useEffect(() => {
    fetchCongestionData();
  }, [fetchCongestionData]);

  // Run Prototype Prediction
  const runPrediction = useCallback(async (rId: number, horizon: number) => {
    if (!rId) return;
    setLoadingPrediction(true);
    try {
      const now = new Date();
      const hours = TIME_RANGES.find(r => r.value === timeRange)?.hours ?? 24;
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      const data = await api.get<any>(
        `/analytics/congestion/predict?road_id=${rId}&horizon_minutes=${horizon}&start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(now.toISOString())}`
      );
      setPrediction(data);
    } catch (err) {
      console.error('Failed to run forecast model', err);
    } finally {
      setLoadingPrediction(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (selectedRoadId) {
      runPrediction(selectedRoadId, horizonMinutes);
    }
  }, [selectedRoadId, horizonMinutes, runPrediction]);

  // Init Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7250, 83.2700],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    heatmapLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Dynamic Density Circles on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !heatmapLayerRef.current || !congestionData) return;

    const layerGroup = heatmapLayerRef.current;
    layerGroup.clearLayers();

    congestionData.heatmap_points?.forEach((pt: any) => {
      const isSelected = selectedRoadId === pt.road_id;
      const radius = Math.max(12, Math.min(26, pt.intensity * 26));

      let color = '#10b981'; // LOW
      if (pt.intensity >= 0.80) color = '#f43f5e'; // CRITICAL
      else if (pt.intensity >= 0.65) color = '#f97316'; // HIGH
      else if (pt.intensity >= 0.45) color = '#f59e0b'; // MODERATE

      const circle = L.circleMarker([pt.latitude, pt.longitude], {
        radius: isSelected ? radius + 4 : radius,
        fillColor: color,
        color: isSelected ? '#38bdf8' : color,
        weight: isSelected ? 3 : 1.5,
        opacity: 0.9,
        fillOpacity: isSelected ? 0.65 : 0.45,
      });

      const matchedCorridor = congestionData.affected_corridors?.find((c: any) => c.road_id === pt.road_id);

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 6px; min-width: 220px;">
          <div style="font-weight: bold; color: #0284c7; font-size: 13px;">${pt.road_name}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">Zone: ${pt.zone_name} • ${pt.camera_name}</div>
          
          <div style="margin-top: 6px; padding: 6px; background: #f8fafc; border-radius: 6px; font-size: 11px; line-height: 1.5;">
            <div>Estimated Occupancy: <strong style="color: ${color};">${Math.round(pt.intensity * 100)}%</strong></div>
            <div>Congestion Severity: <strong style="color: ${color}; text-transform: uppercase;">${pt.severity}</strong></div>
            <div>Current Speed: <strong>${matchedCorridor?.avg_speed_kmh ? matchedCorridor.avg_speed_kmh + ' km/h' : 'N/A'}</strong> (Speed Limit: ${matchedCorridor?.speed_limit_kmh || 60} km/h)</div>
            <div>Volume: <strong>${matchedCorridor?.volume_per_hour || 0} veh/hr</strong></div>
            <div>Duration: <strong>~${matchedCorridor?.duration_minutes || 15} mins</strong> (${matchedCorridor?.trend || 'Stable'})</div>
          </div>
          <div style="margin-top: 6px; text-align: right;">
            <span style="font-size: 10px; color: #6366f1; font-weight: bold;">Click card below to simulate forecast &rarr;</span>
          </div>
        </div>
      `);

      circle.on('click', () => {
        if (pt.road_id) {
          setSelectedRoadId(pt.road_id);
        }
      });

      layerGroup.addLayer(circle);
    });
  }, [congestionData, selectedRoadId]);

  const summary = congestionData?.summary;
  const corridors = congestionData?.affected_corridors || [];
  const bottlenecks = congestionData?.detected_bottlenecks || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. DEMO / SYNTHETIC DATA BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong>{' '}
          Congestion metrics and forecasts are generated from prototype camera detection and trajectory data for SIH demonstration.
          Do not claim real-time operational traffic control without authorized live VMS/SCATS system integrations.
        </div>
      </div>

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>Corridor Congestion & Predictive Risk Forecasting</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            City-wide arterial congestion monitoring, bottleneck detection & prototype risk forecasting
          </p>
        </div>

        {/* Filters */}
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
            onClick={fetchCongestionData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-medium transition"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">{error}</div>
      )}

      {/* NETWORK CONGESTION SUMMARY KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Congested Corridors</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${summary?.congested_corridors_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary ? `${summary.congested_corridors_count} / ${summary.total_corridors_monitored}` : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">HIGH / CRITICAL density</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Avg Network Speed</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {summary?.average_network_speed_kmh != null ? `${summary.average_network_speed_kmh} km/h` : (loading ? '…' : 'N/A')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Across monitored arterials</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Highest Congestion Score</span>
          <span className="text-2xl font-black font-mono text-orange-400 mt-1 block">
            {summary?.highest_congestion_score != null ? `${summary.highest_congestion_score} / 100` : (loading ? '…' : 'N/A')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 truncate block">
            {summary?.highest_congestion_corridor || 'None flagged'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Critical Risk Corridors</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${summary?.critical_risk_count > 0 ? 'text-rose-400' : 'text-slate-700'}`}>
            {summary?.critical_risk_count ?? (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">&gt;80% estimated occupancy</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Busiest Corridor</span>
          <span className="text-sm font-bold text-slate-800 mt-1 block truncate">
            {summary?.highest_volume_corridor || (loading ? '…' : 'None')}
          </span>
          <span className="text-[10px] text-cyan-600 font-mono mt-1 block">Peak detection volume</span>
        </div>
      </div>

      {/* MAP & HOTSPOTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Map */}
        <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 relative z-0 shadow-lg min-h-[420px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 text-[11px] space-y-1.5 z-[1000] shadow-lg">
            <span className="font-bold text-slate-700 block text-[10px] uppercase font-mono tracking-wider">Estimated Traffic Density</span>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Low (&lt;45%)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Moderate (45–65%)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span>High (65–80%)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Critical (&gt;80%)</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-200 text-slate-500 text-[9px]">
              Circle size ∝ Estimated occupancy · Click point to select
            </div>
          </div>
        </div>

        {/* Active Hotspots Ranking */}
        <div className="lg:col-span-5 bg-white/70 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>Most Congested Corridors ({corridors.length})</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">Ranked by dynamic congestion score</span>
              </div>
            </div>

            <div className="space-y-2.5 mt-3 max-h-[360px] overflow-y-auto pr-1">
              {corridors.map((c: any, idx: number) => {
                const isSelected = selectedRoadId === c.road_id;
                return (
                  <div
                    key={c.road_id}
                    onClick={() => {
                      setSelectedRoadId(c.road_id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 truncate max-w-[210px]">
                        <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-800 truncate">{c.road_name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${severityBadge(c.severity)}`}>
                        {c.severity}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Occupancy</span>
                        <span className="font-bold text-slate-900">{c.estimated_occupancy_pct}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Speed</span>
                        <span className="font-bold text-emerald-400">
                          {c.avg_speed_kmh != null ? `${c.avg_speed_kmh} km/h` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Volume</span>
                        <span className="font-bold text-cyan-600">{c.volume_per_hour}/hr</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-1 border-t border-slate-900">
                      <span>{c.zone_name} • ~{c.duration_minutes}m duration</span>
                      <span>
                        {trendIcon(c.trend)}
                        {c.trend}
                      </span>
                    </div>

                    {c.has_reduced_coverage && (
                      <div className="mt-1.5 text-[9px] font-mono text-amber-400 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>⚠ Reduced coverage ({c.online_cameras_count}/{c.contributing_cameras_count} cameras online)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
            Visakhapatnam Arterial Radar · Score weights: 70% occupancy + 30% speed reduction
          </div>
        </div>
      </div>

      {/* BOTTLENECK DETECTION SECTION */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Detected Arterial Bottlenecks ({bottlenecks.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified through correlated speed reduction (&gt;20% below design baseline) and sustained vehicle ingress
            </p>
          </div>
          <Link
            to="/traffic-flow"
            className="flex items-center space-x-1.5 text-xs text-cyan-600 hover:text-cyan-600 font-mono transition"
          >
            <span>View OD Flow Corridors</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bottlenecks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bottlenecks.map((b: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50/70 border border-rose-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{b.road_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${severityBadge(b.severity)}`}>
                    {b.severity}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{b.zone_name}</div>
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-300 font-mono leading-relaxed">
                  {b.reason}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                  <div>Speed Drop: <strong className="text-rose-400">-{b.speed_drop_pct}%</strong></div>
                  <div>Confidence: <strong className="text-slate-800">{b.confidence_pct}%</strong></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            No critical bottlenecks detected in the selected time range.
          </div>
        )}
      </div>

      {/* FLAGSHIP PROTOTYPE CONGESTION PREDICTION & ADVISORY ACTION SECTION */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-900/60 shadow-xl space-y-6">
        
        {/* Prototype Header with Honest Compliance Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-950 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Prototype Congestion Risk Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Forecasts corridor density over N-minute horizons via pluggable spatio-temporal estimator
            </p>
          </div>

          {/* Mandatory Prototype Disclaimer Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-300 text-xs font-mono flex items-center space-x-2 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold">⚠ PROTOTYPE FORECAST — DEMO / SIMULATION PURPOSES ONLY</span>
          </div>
        </div>

        {/* Prediction Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Road Corridor</label>
            <select
              value={selectedRoadId}
              onChange={(e) => setSelectedRoadId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {roads.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.zone_name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Prediction Horizon</label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHorizonMinutes(m)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition ${
                    horizonMinutes === m
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  +{m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prediction Results & Forecast Chart */}
        {prediction && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {/* Forecast Chart: Observed vs Forecast */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 font-mono uppercase block">
                  Observed vs Forecasted Density (+{prediction.horizon_minutes}m)
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Range: {prediction.forecast_range}
                </span>
              </div>

              <div className="h-64 w-full p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.forecast_series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(val: any, name: string) => [val != null ? `${val}%` : 'N/A', name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="observed_density_pct" 
                      name="Observed Density (%)" 
                      stroke="#38bdf8" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: '#38bdf8' }} 
                      connectNulls 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted_density_pct" 
                      name="Forecast Density (%)" 
                      stroke="#818cf8" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#818cf8' }} 
                      connectNulls 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Historical Baseline Comparison Bar */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-[10px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500 block">Current Speed</span>
                  <span className="font-bold text-slate-800">{prediction.current_speed_kmh} km/h</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Design Baseline</span>
                  <span className="font-bold text-slate-500">{prediction.baseline_speed_kmh} km/h</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Speed Drop</span>
                  <span className="font-bold text-rose-400">-{prediction.speed_drop_pct}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ingress Rate</span>
                  <span className="font-bold text-cyan-600">{prediction.volume_per_hour} veh/hr</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment & Advisory Action */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Risk Progression Card */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Current Occupancy:</span>
                    <span className="font-bold text-slate-800">{prediction.current_density_pct}% ({prediction.current_risk})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Forecast (+{prediction.horizon_minutes}m):</span>
                    <span className="font-bold text-indigo-400 text-sm">{prediction.predicted_density_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono">
                    <span className="text-slate-500">Forecasted Risk:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${severityBadge(prediction.forecast_risk)}`}>
                      {prediction.forecast_risk}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Contributing Cameras: {prediction.online_cameras_count} / {prediction.contributing_cameras_count} online
                  </div>
                </div>

                {/* Advisory Action (Honest Non-control recommendation) */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/60 text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 text-indigo-300 font-bold font-mono text-[11px] uppercase">
                    <Info className="w-3.5 h-3.5" />
                    <span>Advisory Recommended Action</span>
                  </div>
                  <p className="text-[11px] text-slate-800 leading-relaxed font-sans">
                    {prediction.recommendation}
                  </p>
                  <div className="pt-2 border-t border-indigo-900/60 text-[10px] font-mono text-indigo-300/80">
                    <strong>WHY?</strong> {prediction.recommendation_reason}
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-200 text-[9px] text-slate-500 font-mono leading-tight">
                {prediction.disclaimer}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RELATED ANALYTICS NAVIGATION LINKS */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          to="/analytics"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <BarChart3 className="w-4 h-4 text-cyan-600" />
          <span>View Traffic Analytics</span>
        </Link>
        <Link
          to="/traffic-flow"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <GitFork className="w-4 h-4 text-indigo-400" />
          <span>View Origin-Destination Flows</span>
        </Link>
        <Link
          to="/cameras"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>View Camera Sensor Network</span>
        </Link>
        <Link
          to="/reports"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <FileDown className="w-4 h-4 text-amber-400" />
          <span>Export Congestion Report</span>
        </Link>
      </div>

    </div>
  );
}
