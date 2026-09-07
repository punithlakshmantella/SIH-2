import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderKanban, 
  Plus, 
  ArrowUpRight, 
  ShieldCheck, 
  Search, 
  Filter, 
  AlertCircle, 
  AlertTriangle,
  Clock, 
  Car,
  FileText,
  Camera,
  Bell,
  Route,
  ChevronRight,
  UserCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'open', label: 'Open' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
  { id: 'archived', label: 'Archived' },
];

const PRIORITIES = [
  { id: 'all', label: 'All Priorities' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

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

export default function Investigations() {
  const { user } = useAuthStore();
  const [cases, setCases] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Case Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlate, setNewPlate] = useState('AP39AB1234');
  const [newPriority, setNewPriority] = useState('urgent');
  const [newNotes, setNewNotes] = useState('');
  const [newRefId, setNewRefId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthorizedToCreate = user && (user.role === 'Authorized Investigator' || user.role === 'System Administrator');

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/cases?status_filter=${statusFilter}`;
      if (priorityFilter !== 'all') url += `&priority=${priorityFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const data = await api.get<any[]>(url);
      setCases(data || []);
    } catch (err: any) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPlate) return;
    setCreating(true);
    setError(null);

    try {
      await api.post('/cases', {
        title: newTitle,
        subject_plate: newPlate.toUpperCase().replace(/\s+/g, ''),
        priority: newPriority,
        notes: newNotes || 'Vehicle associated with authorized investigation. Neutral evidence standard applied.',
        reference_id: newRefId || undefined
      });
      setModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      setNewRefId('');
      fetchCases();
    } catch (err: any) {
      setError(err.message || 'Failed to create case dossier');
    } finally {
      setCreating(false);
    }
  };

  // KPI Summary Counts
  const totalOpen = cases.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'ESCALATED').length;
  const urgentCount = cases.filter(c => c.priority === 'URGENT').length;
  const underReviewCount = cases.filter(c => c.status === 'UNDER_REVIEW').length;
  const resolvedCount = cases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* 1. DEMO DATA TRANSPARENCY BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong>{' '}
          Investigation dossiers are prototype case files created for SIH evaluation.
          Algorithmic trajectory reconstructions and OCR observations represent probable evidence and require authorized investigator verification.
        </div>
      </div>

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-cyan-600" />
            <span>Investigation Case Files & Evidence Dossiers</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorized investigation workspace combining chronological ANPR observations, vehicle trajectories, alerts, camera evidence, and investigator actions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCases}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs transition"
            title="Refresh Cases"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>

          {isAuthorizedToCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Case</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUMMARY KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Active Cases</span>
          <span className="text-2xl font-black font-mono text-cyan-600 mt-1 block">{totalOpen}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Open & In Progress</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Urgent Priority</span>
          <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">{urgentCount}</span>
          <span className="text-[10px] text-rose-500 font-mono mt-0.5 block">Immediate attention</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Under Review</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">{underReviewCount}</span>
          <span className="text-[10px] text-amber-500 font-mono mt-0.5 block">Officer review active</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Resolved / Closed</span>
          <span className="text-2xl font-black font-mono text-slate-800 mt-1 block">{resolvedCount}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Evidence archived</span>
        </div>
      </div>

      {/* 3. FILTERS TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case number, title, plate..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
        >
          {STATUS_FILTERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
        >
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* 4. CASES LIST */}
      <div className="space-y-4">
        {cases.length > 0 ? (
          cases.map((c) => (
            <div 
              key={c.id} 
              className="p-6 rounded-2xl bg-white/70 border border-slate-200 hover:border-slate-300 transition space-y-4 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-black text-cyan-600">{c.case_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${statusBadge(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${priorityBadge(c.priority)}`}>
                      {c.priority}
                    </span>
                    {c.is_demo && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-bold font-mono">
                        DEMO CASE
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1 font-mono">{c.title}</h2>
                </div>

                <Link
                  to={`/investigations/${c.case_number || c.id}`}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-600 hover:text-slate-950 text-xs font-bold border border-cyan-800 hover:border-cyan-600 transition shadow-sm self-start sm:self-center font-mono"
                >
                  <span>Open Dossier</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Case Notes */}
              <p className="text-xs text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed font-sans">
                {c.notes}
              </p>

              {/* Telemetry Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-50/40 p-3 rounded-xl border border-slate-900 text-slate-500">
                <div>
                  <span className="text-slate-500 block text-[10px]">Subject Plate</span>
                  <span className="text-cyan-600 font-bold">{c.subject_plate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Investigator</span>
                  <span className="text-slate-800 truncate block">{c.assigned_investigator}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Evidence Hits / Alerts</span>
                  <span className="text-slate-800 font-bold">{c.evidence_count} hits • {c.alert_count} alerts</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Trajectory Status</span>
                  <span className="text-amber-400 font-bold text-[10px] truncate block">{c.trajectory_status}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>Opened: {new Date(c.created_at).toLocaleDateString()}</span>
                <span>Last Updated: {new Date(c.updated_at).toLocaleString()}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs font-mono bg-white/40 rounded-2xl border border-slate-200 space-y-2">
            <FolderKanban className="w-8 h-8 text-cyan-600 mx-auto" />
            <p className="text-slate-700 text-sm font-bold">No Investigation Cases Found</p>
            <p className="text-slate-500">No cases matched the current status or search filters.</p>
          </div>
        )}
      </div>

      {/* 5. CREATE NEW CASE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">Register Investigation Case Dossier</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-mono">Case Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Operation Harbor Trace: AP39 Surveillance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-mono">Subject Vehicle Plate *</label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. AP39AB1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 uppercase font-mono tracking-wider focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-mono">Priority Level *</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-mono">Reference / FIR ID</label>
                <input
                  type="text"
                  value={newRefId}
                  onChange={(e) => setNewRefId(e.target.value)}
                  placeholder="e.g. FIR-VSP-2026-0914"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-mono">Operational Context / Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="Vehicle associated with authorized investigation. Neutral evidence standard applied."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {creating ? 'Registering...' : 'Create Case Dossier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
