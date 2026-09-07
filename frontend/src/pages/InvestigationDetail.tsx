import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Car,
  Bell,
  Check,
  X,
  Plus,
  FileDown,
  UserCheck,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Activity,
  History,
  GitFork
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

function statusBadge(statusStr: string) {
  switch (statusStr?.toLowerCase()) {
    case 'open':
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-800 font-bold';
    case 'under_review':
      return 'bg-amber-950/80 text-amber-400 border-amber-800 font-bold';
    case 'escalated':
      return 'bg-rose-950/80 text-rose-400 border-rose-800 font-bold';
    case 'resolved':
      return 'bg-cyan-950/80 text-cyan-600 border-cyan-800';
    case 'closed':
    case 'archived':
      return 'bg-slate-100 text-slate-500 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-300';
  }
}

function priorityBadge(pri: string) {
  switch (pri?.toLowerCase()) {
    case 'urgent':
      return 'bg-rose-950/80 text-rose-400 border-rose-800 font-bold';
    case 'high':
      return 'bg-orange-950/80 text-orange-400 border-orange-800 font-bold';
    case 'medium':
      return 'bg-amber-950/80 text-amber-400 border-amber-800';
    case 'low':
      return 'bg-slate-100 text-slate-500 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-300';
  }
}

function evidenceStatusBadge(st: string) {
  switch (st?.toUpperCase()) {
    case 'VERIFIED':
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-800 font-bold';
    case 'DISPUTED':
      return 'bg-amber-950/80 text-amber-400 border-amber-800 font-bold';
    case 'REJECTED':
      return 'bg-rose-950/80 text-rose-400 border-rose-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export default function InvestigationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [dossier, setDossier] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note addition
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('UNDER_REVIEW');
  const [closureReason, setClosureReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const isAuthorizedToEdit = user && (user.role === 'Authorized Investigator' || user.role === 'System Administrator' || user.role === 'Traffic Police');

  const fetchDossier = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<any>(`/cases/${encodeURIComponent(id)}`);
      setDossier(data);
      setTargetStatus(data.status || 'OPEN');
    } catch (err: any) {
      console.error('Failed to load dossier', err);
      setError(err.message || 'Case dossier not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const latLngs: [number, number][] = points.map((p: any) => [p.latitude, p.longitude]);

    // Polylines with dashed style for probable / Re-ID segments
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const isReID = p2.is_low_confidence || (p2.anomaly_flags && p2.anomaly_flags.reid_resolved);
      L.polyline([[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]], {
        color: isReID ? '#f59e0b' : '#38bdf8',
        weight: 3.5,
        dashArray: isReID ? '6, 6' : undefined,
      }).addTo(map);
    }

    // Waypoint Markers
    points.forEach((pt: any, idx: number) => {
      const isReID = pt.is_low_confidence || (pt.anomaly_flags && pt.anomaly_flags.reid_resolved);
      const icon = L.divIcon({
        className: 'custom-case-point',
        html: `
          <div style="
            background-color: ${isReID ? '#f59e0b' : '#0284c7'};
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      L.marker([pt.latitude, pt.longitude], { icon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
            <strong style="color: #0284c7;">Checkpoint #${idx+1}: ${pt.camera_name}</strong><br/>
            <span>Time: ${new Date(pt.timestamp).toLocaleTimeString()}</span><br/>
            <span>Raw Read: <strong>${pt.raw_plate_read}</strong></span><br/>
            <span>Confidence: ${Math.round((pt.ocr_confidence || 0.95)*100)}%</span>
          </div>
        `)
        .addTo(map);
    });

    map.fitBounds(latLngs, { padding: [30, 30] });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [dossier]);

  // Evidence verification action
  const handleVerifyEvidence = async (evidenceIdx: number, action: 'VERIFIED' | 'DISPUTED' | 'REJECTED') => {
    if (!dossier) return;
    try {
      await api.post(`/cases/${dossier.id}/evidence/${evidenceIdx}/verify`, { action });
      setDossier((prev: any) => {
        if (!prev) return prev;
        const updatedEvents = [...prev.timeline_events];
        if (updatedEvents[evidenceIdx - 1]) {
          updatedEvents[evidenceIdx - 1].evidence_status = action;
        }
        return { ...prev, timeline_events: updatedEvents };
      });
    } catch (err) {
      console.error('Failed to verify evidence', err);
    }
  };

  // Add Investigator Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !dossier) return;
    setAddingNote(true);
    try {
      const res = await api.post<any>(`/cases/${dossier.id}/notes`, { note: newNote.trim() });
      setDossier((prev: any) => ({ ...prev, notes: res.notes }));
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setAddingNote(false);
    }
  };

  // Status transition submit
  const handleStatusSubmit = async () => {
    if (!dossier) return;
    setStatusSubmitting(true);
    try {
      await api.put(`/cases/${dossier.id}`, {
        status: targetStatus.toLowerCase(),
        closure_reason: closureReason.trim() || undefined
      });
      setDossier((prev: any) => ({ ...prev, status: targetStatus.toUpperCase() }));
      setStatusModalOpen(false);
      setClosureReason('');
      fetchDossier();
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Export Dossier JSON
  const handleExportDossier = () => {
    if (!dossier) return;
    const exportData = {
      export_metadata: {
        system: "City Vision Visakhapatnam (SIH26127)",
        classification: "CONFIDENTIAL LAW ENFORCEMENT INTELLIGENCE DOSSIER",
        data_disclaimer: "PROTOTYPE / DEMO DATA — Reconstructed from experimental ANPR telemetry for SIH evaluation.",
        exported_by: user?.full_name || "Authorized Officer",
        exported_at: new Date().toISOString()
      },
      case_file: dossier
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dossier.case_number}_EVIDENCE_DOSSIER.json`;
    link.click();
  };

  if (loading) return <div className="text-center py-24 text-slate-500 text-xs font-mono">Loading investigation evidence dossier...</div>;
  if (!dossier) return <div className="text-center py-24 text-rose-400 text-xs font-mono">Case dossier not found.</div>;

  const summary = dossier.summary || {};
  const vehicle = dossier.subject_vehicle || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. DEMO DATA TRANSPARENCY BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO CASE DOSSIER:</strong>{' '}
          This dossier is a prototype investigation file generated from synthetic multi-camera trajectory observations for SIH evaluation.
          Optical OCR reads and Re-ID transitions represent probable evidence and require human officer verification before legal action.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link to="/investigations" className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-mono">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Case Directory</span>
        </Link>

        <div className="flex items-center space-x-2">
          {/* Status Change Button */}
          {isAuthorizedToEdit && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-mono font-medium transition"
            >
              Change Status
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={handleExportDossier}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-cyan-600 border border-slate-300 text-xs font-mono font-bold transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Dossier (JSON)</span>
          </button>
        </div>
      </div>

      {/* 2. CASE HEADER */}
      <div className="p-6 rounded-2xl bg-white/80 border border-slate-200 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-black text-cyan-600">{dossier.case_number}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${statusBadge(dossier.status)}`}>
                {dossier.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${priorityBadge(dossier.priority)}`}>
                {dossier.priority}
              </span>
              {dossier.is_demo && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-bold font-mono">
                  DEMO CASE
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 font-mono">{dossier.title}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Assigned Investigator: <strong className="text-slate-800">{dossier.assigned_investigator}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to={`/trajectory?plate=${encodeURIComponent(dossier.subject_plate)}`}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20 font-mono"
            >
              <Route className="w-4 h-4" />
              <span>Full Trajectory Replay</span>
            </Link>
          </div>
        </div>

        {/* Mandatory Neutral Wording Standard Banner */}
        <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 font-mono">
          <div className="font-bold flex items-center space-x-1.5 text-cyan-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Departmental Neutral Wording &amp; Evidentiary Standard:</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
            {vehicle.neutral_association_label || "Vehicle associated with investigation. No certainty of driver identity or assumption of guilt."}
          </p>
        </div>
      </div>

      {/* 3. CASE SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Evidence Hits</span>
          <span className="text-2xl font-black font-mono text-cyan-600 mt-1 block">{summary.evidence_count || 0}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Camera ANPR sightings</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Cameras Visited</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">{summary.camera_count || 0}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Distinct sensor nodes</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Related Alerts</span>
          <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">{summary.alerts_count || 0}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Watchlist / Speed / Anomaly</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Watchlist Match</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">{summary.watchlist_matches || 0}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Hotlist correlation</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Trajectory Span</span>
          <span className="text-2xl font-black font-mono text-indigo-400 mt-1 block">{summary.trajectory_distance_km || 23.6} km</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{summary.trajectory_status || 'Probable Route'}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Evidence Status</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            {summary.verified_evidence_count} Verified
          </span>
          <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
            {summary.pending_evidence_count} Pending Review
          </span>
        </div>
      </div>

      {/* 4. MAP & SENSOR CONTINUITY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Map */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="rounded-2xl overflow-hidden border border-slate-200 h-80 relative shadow-lg">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* Honest Network Drop-Off Notice */}
          <div className="p-4 bg-white/80 border border-slate-200 rounded-2xl text-xs space-y-1 font-mono">
            <span className="font-bold text-slate-700 block">Sensor Network Continuity Status:</span>
            <p className="text-slate-500 text-[11px] leading-relaxed font-sans">
              Last verified checkpoint: <strong className="text-cyan-600">{dossier.last_known_location}</strong>.
            </p>
            <p className="text-amber-400/90 text-[11px] font-mono mt-1">
              ↳ {dossier.network_drop_off_status}
            </p>
          </div>
        </div>

        {/* Subject Vehicle Profile Card */}
        <div className="lg:col-span-5 p-5 bg-white/70 border border-slate-200 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Car className="w-4 h-4 text-cyan-600" />
                <span>Subject Vehicle Intelligence</span>
              </h2>
              <Link 
                to={`/vehicles?plate=${encodeURIComponent(dossier.subject_plate)}`}
                className="text-[10px] text-cyan-600 hover:text-cyan-600 font-mono flex items-center space-x-1"
              >
                <span>Registry</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">License Plate</span>
                <span className="font-black text-cyan-600 text-sm tracking-wider">{dossier.subject_plate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Classification</span>
                <span className="font-bold text-slate-800 capitalize">{vehicle.make} {vehicle.model} ({vehicle.color})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Total Detections</span>
                <span className="font-bold text-emerald-400">{vehicle.detection_count || summary.evidence_count} hits</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Flagged Status</span>
                <span className={`font-bold ${vehicle.is_flagged ? 'text-rose-400' : 'text-slate-500'}`}>
                  {vehicle.is_flagged ? 'Active Security Flag' : 'Standard Ingest'}
                </span>
              </div>
            </div>

            {/* Watchlist Context Card if linked */}
            {dossier.watchlist_info && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-900/60 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                  <span className="flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Watchlist Match Linked</span>
                  </span>
                  <span className="text-[10px] uppercase border border-amber-800 px-1.5 py-0.5 rounded">
                    {dossier.watchlist_info.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 font-sans">
                  Category: <strong>{dossier.watchlist_info.reason_category}</strong> • Priority: <strong>{dossier.watchlist_info.priority}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>First seen: {vehicle.first_seen_at ? new Date(vehicle.first_seen_at).toLocaleDateString() : 'N/A'}</span>
            <span>Last seen: {vehicle.last_seen_at ? new Date(vehicle.last_seen_at).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* 5. CHRONOLOGICAL EVIDENCE TIMELINE */}
      <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span>Chronological Multi-Camera Evidence Timeline ({dossier.timeline_events?.length || 0})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Sequential optical checkpoints with raw OCR, confidence scores, and officer verification actions
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {dossier.timeline_events && dossier.timeline_events.length > 0 ? (
            dossier.timeline_events.map((ev: any, idx: number) => (
              <div 
                key={idx} 
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-600 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{ev.camera_name}</span>
                      <span className="text-[10px] text-slate-500">({ev.camera_id})</span>
                      <span className="text-[10px] text-cyan-600">• {ev.zone_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${evidenceStatusBadge(ev.evidence_status)}`}>
                        {ev.evidence_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Timestamp</span>
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Raw OCR Read</span>
                        <span className={`font-bold ${ev.is_degraded ? 'text-amber-400' : 'text-slate-800'}`}>
                          {ev.raw_ocr} {ev.is_degraded && '(Degraded)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">OCR Confidence</span>
                        <span className={`font-bold ${ev.ocr_confidence < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {ev.ocr_confidence}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Speed / Heading</span>
                        <span>{ev.speed_kmh ? `${ev.speed_kmh} km/h` : 'N/A'} • {ev.direction}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Verification Action Buttons */}
                {isAuthorizedToEdit && (
                  <div className="flex items-center space-x-1.5 self-end md:self-center">
                    <button
                      onClick={() => handleVerifyEvidence(idx + 1, 'VERIFIED')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                        ev.evidence_status === 'VERIFIED'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white hover:bg-emerald-950 text-slate-700 hover:text-emerald-300 border border-slate-200'
                      }`}
                      title="Verify evidence item"
                    >
                      <Check className="w-3 h-3" />
                      <span>Verify</span>
                    </button>

                    <button
                      onClick={() => handleVerifyEvidence(idx + 1, 'DISPUTED')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                        ev.evidence_status === 'DISPUTED'
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white hover:bg-amber-950 text-slate-700 hover:text-amber-300 border border-slate-200'
                      }`}
                      title="Dispute reading"
                    >
                      <span>Dispute</span>
                    </button>

                    <button
                      onClick={() => handleVerifyEvidence(idx + 1, 'REJECTED')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                        ev.evidence_status === 'REJECTED'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-white hover:bg-rose-950 text-slate-700 hover:text-rose-300 border border-slate-200'
                      }`}
                      title="Reject observation"
                    >
                      <X className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No chronological detection checkpoints recorded for this case.
            </div>
          )}
        </div>
      </div>

      {/* 6. CAMERAS VISITED & RELATED ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cameras Visited */}
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Camera Nodes Visited ({dossier.cameras_visited?.length || 0})</span>
          </h2>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dossier.cameras_visited?.map((cam: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50/60 border border-slate-200 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-slate-800 block">{cam.name}</span>
                  <span className="text-[10px] text-slate-500">{cam.camera_id} • {cam.zone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">{cam.status}</span>
                  <Link 
                    to={`/cameras/${cam.camera_id}`}
                    className="p-1 rounded bg-slate-100 text-slate-700 hover:text-cyan-600"
                    title="View camera telemetry"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related Surveillance Alerts */}
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
            <Bell className="w-4 h-4 text-rose-400" />
            <span>Correlated Surveillance Alerts ({dossier.alerts_history?.length || 0})</span>
          </h2>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dossier.alerts_history && dossier.alerts_history.length > 0 ? (
              dossier.alerts_history.map((al: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50/60 border border-rose-950/60 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-bold text-slate-800 block">{al.title}</span>
                    <span className="text-[10px] text-slate-500">{al.camera_name} • {new Date(al.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <Link 
                    to="/alerts"
                    className="text-[10px] font-bold text-cyan-600 hover:text-cyan-600 flex items-center space-x-1"
                  >
                    <span>View Alert</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs font-mono">
                No active alarms flagged for this vehicle.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. INVESTIGATOR CASE NOTES & AUDIT TRAIL */}
      <div className="p-6 rounded-2xl bg-white/80 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-2">
            <FileText className="w-4 h-4 text-cyan-600" />
            <span>Investigator Case Notes &amp; Dossier Observations</span>
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Immutable Audit Logging Active</span>
        </div>

        {/* Existing Notes Display */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-64 overflow-y-auto font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
          {dossier.notes || "No notes recorded yet."}
        </div>

        {/* Append Note Form */}
        {isAuthorizedToEdit && (
          <form onSubmit={handleAddNote} className="space-y-2">
            <label className="block text-xs text-slate-500 font-mono">Add Official Investigator Observation</label>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter verified optical corroborations or field inquiry notes..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={addingNote || !newNote.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 self-end disabled:opacity-50 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingNote ? 'Saving…' : 'Append Note'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 8. AUDIT TRAIL LOG */}
      {dossier.audit_trail && dossier.audit_trail.length > 0 && (
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-3 font-mono text-xs">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <History className="w-4 h-4 text-cyan-600" />
            <span>Dossier Immutable Audit Trail</span>
          </h2>
          <div className="space-y-1.5">
            {dossier.audit_trail.map((log: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                <div>
                  <strong className="text-slate-800 uppercase">{log.action}</strong> by {log.user_name} ({log.role})
                </div>
                <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATUS TRANSITION MODAL */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Transition Case Status</h3>
              <button onClick={() => setStatusModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Target Status</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-500"
              >
                <option value="OPEN">OPEN</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="ESCALATED">ESCALATED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Resolution / Transition Reason</label>
              <textarea
                rows={2}
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder="Reason for status change or case resolution..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={handleStatusSubmit}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
              >
                {statusSubmitting ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER CROSS-MODULE LINKS */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 font-mono">
        <Link
          to={`/vehicles?plate=${encodeURIComponent(dossier.subject_plate)}`}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Car className="w-4 h-4 text-blue-400" />
          <span>Vehicle Registry</span>
        </Link>
        <Link
          to={`/trajectory?plate=${encodeURIComponent(dossier.subject_plate)}`}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Route className="w-4 h-4 text-cyan-600" />
          <span>Trajectory Reconstruction</span>
        </Link>
        <Link
          to={`/alerts?search=${encodeURIComponent(dossier.subject_plate)}`}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Bell className="w-4 h-4 text-rose-400" />
          <span>Correlated Alerts</span>
        </Link>
        <Link
          to="/watchlist"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Surveillance Watchlist</span>
        </Link>
        <Link
          to="/cameras"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Camera Network</span>
        </Link>
      </div>

    </div>
  );
}
