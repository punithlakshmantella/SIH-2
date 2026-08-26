import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import { 
  FolderKanban, 
  ArrowLeft, 
  Route, 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Save,
  MapPin,
  Car
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function InvestigationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [dossier, setDossier] = useState<any | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [statusInput, setStatusInput] = useState('open');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const isAuthorizedToEdit = user && (user.role === 'Authorized Investigator' || user.role === 'System Administrator');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<any>(`/cases/${encodeURIComponent(id)}`)
      .then((data) => {
        setDossier(data);
        setNotesInput(data.notes || '');
        setStatusInput(data.status || 'open');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Leaflet Map Init
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !dossier || !dossier.trajectory || !dossier.trajectory.points) return;

    const points = dossier.trajectory.points;
    if (points.length === 0) return;

    const map = L.map(mapContainerRef.current, {
      center: [points[0].latitude, points[0].longitude],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const latLngs: [number, number][] = points.map((p: any) => [p.latitude, p.longitude]);

    // Polylines
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const isReID = p2.is_low_confidence || (p2.anomaly_flags && p2.anomaly_flags.reid_resolved);
      L.polyline([[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]], {
        color: isReID ? '#f59e0b' : '#0284c7',
        weight: 3.5,
        dashArray: isReID ? '5, 5' : undefined,
      }).addTo(map);
    }

    // Waypoint Markers
    points.forEach((pt: any, idx: number) => {
      const icon = L.divIcon({
        className: 'custom-case-point',
        html: `
          <div style="
            background-color: ${pt.is_low_confidence ? '#f59e0b' : '#0284c7'};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([pt.latitude, pt.longitude], { icon })
        .bindPopup(`<strong>${pt.camera_name}</strong><br/>Time: ${new Date(pt.timestamp).toLocaleTimeString()}<br/>OCR: ${pt.raw_plate_read}`)
        .addTo(map);
    });

    map.fitBounds(latLngs, { padding: [30, 30] });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [dossier]);

  const handleUpdate = async () => {
    if (!dossier) return;
    setSaving(true);
    try {
      await api.put(`/cases/${dossier.id}`, {
        notes: notesInput,
        status: statusInput
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-slate-500 text-xs">Loading case dossier...</div>;
  if (!dossier) return <div className="text-center py-16 text-rose-400 text-xs">Case dossier not found</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link to="/investigations" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Case Directory</span>
      </Link>

      {/* Case Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-cyan-400">{dossier.case_number}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                dossier.status === 'open' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                'bg-slate-800 text-slate-300'
              }`}>
                {dossier.status}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Priority: {dossier.priority}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1">{dossier.title}</h1>
            <p className="text-xs text-slate-400">Assigned Investigator: <strong className="text-slate-200">{dossier.assigned_investigator}</strong></p>
          </div>

          <Link
            to={`/trajectory?plate=${dossier.subject_plate}`}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Route className="w-4 h-4" />
            <span>Interactive Playback</span>
          </Link>
        </div>

        {/* Mandatory Neutral Wording Standard Banner */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Departmental Neutral Wording & Evidence Standard:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {dossier.subject_vehicle?.neutral_association_label || "Vehicle associated with investigation. No certainty of driver identity or assumption of guilt."}
          </p>
        </div>
      </div>

      {/* Grid: Map Trajectory & Evidence Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Map */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="rounded-2xl overflow-hidden border border-slate-800 h-80 relative shadow-lg">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* Honest Network Drop-Off Notice */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs space-y-1">
            <span className="font-bold text-slate-300 block">Sensor Network Continuity Status:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Last verified checkpoint: <strong className="text-cyan-400">{dossier.last_known_location}</strong>.
            </p>
            <p className="text-amber-400/90 text-[11px] font-mono mt-1">
              ↳ {dossier.network_drop_off_status}
            </p>
          </div>
        </div>

        {/* Chronological Evidence Timeline */}
        <div className="lg:col-span-5 p-5 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Verified Camera Evidence Hits ({dossier.trajectory?.points?.length || 0})
          </h2>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {dossier.trajectory?.points?.map((pt: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">0{idx + 1}. {pt.camera_name}</span>
                  <span className="font-mono text-cyan-400">{new Date(pt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Plate Read: <strong className="text-slate-200">{pt.raw_plate_read}</strong></span>
                  <span>Conf: {Math.round(pt.ocr_confidence * 100)}%</span>
                </div>
                {pt.anomaly_flags?.reid_resolved && (
                  <div className="text-[10px] text-amber-400 font-mono mt-1 pt-1 border-t border-slate-800">
                    ↳ {pt.anomaly_flags.reid_resolved}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case Notes & Status Update Panel */}
      {isAuthorizedToEdit && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Investigator Case Notes & Dossier Audit</h2>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved successfully</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-400 mb-1">Dossier Observations & Notes</label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Case Status</label>
              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>

              <button
                onClick={handleUpdate}
                disabled={saving}
                className="w-full mt-3 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Update Dossier'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
