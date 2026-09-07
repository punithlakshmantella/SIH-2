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
  Search,
  ArrowDown,
  FileText,
  ShieldCheck
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
      
      // Sort detections chronologically ascending for the Camera Sequence
      const sortedDets = [...detData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setDetections(sortedDets);
      
      if (sortedDets.length > 0) {
        // Select the most recent detection by default
        setSelectedDetection(sortedDets[sortedDets.length - 1]);
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
        <p className="text-xs text-slate-500">Loading comprehensive vehicle intelligence profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error || 'Vehicle profile not found'}
        </div>
        <Link to="/vehicles" className="inline-flex items-center space-x-1.5 text-xs text-cyan-600 hover:text-cyan-600 transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Vehicle Search</span>
        </Link>
      </div>
    );
  }

  // Extract alerts connected to detections
  const relatedAlerts = detections.filter(d => d.alert).map(d => ({
    ...d.alert,
    timestamp: d.timestamp,
    camera_name: d.camera_name,
    detection_id: d.id
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/vehicles" className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Vehicle Search</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert("Integration point for Case Management / Investigation Module")}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
          >
            <FileText className="w-4 h-4" />
            <span>CREATE INVESTIGATION</span>
          </button>
          
          <Link
            to={`/trajectory?plate=${profile.primary_plate}`}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Route className="w-4 h-4" />
            <span>VIEW TRAJECTORY</span>
          </Link>
        </div>
      </div>

      {/* Vehicle Summary Hero Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-cyan-600 shadow-inner">
              <Car className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-black font-mono text-cyan-600 tracking-wider">
                  {profile.primary_plate}
                </span>
                <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  ID #{profile.id}
                </span>
              </div>
              <p className="text-xs text-slate-700 capitalize mt-1 flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-600" style={{ backgroundColor: profile.color }}></span>
                <span>{profile.color} {profile.make} {profile.model}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-500">{profile.vehicle_type}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-500 font-bold block">First Seen System Entry</span>
            <span className="text-[11px] text-slate-700 font-mono block mb-2">
              {profile.first_seen_at ? new Date(profile.first_seen_at).toLocaleString() : 'N/A'}
            </span>
            <span className="text-[10px] uppercase text-slate-500 font-bold block">Last Known Location</span>
            <span className="text-[12px] font-bold text-slate-800 block truncate max-w-[220px]">
              {profile.last_camera_name || profile.last_camera_id || 'Visakhapatnam'}
            </span>
            <span className="text-[11px] text-cyan-600 font-mono block">
              {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
          <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-mono block tracking-wider">Total Camera Hits</span>
            <span className="text-base font-bold text-slate-900 font-mono">{profile.total_detections}</span>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-mono block tracking-wider">Cameras Visited</span>
            <span className="text-base font-bold text-slate-900 font-mono">{profile.cameras_visited_count}</span>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-mono block tracking-wider">Tracked Distance</span>
            <span className="text-base font-bold text-cyan-600 font-mono">
              {profile.total_detections > 1 ? `${profile.total_distance_km} km` : 'N/A'}
            </span>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-mono block tracking-wider">Average Speed</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {profile.total_detections > 1 ? `${profile.avg_speed_kmh} km/h` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CAMERA SEQUENCE & DETECTION HISTORY */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* CAMERA SEQUENCE VISUALIZER */}
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5 mb-4">
              <Route className="w-4 h-4 text-cyan-600" />
              <span>Camera Sequence</span>
            </h2>
            
            <div className="flex flex-wrap items-center gap-2">
              {detections.map((det, idx) => (
                <React.Fragment key={det.id}>
                  <div 
                    onClick={() => setSelectedDetection(det)}
                    className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition w-[110px] ${
                      selectedDetection?.id === det.id 
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-900/20'
                        : 'bg-slate-50 border-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase truncate block" title={det.camera_id}>
                      {det.camera_id}
                    </span>
                    <span className="text-[10px] text-cyan-600 font-mono block mt-1">
                      {new Date(det.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5 truncate">
                      {det.zone_name}
                    </span>
                  </div>
                  {idx < detections.length - 1 && (
                    <ArrowDown className="w-3 h-3 text-slate-600 rotate-[-90deg]" />
                  )}
                </React.Fragment>
              ))}
            </div>
            {detections.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No detections recorded.</p>
            )}
          </div>

          {/* CHRONOLOGICAL DETECTION HISTORY TABLE */}
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5">
                <History className="w-4 h-4 text-cyan-600" />
                <span>ANPR Detection History ({detections.length})</span>
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">Sorted Chronologically</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[10px] uppercase font-mono text-slate-500 bg-slate-50/50">
                  <tr>
                    <th className="p-2.5 rounded-tl-lg">Time</th>
                    <th className="p-2.5">Camera Node</th>
                    <th className="p-2.5">Zone</th>
                    <th className="p-2.5">Direction</th>
                    <th className="p-2.5">OCR Confidence</th>
                    <th className="p-2.5 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 text-slate-700">
                  {detections.map((det) => (
                    <tr 
                      key={det.id}
                      onClick={() => setSelectedDetection(det)}
                      className={`cursor-pointer transition ${
                        selectedDetection?.id === det.id ? 'bg-cyan-950/20' : 'hover:bg-slate-100/40'
                      }`}
                    >
                      <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                        {new Date(det.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">
                        {det.camera_id}
                        {det.alert && (
                          <ShieldAlert className="inline-block w-3 h-3 text-rose-400 ml-1" />
                        )}
                      </td>
                      <td className="p-2.5 text-slate-500">{det.zone_name}</td>
                      <td className="p-2.5">{det.direction}B</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold block w-max ${
                          det.is_low_confidence
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {Math.round(det.ocr_confidence * 100)}%
                        </span>
                      </td>
                      <td className="p-2.5 text-cyan-600 hover:text-cyan-600 underline font-mono text-[10px]">
                        Inspect
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INSPECTOR & STATUS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* WATCHLIST STATUS */}
          <div className={`p-5 rounded-2xl border ${
            profile.is_flagged 
              ? 'bg-rose-950/20 border-rose-800'
              : 'bg-white/60 border-slate-200'
          }`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5 mb-3">
              {profile.is_flagged ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span>Watchlist Status</span>
            </h2>

            {profile.is_flagged ? (
              <div className="space-y-3">
                <div className="inline-block px-3 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold text-[11px] uppercase tracking-wide">
                  ⚠ Watchlist Match
                </div>
                <div className="text-[11px] text-slate-700 space-y-1">
                  <p><strong>Reason:</strong> Matched an active watchlist entry.</p>
                  <p><strong>Match Time:</strong> {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString() : 'N/A'}</p>
                  <p><strong>Node:</strong> {profile.last_camera_id || 'N/A'}</p>
                </div>
                <p className="text-[10px] text-rose-400/80 italic pt-2 border-t border-rose-900/50 leading-relaxed">
                  Note: A license plate match constitutes an investigative lead, not definitive proof of criminal activity. Confirm identity via secondary verification.
                </p>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 space-y-1">
                <p className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Unflagged Status</span>
                </p>
                <p>Vehicle is not currently associated with any active watchlists or AP BOLO alerts.</p>
              </div>
            )}
          </div>

          {/* RELATED ALERTS */}
          {relatedAlerts.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-950/10 border border-amber-900/30">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5 mb-3">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Related Alerts ({relatedAlerts.length})</span>
              </h2>
              
              <div className="space-y-2">
                {relatedAlerts.map((alert, i) => (
                  <div key={i} className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-slate-800">{alert.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono ${
                        alert.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        alert.severity === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">Node: {alert.camera_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INSPECTOR: SELECTED DETECTION */}
          <div className="p-5 rounded-2xl bg-white/80 border border-slate-200 sticky top-6">
            <h2 className="text-xs font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4 uppercase tracking-wider font-mono">
              <Camera className="w-4 h-4 text-cyan-600" />
              <span>Evidence Inspector</span>
            </h2>

            {selectedDetection ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Plate OCR</span>
                    <span className="text-xl font-black font-mono text-slate-900 tracking-wider">
                      {selectedDetection.raw_plate_text}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Confidence</span>
                    <span className={`text-base font-bold font-mono ${
                      selectedDetection.is_low_confidence ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {Math.round(selectedDetection.ocr_confidence * 100)}%
                    </span>
                  </div>
                </div>

                {selectedDetection.is_low_confidence && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-[11px] text-amber-300/90 flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>⚠ Low-confidence recognition. Probabilistic match used for trajectory linking.</span>
                  </div>
                )}

                <div className="space-y-2 text-[11px] text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 uppercase">Camera Node:</span>
                    <span className="font-bold text-slate-800 truncate ml-2" title={selectedDetection.camera_name}>
                      {selectedDetection.camera_name}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 uppercase">Corridor Zone:</span>
                    <span className="truncate ml-2">{selectedDetection.zone_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 uppercase">Timestamp:</span>
                    <span>{new Date(selectedDetection.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 uppercase">Speed:</span>
                    <span className="font-bold text-emerald-400">{selectedDetection.speed_kmh} km/h</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 uppercase">Vector:</span>
                    <span>{selectedDetection.direction}bound</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-[11px] font-mono">
                Select a detection event from the history to view optical evidence.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
