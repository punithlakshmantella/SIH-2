import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { 
  Route, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Clock, 
  MapPin, 
  Radio, 
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Car,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  FileText,
  Camera,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { TrajectoryResponse, TrajectoryPoint } from '../types';

export default function TrajectoryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPlate = searchParams.get('plate') || 'AP39AB1234';

  const [plateInput, setPlateInput] = useState(initialPlate);
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback Animation States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const fetchTrajectory = async (plateToQuery: string) => {
    if (!plateToQuery.trim()) return;
    setLoading(true);
    setError(null);
    setIsPlaying(false);

    try {
      const data = await api.get<TrajectoryResponse>(`/vehicles/${encodeURIComponent(plateToQuery.trim().toUpperCase())}/trajectory`);
      setTrajectory(data);
      setSelectedPointIndex(0);
      setCurrentStepIndex(0);
      setSearchParams({ plate: plateToQuery.trim().toUpperCase() });
    } catch (err: any) {
      setError(err.message || 'Failed to reconstruct vehicle trajectory');
      setTrajectory(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrajectory(initialPlate);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrajectory(plateInput);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7200, 83.2700],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    routeLayersRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Trajectory on Map when trajectory data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayersRef.current || !trajectory || !trajectory.points || trajectory.points.length === 0) return;

    const map = mapInstanceRef.current;
    const layerGroup = routeLayersRef.current;
    layerGroup.clearLayers();

    const points = trajectory.points;
    const latLngs: [number, number][] = points.map((p) => [p.latitude, p.longitude]);

    // 1. Draw Polylines between consecutive points with multi-pattern treatment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segment: [number, number][] = [[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]];

      const isImpossible = p2.is_impossible_transition || p2.match_type === 'FLAGGED_IMPOSSIBLE';
      const isDegraded = p2.is_low_confidence || p2.match_type === 'OCR_ASSISTED_MATCH' || p2.match_type === 'PROBABILISTIC_MATCH';

      let lineColor = '#06b6d4'; // Cyan for verified
      let dashArray: string | undefined = undefined;
      let lineWeight = 3.5;

      if (isImpossible) {
        lineColor = '#ef4444'; // Red for impossible / anomaly
        dashArray = '7, 7';
        lineWeight = 4.5;
      } else if (isDegraded) {
        lineColor = '#f59e0b'; // Amber for degraded / OCR-assisted
        dashArray = '5, 5';
        lineWeight = 3.5;
      }

      const polyline = L.polyline(segment, {
        color: lineColor,
        weight: lineWeight,
        opacity: 0.9,
        dashArray: dashArray,
      });

      layerGroup.addLayer(polyline);
    }

    // 2. Draw Waypoint Markers
    points.forEach((pt, idx) => {
      const isImpossible = pt.is_impossible_transition || pt.match_type === 'FLAGGED_IMPOSSIBLE';
      const isDegraded = pt.is_low_confidence || pt.match_type === 'OCR_ASSISTED_MATCH' || pt.match_type === 'PROBABILISTIC_MATCH';

      const markerBg = isImpossible ? '#ef4444' : isDegraded ? '#f59e0b' : '#06b6d4';
      const matchLabel = isImpossible ? 'Flagged Route Anomaly' : isDegraded ? 'OCR-Assisted Match' : 'Direct Verified';

      const pointIcon = L.divIcon({
        className: 'custom-trajectory-point',
        html: `
          <div style="
            background-color: ${markerBg};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2.5px solid #0f172a;
            box-shadow: 0 0 14px ${markerBg}cc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: monospace;
            font-size: 12px;
            font-weight: 900;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([pt.latitude, pt.longitude], { icon: pointIcon });

      const distDisplay = pt.distance_from_prev_km !== null && pt.distance_from_prev_km !== undefined ? `${pt.distance_from_prev_km} km` : '—';
      const speedDisplay = pt.implied_speed_kmh !== null && pt.implied_speed_kmh !== undefined ? `${pt.implied_speed_kmh} km/h` : '—';

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;">
            <strong style="color: #0284c7; font-family: monospace;">STEP 0${idx + 1}: ${pt.camera_id}</strong>
            <span style="font-size: 10px; font-weight: bold; color: ${markerBg};">${matchLabel}</span>
          </div>
          <strong>${pt.camera_name}</strong><br/>
          <span style="color: #64748b; font-size: 11px;">${pt.road_name || 'Corridor'} • ${pt.zone_name}</span><br/>
          
          <div style="margin-top: 6px; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; line-height: 1.4;">
            <div>Plate Read: <strong style="font-family: monospace;">${pt.raw_plate_read || trajectory.primary_plate}</strong></div>
            <div>OCR Confidence: <strong>${pt.ocr_confidence ? Math.round(pt.ocr_confidence * 100) : 95}%</strong></div>
            <div>Timestamp: <strong style="font-family: monospace;">${new Date(pt.timestamp).toLocaleTimeString()}</strong></div>
            <div>Transit Leg: <strong>${distDisplay}</strong> (${speedDisplay})</div>
            ${isDegraded ? '<div style="color: #b45309; font-weight: bold; margin-top: 2px;">~ OCR-Assisted Spatio-Temporal Match</div>' : ''}
            ${isImpossible ? '<div style="color: #b91c1c; font-weight: bold; margin-top: 2px;">⚠ Flagged Speed Anomaly</div>' : ''}
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedPointIndex(idx);
        setCurrentStepIndex(idx);
      });

      layerGroup.addLayer(marker);
    });

    // 3. Create Moving Vehicle Cursor Marker
    const startPt = points[0];
    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-cursor',
      html: `
        <div style="
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 20px #06b6d4ee;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          font-size: 16px;
        ">
          🚘
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const vMarker = L.marker([startPt.latitude, startPt.longitude], { icon: vehicleIcon, zIndexOffset: 1000 });
    layerGroup.addLayer(vMarker);
    vehicleMarkerRef.current = vMarker;

    // Fit map bounds to trajectory with padding
    if (latLngs.length > 0) {
      map.fitBounds(latLngs, { padding: [50, 50] });
    }
  }, [trajectory]);

  // Handle Playback Interval Animation
  useEffect(() => {
    if (!isPlaying || !trajectory || !trajectory.points || trajectory.points.length === 0) return;

    const intervalTime = Math.max(400, 2000 / playbackSpeed);

    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const nextIdx = prev + 1;
        if (nextIdx >= trajectory.points.length) {
          setIsPlaying(false);
          return prev;
        }

        const nextPoint = trajectory.points[nextIdx];
        setSelectedPointIndex(nextIdx);

        // Move vehicle marker smoothly
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([nextPoint.latitude, nextPoint.longitude]);
        }

        // Pan map slightly if out of view
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([nextPoint.latitude, nextPoint.longitude]);
        }

        return nextIdx;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, trajectory]);

  // Jump to step manually
  const jumpToStep = (index: number) => {
    if (!trajectory || !trajectory.points || index < 0 || index >= trajectory.points.length) return;
    setCurrentStepIndex(index);
    setSelectedPointIndex(index);

    const pt = trajectory.points[index];
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([pt.latitude, pt.longitude]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([pt.latitude, pt.longitude]);
    }
  };

  const selectedPoint = trajectory?.points?.[selectedPointIndex];
  const firstPoint = trajectory?.points?.[0];
  const lastPoint = trajectory?.points && trajectory.points.length > 0 ? trajectory.points[trajectory.points.length - 1] : null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* 19. DEMO / SYNTHETIC TRAJECTORY DATA BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-center space-x-3 text-amber-300 shadow-md">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="text-xs sm:text-sm">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC TRAJECTORY DATA:</strong> Telemetry checkpoints, vehicle timestamps, and spatial routes are synthetic prototype data for SIH evaluation. Live CCTV integration requires authorized VMS connection.
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Route className="w-5 h-5 text-cyan-600" />
            <span>Single-Vehicle Trajectory Reconstruction & Playback</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-600 border border-cyan-800 font-mono font-bold">
              SIH26127 FLAGSHIP
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Spatio-temporal camera continuity, physics-validated transitions, and Re-ID degraded read recovery
          </p>
        </div>

        {/* Plate Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value)}
              placeholder="e.g. AP39AB1234"
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 uppercase font-mono focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow-md shadow-cyan-600/20"
          >
            {loading ? 'Tracing...' : 'Reconstruct'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* 14. VEHICLE SUMMARY HERO SECTION */}
      {trajectory && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-cyan-600 shadow-inner">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-black font-mono text-cyan-600 tracking-wider">
                    {trajectory.primary_plate}
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono capitalize">
                    {trajectory.vehicle_color} {trajectory.vehicle_type}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5 flex items-center space-x-2">
                  <span>{trajectory.status_summary}</span>
                </p>
              </div>
            </div>

            {/* First & Last Detection Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">First Detected</span>
                <span className="text-slate-800 font-bold block truncate" title={firstPoint?.camera_name}>
                  {firstPoint ? firstPoint.camera_id : '—'}
                </span>
                <span className="text-[10px] text-cyan-600">
                  {firstPoint ? new Date(firstPoint.timestamp).toLocaleTimeString() : '—'}
                </span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Last Detected</span>
                <span className="text-slate-800 font-bold block truncate" title={lastPoint?.camera_name}>
                  {lastPoint ? lastPoint.camera_id : '—'}
                </span>
                <span className="text-[10px] text-cyan-600">
                  {lastPoint ? new Date(lastPoint.timestamp).toLocaleTimeString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-3 border-t border-slate-200">
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Total Checkpoints</span>
              <span className="text-base font-bold text-slate-900 font-mono">{trajectory.total_points}</span>
            </div>
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Direct Verified</span>
              <span className="text-base font-bold text-cyan-600 font-mono">
                {trajectory.verified_points_count ?? trajectory.points.filter(p => p.match_type === 'DIRECT_VERIFIED').length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">OCR-Assisted / Re-ID</span>
              <span className="text-base font-bold text-amber-400 font-mono">
                {trajectory.degraded_points_count ?? trajectory.points.filter(p => p.match_type === 'OCR_ASSISTED_MATCH' || p.is_low_confidence).length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Route Anomalies</span>
              <span className="text-base font-bold text-rose-400 font-mono">
                {trajectory.anomaly_points_count ?? trajectory.points.filter(p => p.is_impossible_transition).length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Tracked Distance</span>
              <span className="text-base font-bold text-cyan-600 font-mono">
                {trajectory.total_distance_km !== null && trajectory.total_distance_km !== undefined ? `${trajectory.total_distance_km} km` : '—'}
              </span>
            </div>
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Average Speed</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {trajectory.avg_speed_kmh !== null && trajectory.avg_speed_kmh !== undefined ? `${trajectory.avg_speed_kmh} km/h` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace: Leaflet Map + Controls & Evidence Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        
        {/* Left/Center: Interactive Map & Playback Controls */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white/60 shadow-xl">
          
          {/* Map Container */}
          <div className="flex-1 relative z-0 min-h-[420px]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* 11. MAP LEGEND OVERLAY (Multi-modal: Color + Line Pattern + Icon + Label) */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 text-[11px] space-y-2 z-[1000] shadow-xl max-w-xs">
              <span className="font-bold text-slate-800 block text-[10px] uppercase font-mono tracking-wider border-b border-slate-200 pb-1">
                Route Leg Types & Legends
              </span>
              
              <div className="flex items-center space-x-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                <span className="w-5 h-0.5 bg-cyan-400 inline-block"></span>
                <span className="font-medium text-[10px]">Direct Verified Checkpoint</span>
              </div>
              
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-400 inline-block"></span>
                <span className="font-medium text-[10px]">OCR-Assisted / Probabilistic Match</span>
              </div>
              
              <div className="flex items-center space-x-2 text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span className="w-5 h-0.5 border-t-2 border-dashed border-rose-400 inline-block"></span>
                <span className="font-medium text-[10px]">Flagged Route / Speed Anomaly</span>
              </div>
            </div>
          </div>

          {/* 12, 13. PLAYBACK CONTROLS FOOTER */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
            <div className="flex items-center space-x-2">
              
              {/* Restart Button */}
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  jumpToStep(0);
                }}
                disabled={!trajectory || trajectory.points.length === 0}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition disabled:opacity-40"
                title="Restart Route"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Previous Step */}
              <button
                type="button"
                onClick={() => jumpToStep(Math.max(0, currentStepIndex - 1))}
                disabled={!trajectory || currentStepIndex === 0}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition disabled:opacity-40"
                title="Previous Checkpoint"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!trajectory || trajectory.points.length === 0}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow-md shadow-cyan-600/20"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Route'}</span>
              </button>

              {/* Next Step */}
              <button
                type="button"
                onClick={() => jumpToStep(Math.min((trajectory?.points.length || 1) - 1, currentStepIndex + 1))}
                disabled={!trajectory || currentStepIndex === trajectory.points.length - 1}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition disabled:opacity-40"
                title="Next Checkpoint"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Speed Multiplier Presets */}
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                {[1, 2, 5, 10].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                      playbackSpeed === spd
                        ? 'bg-cyan-950 text-cyan-600 border border-cyan-800'
                        : 'text-slate-500 hover:bg-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scrubber Slider */}
            {trajectory && trajectory.points.length > 0 && (
              <div className="flex items-center space-x-3 flex-1 max-w-xs">
                <input
                  type="range"
                  min="0"
                  max={trajectory.points.length - 1}
                  value={currentStepIndex}
                  onChange={(e) => jumpToStep(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-cyan-600 font-bold whitespace-nowrap">
                  STEP 0{currentStepIndex + 1} / 0{trajectory.points.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkpoint & Transition Inspector */}
        <div className="lg:col-span-4 bg-white/70 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto space-y-4 shadow-xl">
          {trajectory && selectedPoint ? (
            <div className="space-y-4">
              
              {/* Step Header */}
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-slate-500 font-bold block">
                    Active Telemetry Inspector
                  </span>
                  <span className="text-lg font-black font-mono text-cyan-600">
                    STEP 0{selectedPointIndex + 1} OF 0{trajectory.points.length}
                  </span>
                </div>

                <span className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                  selectedPoint.is_impossible_transition
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : selectedPoint.is_low_confidence
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {selectedPoint.is_impossible_transition
                    ? 'Route Anomaly'
                    : selectedPoint.is_low_confidence
                      ? 'OCR-Assisted'
                      : 'Direct Verified'}
                </span>
              </div>

              {/* 4, 5. CURRENT CHECKPOINT PANEL */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                selectedPoint.is_impossible_transition
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : selectedPoint.is_low_confidence
                    ? 'bg-amber-950/30 border-amber-800 text-amber-300'
                    : 'bg-slate-50/60 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={selectedPoint.camera_name}>
                    {selectedPoint.camera_name}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {selectedPoint.camera_id}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500">
                  {selectedPoint.road_name || 'Corridor'} • {selectedPoint.zone_name} • {selectedPoint.direction}B
                </p>

                {/* Degraded Match Notice (5. DEGRADED MATCH) */}
                {selectedPoint.is_low_confidence && (
                  <div className="pt-2 border-t border-amber-800/60 space-y-1">
                    <span className="font-bold text-[11px] flex items-center space-x-1 text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>OCR-Assisted / Probabilistic Match</span>
                    </span>
                    <p className="text-[10px] text-amber-300/90 leading-relaxed font-mono">
                      Raw OCR read '{selectedPoint.raw_plate_read}' linked to '{trajectory.primary_plate}' via spatio-temporal route continuity.
                    </p>
                  </div>
                )}

                {/* Impossible Transition Alert (7. IMPOSSIBLE TRANSITION DETECTION) */}
                {selectedPoint.is_impossible_transition && (
                  <div className="pt-2 border-t border-rose-800/60 space-y-1">
                    <span className="font-bold text-[11px] flex items-center space-x-1 text-rose-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>⚠ IMPOSSIBLE TRANSITION (ROUTE ANOMALY)</span>
                    </span>
                    <p className="text-[10px] text-rose-300/90 leading-relaxed font-mono">
                      {selectedPoint.anomaly_flags?.IMPOSSIBLE_TRANSITION || "Required travel speed exceeds configured threshold. Operator verification required."}
                    </p>
                  </div>
                )}
              </div>

              {/* 1, 6. TRANSIT PHYSICS & DETECTION TELEMETRY */}
              <div className="space-y-2 text-xs text-slate-700 bg-slate-50/60 p-4 rounded-xl border border-slate-200 font-mono">
                <div className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
                  <span>Transit Leg Telemetry</span>
                  <span className="text-[9px] text-slate-600">Threshold: {trajectory.max_speed_threshold_kmh || 120} km/h</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-700">{new Date(selectedPoint.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Raw Plate Read:</span>
                  <span className="font-bold text-slate-900">{selectedPoint.raw_plate_read || trajectory.primary_plate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">OCR Confidence:</span>
                  <span className={`font-bold ${selectedPoint.is_low_confidence ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedPoint.ocr_confidence ? Math.round(selectedPoint.ocr_confidence * 100) : 95}%
                  </span>
                </div>
                
                {/* 1. FIRST CHECKPOINT DISPLAY: '—' when no previous point */}
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Leg Distance:</span>
                  <span className="text-slate-800 font-bold">
                    {selectedPoint.distance_from_prev_km !== null && selectedPoint.distance_from_prev_km !== undefined
                      ? `${selectedPoint.distance_from_prev_km} km`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Transit Travel Time:</span>
                  <span className="text-slate-800">
                    {selectedPoint.travel_time_sec !== null && selectedPoint.travel_time_sec !== undefined
                      ? `${selectedPoint.travel_time_sec}s`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Implied Transit Speed:</span>
                  <span className={`font-bold ${
                    selectedPoint.is_impossible_transition 
                      ? 'text-rose-400' 
                      : selectedPoint.implied_speed_kmh 
                        ? 'text-cyan-600' 
                        : 'text-slate-500'
                  }`}>
                    {selectedPoint.implied_speed_kmh !== null && selectedPoint.implied_speed_kmh !== undefined
                      ? `${selectedPoint.implied_speed_kmh} km/h`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* 20, 21, 22, 23. CROSS-MODULE INTEGRATION ACTIONS */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to={`/vehicles/${trajectory.primary_plate}`}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-[11px] font-bold border border-slate-300 transition flex items-center justify-center space-x-1.5"
                >
                  <Car className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Vehicle Profile</span>
                </Link>

                <Link
                  to={`/cameras/${selectedPoint.camera_id}`}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-[11px] font-bold border border-slate-300 transition flex items-center justify-center space-x-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Camera</span>
                </Link>

                <Link
                  to={`/anpr`}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-[11px] font-bold border border-slate-300 transition flex items-center justify-center space-x-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect ANPR</span>
                </Link>

                <button
                  type="button"
                  onClick={() => alert(`Trajectory lead for vehicle ${trajectory.primary_plate} staged for investigation case packet.`)}
                  className="p-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-600 border border-cyan-800 text-[11px] font-bold transition flex items-center justify-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Add to Case</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 space-y-2">
              <Route className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Enter a license plate to reconstruct and animate continuous trajectory.</p>
            </div>
          )}

          {/* 17, 18. CONFIDENCE & EVIDENCE FOOTER */}
          <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>Visakhapatnam Trajectory Graph</span>
            <span>Physics-Validated Continuity</span>
          </div>
        </div>
      </div>

      {/* 16. VISAKHAPATNAM TRAJECTORY GRAPH */}
      {trajectory && trajectory.points && trajectory.points.length > 0 && (
        <div className="p-5 rounded-2xl bg-white/60 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5">
              <Route className="w-4 h-4 text-cyan-600" />
              <span>Visakhapatnam Trajectory Node Sequence ({trajectory.points.length} Checkpoints)</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Chronological Spatio-Temporal Sequence</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {trajectory.points.map((pt, idx) => {
              const isSelected = selectedPointIndex === idx;
              const isImpossible = pt.is_impossible_transition;
              const isDegraded = pt.is_low_confidence;

              return (
                <React.Fragment key={idx}>
                  <div
                    onClick={() => jumpToStep(idx)}
                    className={`flex flex-col p-3 rounded-xl border text-center cursor-pointer transition w-[135px] ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 shadow-lg shadow-cyan-900/30'
                        : isImpossible
                          ? 'bg-rose-950/30 border-rose-800 hover:border-rose-600'
                          : isDegraded
                            ? 'bg-amber-950/30 border-amber-800 hover:border-amber-600'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                      <span>0{idx + 1}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        isImpossible ? 'bg-rose-500' : isDegraded ? 'bg-amber-500' : 'bg-cyan-400'
                      }`}></span>
                    </div>

                    <span className="text-[11px] font-bold text-slate-800 truncate block" title={pt.camera_name}>
                      {pt.camera_name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-cyan-600 font-mono block mt-0.5">
                      {new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-slate-500 truncate block mt-0.5">
                      {pt.zone_name}
                    </span>
                  </div>

                  {idx < trajectory.points.length - 1 && (
                    <div className="flex flex-col items-center">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-[8px] font-mono text-slate-500 mt-0.5">
                        {trajectory.points[idx + 1].distance_from_prev_km ? `${trajectory.points[idx + 1].distance_from_prev_km}km` : ''}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
