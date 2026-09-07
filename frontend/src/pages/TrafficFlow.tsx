import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import {
  GitFork,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Zap,
  BarChart3,
  Map,
  Layers,
  Clock,
  Gauge,
  Car,
  Activity,
  XCircle,
  FileDown
} from 'lucide-react';
import { api } from '../services/api';
import { Zone } from '../types';

const TIME_RANGES = [
  { label: 'Last 1 Hour',  value: '1h',  hours: 1 },
  { label: 'Last 6 Hours', value: '6h',  hours: 6 },
  { label: 'Last 24 Hours',value: '24h', hours: 24 },
  { label: 'Last 7 Days',  value: '7d',  hours: 168 },
];

function validationBadge(status: string) {
  switch (status) {
    case 'VERIFIED':       return 'bg-emerald-950/50 text-emerald-400 border-emerald-800';
    case 'PARTIAL_ANOMALY':return 'bg-amber-950/50 text-amber-400 border-amber-800';
    case 'ANOMALOUS':      return 'bg-rose-950/50 text-rose-400 border-rose-800';
    default:               return 'bg-slate-100 text-slate-500 border-slate-300';
  }
}

function validationLabel(status: string) {
  switch (status) {
    case 'VERIFIED':       return '✓ VERIFIED';
    case 'PARTIAL_ANOMALY':return '⚠ PARTIAL ANOMALY';
    case 'ANOMALOUS':      return '⚠ ANOMALOUS';
    default:               return status;
  }
}

