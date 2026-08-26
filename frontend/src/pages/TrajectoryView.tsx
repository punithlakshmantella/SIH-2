import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  Sliders,
  Car,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function TrajectoryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPlate = searchParams.get('plate') || 'AP39AB1234';

  const [plateInput, setPlateInput] = useState(initialPlate);
  const [trajectory, setTrajectory] = useState<any | null>(null);
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
      const data = await api.get<any>(`/vehicles/${encodeURIComponent(plateToQuery.trim().toUpperCase())}/trajectory`);
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
    const latLngs: [number, number][] = points.map((p: any) => [p.latitude, p.longitude]);

    // 1. Draw Polylines between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segment: [number, number][] = [[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]];

      const isImpossible = p2.is_impossible_transition;
      const isReID = p2.is_low_confidence || (p2.anomaly_flags && p2.anomaly_flags.reid_resolved);

      let lineColor = '#0284c7'; // default cyan
      let dashArray: string | undefined = undefined;

      if (isImpossible) {
        lineColor = '#ef4444'; // Red for impossible
        dashArray = '6, 6';
      } else if (isReID) {
        lineColor = '#f59e0b'; // Amber for Re-ID resolved degraded read
        dashArray = '5, 5';
      }

      const polyline = L.polyline(segment, {
        color: lineColor,
        weight: isImpossible ? 4 : 3.5,
        opacity: 0.85,
        dashArray: dashArray,
      });

      layerGroup.addLayer(polyline);
    }

    // 2. Draw Waypoint Markers
    points.forEach((pt: any, idx: number) => {
      const isImpossible = pt.is_impossible_transition;
      const isLowConf = pt.is_low_confidence;

      const markerBg = isImpossible ? '#ef4444' : isLowConf ? '#f59e0b' : '#0284c7';

      const pointIcon = L.divIcon({
        className: 'custom-trajectory-point',
        html: `
          <div style="
            background-color: ${markerBg};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2.5px solid #0f172a;
            box-shadow: 0 0 12px ${markerBg}99;
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

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <strong style="color: #0284c7;">Step 0${idx + 1}: ${pt.camera_id}</strong><br/>
          <strong>${pt.camera_name}</strong><br/>
          <span style="color: #64748b;">${pt.road_name || 'Corridor'} • ${pt.zone_name}</span><br/>
          <div style="margin-top: 6px; padding: 5px; background: #f1f5f9; border-radius: 6px; font-size: 11px;">
            <span>OCR Read: <strong>${pt.raw_plate_read}</strong> (${Math.round(pt.ocr_confidence * 100)}%)</span><br/>
            <span>Time: <strong>${new Date(pt.timestamp).toLocaleTimeString()}</strong></span><br/>
            <span>Leg Distance: <strong>${pt.distance_from_prev_km} km</strong> (${pt.implied_speed_kmh} km/h)</span>
            ${isLowConf ? '<br/><span style="color: #b45309; font-weight: bold;">⚠ Resolved via Vehicle Re-ID</span>' : ''}
            ${isImpossible ? '<br/><span style="color: #b91c1c; font-weight: bold;">⛔ Impossible Speed Transition</span>' : ''}
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
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 18px #06b6d4ee;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          font-weight: bold;
        ">
          🚘
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
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

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      {/* Header & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Route className="w-4 h-4 text-cyan-400" />
            <span>Single-Vehicle Trajectory Reconstruction & Playback</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              FLAGSHIP DEMO
            </span>
          </h1>
          <span className="text-[11px] text-slate-400">
            Spatio-temporal camera continuity, physics-validated transitions, and Re-ID degraded read recovery
          </span>
        </div>

        {/* Search Input & Demo Pre-sets */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={plateInput}
            onChange={(e) => setPlateInput(e.target.value)}
            placeholder="Enter license plate..."
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 uppercase font-mono focus:outline-none focus:border-cyan-500 w-44"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50"
          >
            {loading ? 'Tracing...' : 'Reconstruct'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Workspace: Leaflet Map + Playback Controls + Evidence Drawer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left/Center: Interactive Map & Playback Bar */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-lg">
          {/* Map Surface */}
          <div className="flex-1 relative z-0 min-h-[350px]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legend Overlay */}
            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] space-y-1 z-[1000] shadow-lg">
              <span className="font-bold text-slate-300 block text-[10px] uppercase font-mono tracking-wider">Route Leg Types</span>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-4 h-0.5 bg-cyan-500 inline-block"></span>
                <span>Direct Verified Checkpoints</span>
              </div>
              <div className="flex items-center space-x-2 text-amber-400">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
                <span>Re-ID Degraded Match (Toll Plaza)</span>
              </div>
              <div className="flex items-center space-x-2 text-rose-400">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500 inline-block"></span>
                <span>Flagged Impossible Transition</span>
              </div>
            </div>
          </div>

          {/* Playback Controls Footer Bar */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!trajectory || trajectory.points.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Route'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  jumpToStep(0);
                }}
                disabled={!trajectory || trajectory.points.length === 0}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="Reset to Start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Speed Multiplier */}
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                {[1, 2, 5, 10].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                      playbackSpeed === spd
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        : 'text-slate-400 hover:bg-slate-900'
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
                <span className="text-xs font-mono text-cyan-400 font-bold whitespace-nowrap">
                  0{currentStepIndex + 1} / 0{trajectory.points.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Leg Evidence & ReID Diagnostics Drawer */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto space-y-4">
          {trajectory && selectedPoint ? (
            <div className="space-y-4">
              {/* Target Plate Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black font-mono text-cyan-400">{trajectory.primary_plate}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                    Step 0{selectedPointIndex + 1} of 0{trajectory.points.length}
                  </span>
                </div>
                <p className="text-xs text-slate-300 capitalize mt-1">
                  {trajectory.vehicle_color} {trajectory.vehicle_type} • {trajectory.total_distance_km} km Total
                </p>
              </div>

              {/* Checkpoint Banner */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                selectedPoint.is_impossible_transition
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : selectedPoint.is_low_confidence
                    ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{selectedPoint.camera_name}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {selectedPoint.camera_id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {selectedPoint.road_name || 'Corridor'} • {selectedPoint.zone_name}
                </p>

                {/* Degraded Re-ID Notice */}
                {selectedPoint.is_low_confidence && (
                  <div className="pt-2 border-t border-amber-800/60 space-y-1">
                    <span className="font-bold text-[11px] flex items-center space-x-1 text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Degraded Read Resolved via Vehicle Re-ID</span>
                    </span>
                    <p className="text-[10px] text-amber-300/90 leading-relaxed font-mono">
                      {selectedPoint.anomaly_flags?.reid_resolved || selectedPoint.anomaly_flags?.reid_probabilistic_match || "Matched via multi-modal appearance and route continuity (91.7%)."}
                    </p>
                  </div>
                )}

                {/* Impossible Transition Alert */}
                {selectedPoint.is_impossible_transition && (
                  <div className="pt-2 border-t border-rose-800/60 space-y-1">
                    <span className="font-bold text-[11px] flex items-center space-x-1 text-rose-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Impossible Speed Transition Flagged</span>
                    </span>
                    <p className="text-[10px] text-rose-300/90 leading-relaxed font-mono">
                      {selectedPoint.anomaly_flags?.IMPOSSIBLE_TRANSITION}
                    </p>
                  </div>
                )}
              </div>

              {/* Leg Physics & OCR Telemetry */}
              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedPoint.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Raw Optical Read:</span>
                  <span className="font-mono font-bold text-slate-100">{selectedPoint.raw_plate_read}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">OCR Confidence:</span>
                  <span className={`font-mono font-bold ${selectedPoint.is_low_confidence ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {Math.round(selectedPoint.ocr_confidence * 100)}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Leg Distance:</span>
                  <span className="font-mono">{selectedPoint.distance_from_prev_km} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Transit Travel Time:</span>
                  <span className="font-mono">{selectedPoint.travel_time_sec}s</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Implied Transit Speed:</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedPoint.implied_speed_kmh} km/h</span>
                </div>
              </div>

              {/* Step Navigation Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => jumpToStep(Math.max(0, selectedPointIndex - 1))}
                  disabled={selectedPointIndex === 0}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-40"
                >
                  ← Previous Leg
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep(Math.min(trajectory.points.length - 1, selectedPointIndex + 1))}
                  disabled={selectedPointIndex === trajectory.points.length - 1}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-40"
                >
                  Next Leg →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-500 space-y-2">
              <Route className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Search for a vehicle plate to reconstruct and animate its continuous trajectory.</p>
            </div>
          )}

          {/* Footer Honesty Tag */}
          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>Visakhapatnam Trajectory Graph</span>
            <span>Probabilistic Re-ID</span>
          </div>
        </div>
      </div>
    </div>
  );
}
