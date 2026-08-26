import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderKanban, 
  Plus, 
  ArrowUpRight, 
  ShieldCheck, 
  Search, 
  Filter, 
  AlertCircle, 
  Clock, 
  Car,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Investigations() {
  const { user } = useAuthStore();
  const [cases, setCases] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Case Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlate, setNewPlate] = useState('AP39AB1234');
  const [newPriority, setNewPriority] = useState('medium');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthorizedToCreate = user && (user.role === 'Authorized Investigator' || user.role === 'System Administrator');

  const fetchCases = () => {
    setLoading(true);
    let url = '/cases';
    if (statusFilter !== 'all') {
      url += `?status_filter=${statusFilter}`;
    }
    api.get<any[]>(url)
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPlate) return;
    setCreating(true);
    setError(null);

    try {
      await api.post('/cases', {
        title: newTitle,
        subject_plate: newPlate,
        priority: newPriority,
        notes: newNotes || 'Vehicle associated with investigation. Neutral evidence standard applied.'
      });
      setModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      fetchCases();
    } catch (err: any) {
      setError(err.message || 'Failed to create case dossier');
    } finally {
      setCreating(false);
    }
  };

  const filtered = cases.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.case_number.toLowerCase().includes(search.toLowerCase()) ||
    c.subject_plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-cyan-400" />
            <span>Investigation Case Files & Evidence Dossiers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-camera chronological dossiers, verified trajectories, and officer audit records
          </p>
        </div>

        {isAuthorizedToCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Open New Case Dossier</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case number, title, or subject plate..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Case Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed / Resolved</option>
        </select>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filtered.map((c) => (
          <div key={c.id} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">{c.case_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    c.status === 'open' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    c.status === 'in_progress' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Priority: {c.priority}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-1">{c.title}</h2>
              </div>

              <Link
                to={`/investigations/${c.case_number || c.id}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <span>Open Dossier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              {c.notes}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 pt-1 font-mono text-[11px]">
              <div>Subject Vehicle: <strong className="text-cyan-400">{c.subject_plate}</strong></div>
              <div>Investigator: <strong className="text-slate-300">{c.assigned_investigator}</strong></div>
              <div>Opened: <strong className="text-slate-400">{new Date(c.created_at).toLocaleDateString()}</strong></div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Case Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">Register Investigation Case Dossier</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Case Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Operation Coastal Vigilance: Corroboration"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subject Vehicle Plate</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  placeholder="e.g. AP39AB1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 uppercase font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Investigation Notes (Neutral Wording)</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="Vehicle associated with inquiry. Neutral wording standard applied."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {creating ? 'Registering...' : 'Create Dossier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