export default function TrafficFlow() {
  const mapContainerRef  = useRef<HTMLDivElement>(null);
  const mapInstanceRef   = useRef<L.Map | null>(null);
  const flowsLayerRef    = useRef<L.LayerGroup | null>(null);

  const [odData,         setOdData]         = useState<any | null>(null);
  const [zones,          setZones]          = useState<Zone[]>([]);
  const [selectedZone,   setSelectedZone]   = useState<string>('all');
  const [timeRange,      setTimeRange]      = useState<string>('24h');
  const [viewMode,       setViewMode]       = useState<'camera' | 'zone'>('camera');
  const [selectedFlow,   setSelectedFlow]   = useState<any | null>(null);
  const [matrixCell,     setMatrixCell]     = useState<any | null>(null);
  const [activeTab,      setActiveTab]      = useState<'corridors' | 'matrix' | 'anomalies'>('corridors');
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  // Load zones once
  useEffect(() => {
    api.get<Zone[]>('/zones').then(setZones).catch(console.error);
  }, []);

  const fetchOd = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now   = new Date();
      const hours = TIME_RANGES.find(r => r.value === timeRange)?.hours ?? 24;
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      let url = `/analytics/od-transitions?view_mode=${viewMode}&start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(now.toISOString())}`;
      if (selectedZone !== 'all') url += `&zone_id=${selectedZone}`;

      const res = await api.get<any>(url);
      setOdData(res);
      if (res.camera_flows?.length > 0) setSelectedFlow(res.camera_flows[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to load OD data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedZone, viewMode]);

  useEffect(() => { fetchOd(); }, [fetchOd]);

  // Init Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7200, 83.2700],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    flowsLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Draw Flow Vectors — proportional weight + direction arrows
  useEffect(() => {
    if (!mapInstanceRef.current || !flowsLayerRef.current || !odData) return;

    const layerGroup = flowsLayerRef.current;
    layerGroup.clearLayers();

    const flows = odData.camera_flows || [];
    const maxCount = Math.max(1, ...flows.map((f: any) => f.transition_count));

    flows.forEach((f: any) => {
      if (!f.origin_coords || !f.dest_coords) return;

      const isSelected = selectedFlow?.pair_key === f.pair_key;
      const isAnomaly  = f.validation_status !== 'VERIFIED';

      // Weight proportional to volume
      const weight    = Math.max(2, Math.min(12, (f.transition_count / maxCount) * 10));
      const color     = isAnomaly ? '#f97316' : isSelected ? '#06b6d4' : '#3b82f6';
      const opacity   = isSelected ? 1.0 : 0.6;

      // Polyline for the corridor
      const polyline = L.polyline([f.origin_coords, f.dest_coords], {
        color,
        weight: isSelected ? weight + 3 : weight,
        opacity,
      });

      const popupContent = `
        <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 6px; min-width: 220px;">
          <div style="font-weight: bold; color: #0284c7; margin-bottom: 4px;">ORIGIN</div>
          <div style="font-weight: bold;">${f.origin_camera_id}</div>
          <div style="font-size: 11px; color: #475569;">${f.origin_camera_name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">Zone: ${f.origin_zone}</div>

          <div style="text-align:center; font-size: 18px; margin: 2px 0;">↓</div>

          <div style="font-weight: bold; color: #6366f1; margin-bottom: 4px;">DESTINATION</div>
          <div style="font-weight: bold;">${f.dest_camera_id}</div>
          <div style="font-size: 11px; color: #475569;">${f.dest_camera_name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">Zone: ${f.dest_zone}</div>

          <div style="background: #f1f5f9; border-radius: 6px; padding: 6px; font-size: 11px;">
            <div>Transitions: <strong>${f.transition_count}</strong></div>
            <div>Transit Time: <strong>${f.avg_travel_time_sec != null ? f.avg_travel_time_sec + 's' : 'N/A'}</strong></div>
            <div>Avg Speed: <strong>${f.avg_implied_speed_kmh != null ? f.avg_implied_speed_kmh + ' km/h' : 'N/A'}</strong></div>
            <div>Distance: <strong>${f.dist_km} km</strong></div>
            <div>Status: <strong style="color: ${f.validation_status === 'VERIFIED' ? '#10b981' : '#f97316'}">${f.validation_status}</strong></div>
          </div>
        </div>`;

      polyline.bindPopup(popupContent);
      polyline.on('click', () => setSelectedFlow(f));
      layerGroup.addLayer(polyline);

      // Direction arrow at midpoint
      const midLat = (f.origin_coords[0] + f.dest_coords[0]) / 2;
      const midLon = (f.origin_coords[1] + f.dest_coords[1]) / 2;
      const arrowIcon = L.divIcon({
        className: '',
        html: `<div style="color: ${color}; font-size: 16px; font-weight: bold; transform: rotate(${Math.atan2(
          f.dest_coords[1] - f.origin_coords[1],
          f.dest_coords[0] - f.origin_coords[0]
        ) * (180 / Math.PI)}deg);">▶</div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      layerGroup.addLayer(L.marker([midLat, midLon], { icon: arrowIcon }));

      // Origin marker
      const oColor = isAnomaly ? '#f97316' : '#0284c7';
      layerGroup.addLayer(L.circleMarker(f.origin_coords, {
        radius: isSelected ? 8 : 5,
        color: oColor,
        fillColor: oColor,
        fillOpacity: 0.9,
      }).bindTooltip(`ORIGIN: ${f.origin_camera_id}`, { direction: 'top' }));

      // Destination marker
      const dColor = isAnomaly ? '#f97316' : '#4f46e5';
      layerGroup.addLayer(L.circleMarker(f.dest_coords, {
        radius: isSelected ? 9 : 6,
        color: dColor,
        fillColor: dColor,
        fillOpacity: 0.9,
      }).bindTooltip(`DEST: ${f.dest_camera_id}`, { direction: 'top' }));
    });
  }, [odData, selectedFlow]);

  const flows       = odData?.camera_flows || [];
  const zoneFlows   = odData?.zone_flows   || [];
  const anomalies   = odData?.route_anomalies || [];
  const s           = odData?.summary;
  const matrix      = odData?.od_matrix   || {};
  const zoneLabels  = odData?.zone_labels || [];

  // OD matrix cell click handler
  const handleMatrixClick = (originZone: any, destZone: any, count: number) => {
    const detail = zoneFlows.find(
      (f: any) => f.origin_zone_id === parseInt(originZone.id) && f.dest_zone_id === parseInt(destZone.id)
    );
    setMatrixCell({ originZone, destZone, count, detail });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">

      {/* DEMO BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong>{' '}
          OD transitions are derived from prototype trajectory_events data seeded for SIH evaluation.
          Live city traffic requires an authorized data source connection.
        </div>
      </div>

      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-start justify-between gap-3 bg-white/80 p-4 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <GitFork className="w-4 h-4 text-cyan-600" />
            <span>Origin-Destination (OD) Flow Vectors & Transition Matrix</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">
            Inter-camera vehicle movement, transition durations, and corridor throughput
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          {/* Zone filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Corridors & Zones</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>

          {/* View mode */}
          <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden text-xs font-mono">
            <button
              onClick={() => setViewMode('camera')}
              className={`px-3 py-1.5 transition ${viewMode === 'camera' ? 'bg-cyan-900 text-cyan-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >Camera</button>
            <button
              onClick={() => setViewMode('zone')}
              className={`px-3 py-1.5 transition ${viewMode === 'zone' ? 'bg-cyan-900 text-cyan-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >Zone</button>
          </div>

          <button
            onClick={fetchOd}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 border border-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">{error}</div>
      )}

      {/* NETWORK OD SUMMARY KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Valid Transitions</span>
          <span className="text-2xl font-black font-mono text-cyan-600 mt-1 block">
            {s?.valid_transitions?.toLocaleString() ?? (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Camera-to-camera hops</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Unique Vehicles</span>
          <span className="text-2xl font-black font-mono text-blue-400 mt-1 block">
            {s?.unique_vehicles?.toLocaleString() ?? (loading ? '…' : '—')}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Tracked in window</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Avg Transit Time</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {s?.avg_transit_time_sec != null ? `${Math.round(s.avg_transit_time_sec)}s` : (loading ? '…' : 'N/A')}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Valid hops only</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Avg Transit Speed</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {s?.avg_transit_speed_kmh != null ? `${s.avg_transit_speed_kmh} km/h` : (loading ? '…' : 'N/A')}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Physics-validated</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Route Anomalies</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${s?.route_anomalies > 0 ? 'text-rose-400' : 'text-slate-700'}`}>
            {s?.route_anomalies ?? (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">Implausible transitions</span>
        </div>
      </div>

      {/* TOP CORRIDOR LABEL */}
      {s?.top_corridor && (
        <div className="flex items-center space-x-2 text-xs font-mono px-4 py-2 bg-white/50 border border-slate-200 rounded-xl">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-500">Top OD Corridor:</span>
          <span className="font-bold text-amber-400">{s.top_corridor}</span>
          {s.excluded_records > 0 && (
            <span className="ml-auto text-slate-600">⚠ {s.excluded_records} records excluded (invalid timestamps / same camera)</span>
          )}
        </div>
      )}

      {/* MAIN LAYOUT: MAP + PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* MAP */}
        <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 relative z-0 shadow-lg" style={{ minHeight: '420px' }}>
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '420px' }} />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 text-[11px] space-y-1.5 z-[1000] shadow-lg">
            <span className="font-bold text-slate-700 block text-[10px] uppercase font-mono tracking-wider">OD Vector Legend</span>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-400 block" />
              <span>Origin Sensor</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-indigo-500 border border-indigo-400 block" />
              <span>Destination Sensor</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="inline-block w-8 h-0.5 bg-blue-500" />
              <span>Normal flow (→)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="inline-block w-8 h-0.5 bg-orange-500" />
              <span>⚠ Anomaly vector</span>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-200 text-slate-500 text-[9px]">
              Line thickness ∝ transition volume
            </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="lg:col-span-5 bg-white/70 border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-mono">
            {(['corridors', 'matrix', 'anomalies'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 capitalize transition ${
                  activeTab === tab ? 'bg-slate-100 text-cyan-600 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {tab === 'corridors' ? `Top Corridors (${flows.length})` : tab === 'matrix' ? 'OD Matrix' : `Anomalies (${anomalies.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* TOP CORRIDORS TAB */}
            {activeTab === 'corridors' && (
              <>
                {flows.length > 0 ? flows.slice(0, 12).map((f: any, idx: number) => {
                  const isSelected = selectedFlow?.pair_key === f.pair_key;
                  return (
                    <div
                      key={f.pair_key}
                      onClick={() => {
                        setSelectedFlow(f);
                        if (mapInstanceRef.current) mapInstanceRef.current.panTo(f.origin_coords);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/40'
                      }`}
                    >
                      {/* Rank + Validation */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">#{idx + 1}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${validationBadge(f.validation_status)}`}>
                          {validationLabel(f.validation_status)}
                        </span>
                      </div>

                      {/* Origin → Dest cameras */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-cyan-600 font-mono uppercase tracking-wide">Origin</div>
                        <div className="text-xs font-bold text-slate-800 font-mono">{f.origin_camera_id}</div>
                        <div className="text-[10px] text-slate-500 truncate">{f.origin_camera_name}</div>
                        <div className="flex items-center justify-center py-1">
                          <ArrowRight className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wide">Destination</div>
                        <div className="text-xs font-bold text-slate-800 font-mono">{f.dest_camera_id}</div>
                        <div className="text-[10px] text-slate-500 truncate">{f.dest_camera_name}</div>
                      </div>

                      {/* Zone transition */}
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-500">
                        Zone: <span className="text-cyan-600">{f.origin_zone}</span>
                        <ArrowRight className="inline w-3 h-3 mx-0.5" />
                        <span className="text-indigo-400">{f.dest_zone}</span>
                      </div>

                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-500 block">Transitions</span>
                          <span className="font-bold text-slate-900">{f.transition_count}</span>
                          <span className="text-slate-600"> ({f.pct_of_total}%)</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Transit Time</span>
                          <span className="font-bold text-emerald-400">{f.avg_travel_time_sec != null ? Math.round(f.avg_travel_time_sec) + 's' : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Avg Speed</span>
                          <span className="font-bold text-amber-400">{f.avg_implied_speed_kmh != null ? f.avg_implied_speed_kmh + ' km/h' : 'N/A'}</span>
                        </div>
                      </div>

                      {/* Throughput */}
                      <div className="mt-2 text-[10px] font-mono text-slate-500">
                        Throughput: <span className="text-slate-700">{f.throughput_per_hour}/hr</span>
                        <span className="mx-2">•</span>
                        Distance: <span className="text-slate-700">{f.dist_km} km</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-slate-500 text-xs text-center py-8">
                    {loading ? 'Loading OD transitions…' : 'No transitions found for this time range.'}
                  </div>
                )}
              </>
            )}

            {/* OD MATRIX TAB */}
            {activeTab === 'matrix' && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-mono">Click a cell to inspect the zone-to-zone flow details.</p>
                {zoneLabels.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="text-[10px] font-mono border-collapse w-full">
                      <thead>
                        <tr>
                          <th className="p-1.5 text-slate-500 text-right text-[9px] font-mono border border-slate-200 bg-slate-50">
                            ↓ Origin / Dest →
                          </th>
                          {zoneLabels.map((z: any) => (
                            <th key={z.id} className="p-1.5 text-center text-[9px] font-bold text-cyan-600 border border-slate-200 bg-slate-50 min-w-[80px] truncate">
                              {z.name.split(' ')[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {zoneLabels.map((originZ: any) => (
                          <tr key={originZ.id}>
                            <td className="p-1.5 text-[9px] font-bold text-indigo-400 border border-slate-200 bg-slate-50 whitespace-nowrap">
                              {originZ.name.split(' ')[0]}
                            </td>
                            {zoneLabels.map((destZ: any) => {
                              const count = matrix[originZ.id]?.[destZ.id] ?? 0;
                              const isSame = originZ.id === destZ.id;
                              const maxVal = Math.max(1, ...Object.values(matrix).flatMap((row: any) => Object.values(row as object).map(Number)));
                              const intensity = count / maxVal;
                              const isSelected = matrixCell?.originZone?.id === originZ.id && matrixCell?.destZone?.id === destZ.id;
                              return (
                                <td
                                  key={destZ.id}
                                  onClick={() => !isSame && count > 0 && handleMatrixClick(originZ, destZ, count)}
                                  className={`p-1.5 text-center border border-slate-200 transition cursor-pointer ${
                                    isSame ? 'bg-white text-slate-700 cursor-default' :
                                    isSelected ? 'bg-cyan-900/60 border-cyan-600 text-cyan-600 font-bold' :
                                    count > 0
                                      ? 'hover:border-cyan-700 text-slate-900 font-bold'
                                      : 'text-slate-700'
                                  }`}
                                  style={!isSame && count > 0 ? {
                                    backgroundColor: `rgba(6, 182, 212, ${intensity * 0.35})`
                                  } : undefined}
                                  title={isSame ? '—' : `${originZ.name} → ${destZ.name}: ${count} transitions`}
                                >
                                  {isSame ? '—' : count > 0 ? count : '·'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs text-center py-8">
                    {loading ? 'Building OD matrix…' : 'No matrix data available.'}
                  </div>
                )}

                {/* Matrix cell detail panel */}
                {matrixCell && (
                  <div className="p-3 rounded-xl border border-cyan-800 bg-cyan-950/30 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-cyan-600">
                      <span>{matrixCell.originZone.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{matrixCell.destZone.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Transitions</span>
                        <span className="font-bold text-slate-900">{matrixCell.count}</span>
                      </div>
                      {matrixCell.detail && (
                        <>
                          <div>
                            <span className="text-slate-500 block">Avg Transit Time</span>
                            <span className="font-bold text-emerald-400">
                              {matrixCell.detail.avg_travel_time_sec != null ? Math.round(matrixCell.detail.avg_travel_time_sec) + 's' : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Avg Speed</span>
                            <span className="font-bold text-amber-400">
                              {matrixCell.detail.avg_implied_speed_kmh != null ? matrixCell.detail.avg_implied_speed_kmh + ' km/h' : 'N/A'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <Link
                      to={`/vehicles?zone=${matrixCell.originZone.id}`}
                      className="text-[10px] text-cyan-600 hover:text-cyan-600 flex items-center space-x-1"
                    >
                      <Car className="w-3 h-3" /><span>View Vehicles in Origin Zone</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ROUTE ANOMALIES TAB */}
            {activeTab === 'anomalies' && (
              <>
                {anomalies.length > 0 ? anomalies.map((a: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border border-rose-800/60 bg-rose-950/30 space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-rose-400 font-mono uppercase tracking-wide">⚠ Physically Implausible</span>
                    </div>
                    <div className="text-xs font-mono space-y-1">
                      <div className="text-cyan-600 font-bold">{a.origin_camera_id} <span className="text-slate-500">{a.origin_camera_name}</span></div>
                      <div className="flex items-center text-slate-600"><ArrowRight className="w-3 h-3" /></div>
                      <div className="text-indigo-400 font-bold">{a.dest_camera_id} <span className="text-slate-500">{a.dest_camera_name}</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                      <div><span className="text-slate-500 block">Distance</span><span className="text-slate-800">{a.dist_km} km</span></div>
                      <div><span className="text-slate-500 block">Elapsed</span><span className="text-slate-800">{a.elapsed_sec}s</span></div>
                      <div><span className="text-slate-500 block">Req. Speed</span><span className="text-rose-400 font-bold">{a.implied_speed_kmh} km/h</span></div>
                    </div>
                    <p className="text-[9px] text-rose-300 font-mono">{a.reason}</p>
                    <p className="text-[9px] text-slate-500 font-mono">
                      This is a ROUTE ANOMALY — not evidence of criminal activity. Possible causes: data error, missed intermediate camera, or duplicate detection.
                    </p>
                  </div>
                )) : (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-emerald-400 text-xs font-mono">No route anomalies detected</p>
                    <p className="text-slate-600 text-[10px]">All transitions within physics thresholds</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
            Visakhapatnam OD Topology Grid · Physics threshold: 120 km/h
          </div>
        </div>
      </div>

      {/* TOP ZONE-TO-ZONE FLOWS */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <span>Top Origin → Destination Zone Flows</span>
        </h2>
        {zoneFlows.length > 0 ? (
          <div className="space-y-2">
            {zoneFlows.slice(0, 8).map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-200 hover:border-slate-300 transition">
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-slate-500 font-bold">{i + 1}.</span>
                  <span className="text-cyan-600 font-bold">{f.origin_zone}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <span className="text-indigo-400 font-bold">{f.dest_zone}</span>
                </div>
                <div className="text-right font-mono text-xs space-x-3">
                  <span className="font-bold text-slate-900">{f.transition_count.toLocaleString()}</span>
                  <span className="text-slate-500">transitions</span>
                  <span className="text-slate-600">({f.pct_of_total}%)</span>
                  {f.avg_implied_speed_kmh && (
                    <span className="text-amber-400 text-[10px]">{f.avg_implied_speed_kmh} km/h</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-xs">{loading ? 'Loading…' : 'No zone flow data.'}</p>
        )}
      </div>

      {/* INTEGRATION LINKS */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/analytics"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <BarChart3 className="w-4 h-4 text-cyan-600" />
          <span>View Traffic Analytics</span>
        </Link>
        <Link
          to="/congestion"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Activity className="w-4 h-4 text-rose-400" />
          <span>View Congestion Heatmap</span>
        </Link>
        <Link
          to="/vehicles"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Car className="w-4 h-4 text-blue-400" />
          <span>Vehicle Registry</span>
        </Link>
        <Link
          to="/reports"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <FileDown className="w-4 h-4 text-emerald-400" />
          <span>Export Report</span>
        </Link>
      </div>
    </div>
  );
}
