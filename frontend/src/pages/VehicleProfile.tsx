import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Car, 
  ArrowLeft, 
  Route, 
  ShieldAlert, 
  History, 
  MapPin, 
  Activity, 
  Camera, 
  Clock, 
  Bell, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink,
  Layers,
  Search
} from 'lucide-react';
import { api } from '../services/api';

export default function VehicleProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<any>(`/vehicles/${encodeURIComponent(id)}`),
      api.get<any[]>(`/vehicles/${encodeURIComponent(id)}/detections`)
    ]).then(([profData, detData]) => {
      setProfile(profData);
      setDetections(detData);
      if (detData && detData.length > 0) {
        setSelectedDetection(detData[0]);
      }
    }).catch((err) => {
      setError(err.message || 'Failed to load vehicle profile');
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400">Loading comprehensive vehicle intelligence profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error || 'Vehicle profile not found'}
        </div>
        <Link to="/vehicles" className="inline-flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Vehicle Search</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/vehicles" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Vehicle Search</span>
        </Link>

        <div className="flex items-center space-x-3">
          <Link
            to={`/trajectory?plate=${profile.primary_plate}`}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Route className="w-4 h-4" />
            <span>Launch Trajectory Map</span>
          </Link>
        </div>
      </div>

      {/* Vehicle Summary Hero Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 text-cyan-400 shadow-inner">
              <Car className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-black font-mono text-cyan-400 tracking-wider">
                  {profile.primary_plate}
                </span>
                {profile.is_flagged ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>ACTIVE WATCHLIST TARGET</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                    VERIFIED REGISTRATION
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 capitalize mt-1 flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-600" style={{ backgroundColor: profile.color }}></span>
                <span>{profile.color} {profile.make} {profile.model}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-400">{profile.vehicle_type}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Last Seen Checkpoint:</span>
            <span className="text-xs font-bold text-slate-200 block truncate max-w-[220px]">
              {profile.last_camera_name || profile.last_camera_id || 'Visakhapatnam'}
            </span>
            <span className="text-[11px] text-cyan-400 font-mono">
              {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString() : 'Recent'}
            </span>
          </div>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-800">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Total Camera Hits</span>
            <span className="text-base font-bold text-slate-100 font-mono">{profile.total_detections}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Cameras Visited</span>
            <span className="text-base font-bold text-slate-100 font-mono">{profile.cameras_visited_count}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Corridor Distance</span>
            <span className="text-base font-bold text-cyan-400 font-mono">{profile.total_distance_km} km</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Average Speed</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{profile.avg_speed_kmh} km/h</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Alert Count</span>
            <span className={`text-base font-bold font-mono ${profile.alert_count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {profile.alert_count} Alerts
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Clickable Chronological Timeline + Evidence Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Clickable Chronological Event Timeline */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Chronological Event & Detection Timeline ({detections.length})</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Click item to inspect evidence</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {detections.map((det, idx) => {
              const isSelected = selectedDetection?.id === det.id;
              return (
                <div
                  key={det.id}
                  onClick={() => setSelectedDetection(det)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md'
                      : det.is_low_confidence
                        ? 'bg-amber-950/20 border-amber-800/60 hover:bg-amber-950/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 ${
                      det.is_low_confidence ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-cyan-400'
                    }`}>
                      0{idx + 1}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-200 truncate">{det.camera_name}</span>
                        <span className="text-[10px] font-mono text-cyan-400">{det.camera_id}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {det.road_name || 'Corridor'} • {det.zone_name} • {det.speed_kmh} km/h ({det.direction}B)
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold block ${
                      det.is_low_confidence
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {Math.round(det.ocr_confidence * 100)}% OCR
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {new Date(det.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Detection Evidence & Telemetry */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Detection Evidence & Verification</span>
          </h2>

          {selectedDetection ? (
            <div className="space-y-4">
              {/* Plate Read Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Raw ANPR Read</span>
                  <span className="text-xl font-black font-mono text-slate-100 block tracking-wider">
                    {selectedDetection.raw_plate_text}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Confidence</span>
                  <span className={`text-base font-bold font-mono block ${
                    selectedDetection.is_low_confidence ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {Math.round(selectedDetection.ocr_confidence * 100)}%
                  </span>
                </div>
              </div>

              {selectedDetection.is_low_confidence && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-300 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Degraded Optical Read Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-300/90">
                    Low OCR confidence due to sensor glare / motion blur. Resolved into vehicle trajectory via probabilistic VehicleReIDEngine route continuity.
                  </p>
                </div>
              )}

              {/* Checkpoint Details */}
              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Camera Node:</span>
                  <span className="font-bold text-slate-200">{selectedDetection.camera_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Corridor Zone:</span>
                  <span>{selectedDetection.zone_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Recorded Velocity:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedDetection.speed_kmh} km/h</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedDetection.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Movement Vector:</span>
                  <span className="font-mono">{selectedDetection.direction}bound</span>
                </div>
              </div>

              {selectedDetection.alert && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 space-y-1">
                  <span className="font-bold block">Triggered Alert: {selectedDetection.alert.title}</span>
                  <span className="text-[10px] font-mono text-rose-400 block uppercase">{selectedDetection.alert.alert_type}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Select a detection event from the timeline to view optical evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
