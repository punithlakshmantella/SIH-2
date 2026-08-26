import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [plate, setPlate] = useState('');
  const [reason, setReason] = useState('stolen');
  const [priority, setPriority] = useState('high');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchlist = () => {
    api.get<any[]>('/watchlist')
      .then(setWatchlist)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAddPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate) return;
    setError(null);
    try {
      await api.post('/watchlist', {
        plate_number: plate,
        reason_category: reason,
        priority: priority,
        notes: notes
      });
      setPlate('');
      setNotes('');
      fetchWatchlist();
    } catch (err: any) {
      setError(err.message || 'Failed to add plate to watchlist');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/watchlist/${id}`);
      fetchWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>Surveillance Watchlist & Blacklist Management</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          RBAC-gated vehicle hotlist for automated ANPR intersection alerts (Police, Investigator, Admin only)
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Plate Form */}
      <form onSubmit={handleAddPlate} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Register New Plate to Hotlist
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Plate Number</label>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g. AP39AB1234"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 uppercase font-mono focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Reason Category</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="stolen">Stolen Vehicle</option>
              <option value="active_investigation">Active Investigation</option>
              <option value="traffic_violator">Repeat Traffic Violator</option>
              <option value="authorized_watchlist">VIP / Authorized Watchlist</option>
              <option value="other">Other Security Flag</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Alert Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="urgent">Urgent (Critical Alarm)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low (Log Only)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Notes / Case Reference</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Case ref, description..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Plate to Watchlist</span>
          </button>
        </div>
      </form>

      {/* Watchlist Table */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Active Surveillance Targets ({watchlist.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-2.5">Plate</th>
                <th className="p-2.5">Reason</th>
                <th className="p-2.5">Priority</th>
                <th className="p-2.5">Notes</th>
                <th className="p-2.5">Registered By</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {watchlist.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-2.5 font-mono font-bold text-rose-400">{item.plate_number}</td>
                  <td className="p-2.5 capitalize">{item.reason_category.replace(/_/g, ' ')}</td>
                  <td className="p-2.5 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.priority === 'urgent' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                      item.priority === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-400 max-w-xs truncate">{item.notes || '—'}</td>
                  <td className="p-2.5 text-slate-500 font-mono">{item.creator_name || 'System'}</td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Deactivate from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
