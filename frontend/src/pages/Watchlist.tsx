import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Car,
  Route,
  Bell,
  FileText,
  Eye,
  Check,
  X,
  PauseCircle,
  PlayCircle,
  Archive,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  Calendar,
  Lock,
  ExternalLink,
  HelpCircle,
  Flame,
  Camera
} from 'lucide-react';
import { api } from '../services/api';

const REASON_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'stolen', label: 'Stolen Vehicle' },
  { id: 'active_investigation', label: 'Active Investigation' },
  { id: 'traffic_violator', label: 'Repeat Traffic Violator' },
  { id: 'authorized_watchlist', label: 'VIP / Authorized Watchlist Target' },
  { id: 'missing_recovered', label: 'Missing / Recovered Vehicle' },
  { id: 'other', label: 'Other Approved Security Flag' },
];

const PRIORITIES = [
  { id: 'all', label: 'All Priorities' },
  { id: 'urgent', label: 'Urgent (Critical Alarm)' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low (Log Only)' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'active', label: 'Active Targets' },
  { id: 'pending', label: 'Pending Verification' },
  { id: 'expiring_soon', label: 'Expiring Soon' },
  { id: 'expired', label: 'Expired' },
  { id: 'suspended', label: 'Suspended / Resolved' },
];

function statusBadge(statusStr: string) {
  switch (statusStr?.toLowerCase()) {
    case 'active':
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-800 font-bold';
    case 'pending_verification':
    case 'pending':
      return 'bg-amber-950/80 text-amber-400 border-amber-800 font-bold';
    case 'suspended':
      return 'bg-slate-800 text-slate-400 border-slate-700';
    case 'expired':
      return 'bg-rose-950/80 text-rose-400 border-rose-800';
    case 'resolved':
      return 'bg-cyan-950/80 text-cyan-400 border-cyan-800';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}

function priorityBadge(pri: string) {
  switch (pri?.toLowerCase()) {
    case 'urgent':
      return 'bg-rose-950/80 text-rose-400 border-rose-800 font-bold';
    case 'high':
      return 'bg-orange-950/80 text-orange-400 border-orange-800 font-bold';
    case 'medium':
      return 'bg-amber-950/80 text-amber-400 border-amber-800 font-bold';
    case 'low':
      return 'bg-slate-800 text-slate-400 border-slate-700';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Form States
  const [plate, setPlate] = useState('');
  const [reason, setReason] = useState('active_investigation');
  const [priority, setPriority] = useState('urgent');
  const [caseRef, setCaseRef] = useState('');
  const [notes, setNotes] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [autoVerify, setAutoVerify] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Modals & Drawers
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [verifyModalEntry, setVerifyModalEntry] = useState<any | null>(null);
  const [resolveModalEntry, setResolveModalEntry] = useState<any | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load Watchlist and Summary
  const fetchWatchlistAndSummary = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/watchlist?status_filter=${selectedStatus}`;
      if (selectedCategory !== 'all') url += `&reason_category=${selectedCategory}`;
      if (selectedPriority !== 'all') url += `&priority=${selectedPriority}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const [items, summaryData] = await Promise.all([
        api.get<any[]>(url),
        api.get<any>('/watchlist/summary').catch(() => null)
      ]);
      setWatchlist(items || []);
      if (summaryData) setSummary(summaryData);
    } catch (err: any) {
      console.error('Failed to load watchlist', err);
      setError(err.message || 'Failed to load surveillance watchlist');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedPriority, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchWatchlistAndSummary();
  }, [fetchWatchlistAndSummary]);

  // Clean / Normalize Plate input
  const handlePlateChange = (val: string) => {
    setPlate(val.toUpperCase().replace(/\s+/g, ''));
  };

  // Check duplicate inline
  const existingDuplicate = useMemo(() => {
    if (!plate || plate.length < 4) return null;
    return watchlist.find(w => w.plate_number === plate);
  }, [plate, watchlist]);

  // Add Plate Submission
  const handleAddPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate) return;
    setError(null);
    setSuccessMsg(null);
    setFormSubmitting(true);

    try {
      const payload: any = {
        plate_number: plate,
        reason_category: reason,
        priority: priority,
        case_reference: caseRef.trim() || null,
        notes: notes.trim() || null,
        effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        auto_verify: autoVerify
      };

      await api.post('/watchlist', payload);
      setSuccessMsg(`License plate ${plate} registered to surveillance watchlist successfully.`);
      setPlate('');
      setCaseRef('');
      setNotes('');
      fetchWatchlistAndSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to add plate to watchlist. Ensure authorized permissions.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Verify modal submit
  const handleVerifySubmit = async (action: 'VERIFIED' | 'REJECTED') => {
    if (!verifyModalEntry) return;
    setActionLoading(true);
    try {
      const updated = await api.post<any>(`/watchlist/${verifyModalEntry.id}/verify`, {
        action,
        notes: actionNotes
      });
      setWatchlist(prev => prev.map(w => w.id === verifyModalEntry.id ? { ...w, ...updated } : w));
      if (selectedEntry?.id === verifyModalEntry.id) setSelectedEntry((prev: any) => ({ ...prev, ...updated }));
      setVerifyModalEntry(null);
      setActionNotes('');
      setSuccessMsg(`Watchlist entry for ${verifyModalEntry.plate_number} has been ${action.toLowerCase()}.`);
      fetchWatchlistAndSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to verify watchlist record');
    } finally {
      setActionLoading(false);
    }
  };

  // Status transition handler (Suspend / Reactivate / Expire / Resolve)
  const handleStatusTransition = async (entryId: number, newStatus: string, resolutionNotes?: string) => {
    setActionLoading(true);
    try {
      const updated = await api.put<any>(`/watchlist/${entryId}/status`, {
        status: newStatus,
        resolution_notes: resolutionNotes
      });
      setWatchlist(prev => prev.map(w => w.id === entryId ? { ...w, ...updated } : w));
      if (selectedEntry?.id === entryId) setSelectedEntry((prev: any) => ({ ...prev, ...updated }));
      setResolveModalEntry(null);
      setActionNotes('');
      setSuccessMsg(`Watchlist status updated to ${newStatus.toUpperCase()}.`);
      fetchWatchlistAndSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Sorting
  const sortedWatchlist = [...watchlist].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'priority') {
      const rank: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (rank[b.priority?.toLowerCase()] || 0) - (rank[a.priority?.toLowerCase()] || 0);
    }
    if (sortBy === 'expiring') {
      return (a.days_until_expiry ?? 999) - (b.days_until_expiry ?? 999);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* 1. DEMO DATA TRANSPARENCY BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong>{' '}
          Some watchlist records are synthetic prototype entries created for SIH demonstration.
          Watchlist matches represent optical recognition against registered hotlist entries and require operator verification before field action.
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Surveillance Watchlist Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorized vehicle watchlist management for ANPR-based surveillance alerts (Police, Investigator, Admin only)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>RBAC Protected</span>
          </div>

          <button
            onClick={fetchWatchlistAndSummary}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition"
            title="Refresh Watchlist"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ALERTS / MESSAGES */}
      {error && (
        <div className="p-3.5 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 2. SUMMARY KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Total Entries</span>
          <span className="text-2xl font-black font-mono text-slate-100 mt-1 block">
            {summary ? summary.total_entries : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Registered records</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Active Targets</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {summary ? summary.active_count : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-emerald-500 font-mono mt-0.5 block">Live ANPR monitoring</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Pending Verification</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {summary ? summary.pending_verification_count : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-amber-500 font-mono mt-0.5 block">Awaiting 2nd officer</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Expiring Soon</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${summary?.expiring_soon_count > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
            {summary ? summary.expiring_soon_count : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">&le; 7 days remaining</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Urgent Priority</span>
          <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">
            {summary ? summary.urgent_count : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-rose-500 font-mono mt-0.5 block">Immediate alarm trigger</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Linked Cases</span>
          <span className="text-2xl font-black font-mono text-indigo-400 mt-1 block">
            {summary ? summary.linked_investigations_count : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-indigo-400 font-mono mt-0.5 block">Investigation active</span>
        </div>
      </div>

      {/* 3. REGISTER NEW PLATE FORM */}
      <form onSubmit={handleAddPlate} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Register New License Plate to Watchlist
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Authorized Officer Entry</span>
        </div>

        {/* Duplicate detection warning */}
        {existingDuplicate && (
          <div className="p-3 bg-amber-950/40 border border-amber-800 text-amber-300 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>WATCHLIST ENTRY ALREADY EXISTS:</strong> Plate {existingDuplicate.plate_number} is registered ({existingDuplicate.status}) for "{existingDuplicate.reason_category}".
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEntry(existingDuplicate)}
              className="px-2.5 py-1 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded-lg text-[10px] font-bold"
            >
              View Existing
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Plate Number */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Plate Number *</label>
            <input
              type="text"
              value={plate}
              onChange={(e) => handlePlateChange(e.target.value)}
              placeholder="e.g. AP39AB1234"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 uppercase font-mono tracking-wider focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Reason Category */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Reason Category *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="stolen">Stolen Vehicle</option>
              <option value="active_investigation">Active Investigation</option>
              <option value="traffic_violator">Repeat Traffic Violator</option>
              <option value="authorized_watchlist">VIP / Authorized Watchlist Target</option>
              <option value="missing_recovered">Missing / Recovered Vehicle</option>
              <option value="other">Other Approved Security Flag</option>
            </select>
          </div>

          {/* Alert Priority */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Alert Priority *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="urgent">Urgent (Critical Alarm)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low (Log Only)</option>
            </select>
          </div>

          {/* Case / Reference ID */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Case / Reference ID</label>
            <input
              type="text"
              value={caseRef}
              onChange={(e) => setCaseRef(e.target.value)}
              placeholder="e.g. BEL-2026-0914"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Effective From */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Effective From</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">Operational Context / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Investigation lead, alert routing instructions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-3">
          <label className="flex items-center space-x-2 text-xs text-slate-400 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={autoVerify}
              onChange={(e) => setAutoVerify(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
            />
            <span>Authorized Immediate Activation (Skip 2nd Officer Approval)</span>
          </label>

          <button
            type="submit"
            disabled={formSubmitting}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{formSubmitting ? 'Registering…' : 'Add Plate to Watchlist'}</span>
          </button>
        </div>
      </form>

      {/* 4. FILTERS & SEARCH TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by plate, case reference, notes, officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
        >
          {STATUS_FILTERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* Reason category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
        >
          {REASON_CATEGORIES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>

        {/* Sort by */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
        >
          <option value="newest">Newest First</option>
          <option value="priority">Highest Priority First</option>
          <option value="expiring">Expiring Soonest</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* 5. WATCHLIST TABLE */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Active Surveillance Targets ({sortedWatchlist.length})
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">Enforcing access control & audit logging</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Plate</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reason Category</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Case Reference</th>
                <th className="p-3">Expiry</th>
                <th className="p-3">Registered By</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedWatchlist.map((item) => {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    
                    {/* Plate with Demo Badge */}
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-cyan-300 text-sm tracking-wider">{item.plate_number}</span>
                        {item.is_demo && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-800 text-[9px] font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${statusBadge(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="p-3 capitalize text-slate-200">
                      {item.reason_category.replace(/_/g, ' ')}
                    </td>

                    {/* Priority */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${priorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>

                    {/* Case Reference */}
                    <td className="p-3">
                      {item.case_reference ? (
                        <Link 
                          to={`/investigations`} 
                          className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2 flex items-center space-x-1"
                        >
                          <span>{item.case_reference}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Expiry */}
                    <td className="p-3">
                      {item.expiry_date ? (
                        <div className="space-y-0.5">
                          <span className="text-slate-300">{new Date(item.expiry_date).toLocaleDateString()}</span>
                          {item.is_expiring_soon && (
                            <span className="block text-[9px] text-orange-400 font-bold">
                              ⚠ {item.days_until_expiry}d left
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Permanent</span>
                      )}
                    </td>

                    {/* Registered By */}
                    <td className="p-3 text-slate-400">
                      {item.creator_name || 'System Administrator'}
                    </td>

                    {/* Row Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        
                        {/* Verify button if pending */}
                        {item.status === 'pending_verification' && (
                          <button
                            onClick={() => {
                              setVerifyModalEntry(item);
                              setActionNotes('');
                            }}
                            className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-lg text-[10px] font-bold"
                            title="Verify and activate watchlist entry"
                          >
                            Verify
                          </button>
                        )}

                        {/* Suspend button if active */}
                        {item.status === 'active' && (
                          <button
                            onClick={() => handleStatusTransition(item.id, 'suspended')}
                            className="p-1.5 text-slate-400 hover:text-amber-300 transition"
                            title="Suspend alert generation"
                          >
                            <PauseCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reactivate button if suspended/expired */}
                        {(item.status === 'suspended' || item.status === 'expired') && (
                          <button
                            onClick={() => handleStatusTransition(item.id, 'active')}
                            className="p-1.5 text-slate-400 hover:text-emerald-300 transition"
                            title="Reactivate entry"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Resolve button */}
                        {item.status === 'active' && (
                          <button
                            onClick={() => {
                              setResolveModalEntry(item);
                              setActionNotes('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 transition"
                            title="Mark as resolved (e.g. vehicle recovered)"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* View Drawer */}
                        <button
                          onClick={() => setSelectedEntry(item)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 transition"
                          title="View Full Surveillance Context"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. VERIFICATION MODAL (2-Person Approval) */}
      {verifyModalEntry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-800/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold font-mono text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Authorize Watchlist Target: {verifyModalEntry.plate_number}</span>
              </div>
              <button onClick={() => setVerifyModalEntry(null)}><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs text-amber-300 space-y-1">
              <strong className="block font-bold">TWO-PERSON OPERATIONAL APPROVAL:</strong>
              Confirming this record authorizes live ANPR cameras to trigger automated law-enforcement alarms across Visakhapatnam.
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">Target Plate</span>
                <span className="font-bold text-cyan-300">{verifyModalEntry.plate_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Reason Category</span>
                <span className="font-bold text-slate-200 capitalize">{verifyModalEntry.reason_category.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Priority Level</span>
                <span className="font-bold text-rose-400 uppercase">{verifyModalEntry.priority}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Case Reference</span>
                <span className="text-indigo-400">{verifyModalEntry.case_reference || 'None'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Approval / Rejection Notes</label>
              <textarea
                rows={2}
                placeholder="Enter authorization verification remarks..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => handleVerifySubmit('VERIFIED')}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Approve &amp; Activate</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleVerifySubmit('REJECTED')}
                className="py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <X className="w-4 h-4" />
                <span>Reject Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. RESOLUTION MODAL */}
      {resolveModalEntry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-800/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-300 font-bold font-mono text-sm">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span>Resolve Watchlist Entry: {resolveModalEntry.plate_number}</span>
              </div>
              <button onClick={() => setResolveModalEntry(null)}><X className="w-4 h-4" /></button>
            </div>

            <p className="text-xs text-slate-300">
              Marking this target as resolved archives the surveillance trigger while preserving historical ANPR detections and case audit trails.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">Resolution Reason / Summary *</label>
              <textarea
                rows={3}
                placeholder="e.g. Vehicle recovered by Traffic Police, Case #BEL-2026 closed..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setResolveModalEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || !actionNotes.trim()}
                onClick={() => handleStatusTransition(resolveModalEntry.id, 'resolved', actionNotes)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DETAILED WATCHLIST SLIDE-OVER DRAWER */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Watchlist Target Telemetry</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <h2 className="text-lg font-black text-slate-100 font-mono tracking-wider">{selectedEntry.plate_number}</h2>
                  {selectedEntry.is_demo && (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                      DEMO / TEST
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Status Header */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">Surveillance Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase border inline-block mt-1 ${statusBadge(selectedEntry.status)}`}>
                  {selectedEntry.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Priority Level</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase border inline-block mt-1 ${priorityBadge(selectedEntry.priority)}`}>
                  {selectedEntry.priority}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Reason Category</span>
                <span className="font-bold text-slate-200 capitalize mt-1 block">{selectedEntry.reason_category.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Case Reference</span>
                <span className="font-bold text-indigo-400 mt-1 block">{selectedEntry.case_reference || 'None Assigned'}</span>
              </div>
            </div>

            {/* Verification & Lifecycle History */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono">
              <span className="text-xs font-bold text-slate-300 uppercase block font-mono">Audit &amp; Verification Chain</span>
              
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Registered By</span>
                  <span className="text-slate-300">{selectedEntry.creator_name || 'System'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Registered At</span>
                  <span className="text-slate-300">{new Date(selectedEntry.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Verification Status</span>
                  <span className="text-emerald-400 capitalize">{selectedEntry.verification_status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Verified By</span>
                  <span className="text-slate-300">{selectedEntry.verified_by_name || 'System Admin Override'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Effective Date</span>
                  <span className="text-slate-300">{selectedEntry.effective_from ? new Date(selectedEntry.effective_from).toLocaleDateString() : 'Immediate'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Expiry Date</span>
                  <span className="text-slate-300">{selectedEntry.expiry_date ? new Date(selectedEntry.expiry_date).toLocaleDateString() : 'Permanent'}</span>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="pt-2 border-t border-slate-900 text-slate-400 text-[11px]">
                  <strong>Notes:</strong> {selectedEntry.notes}
                </div>
              )}
            </div>

            {/* ANPR Sightings Context */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono">
              <span className="text-xs font-bold text-slate-300 uppercase block font-mono">Live ANPR Detection Context</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Total Detections</span>
                  <span className="text-cyan-400 font-bold text-sm">{selectedEntry.detection_count} hits</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Last Sighting Camera</span>
                  <span className="text-slate-200">{selectedEntry.last_camera_name || selectedEntry.last_camera_id || 'Siripuram Circle'}</span>
                </div>
              </div>
            </div>

            {/* Quick Cross-Module Links */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 font-mono uppercase block">Investigative Drill-Down</span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/vehicles?plate=${encodeURIComponent(selectedEntry.plate_number)}`}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-between font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    <span>Vehicle Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to={`/trajectory?plate=${encodeURIComponent(selectedEntry.plate_number)}`}
                  className="p-3 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-bold transition flex items-center justify-between font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <Route className="w-4 h-4 text-cyan-400" />
                    <span>Trajectory</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                </Link>

                <Link
                  to={`/alerts?search=${encodeURIComponent(selectedEntry.plate_number)}`}
                  className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition flex items-center justify-between font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-rose-400" />
                    <span>Triggered Alerts</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </Link>

                <Link
                  to="/investigations"
                  className="p-3 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-bold transition flex items-center justify-between font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Case File</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 9. FOOTER CROSS-MODULE NAVIGATION */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
        <Link
          to="/vehicles"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition"
        >
          <Car className="w-4 h-4 text-blue-400" />
          <span>Vehicle Registry</span>
        </Link>
        <Link
          to="/trajectory"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition"
        >
          <Route className="w-4 h-4 text-cyan-400" />
          <span>Trajectory Reconstruction</span>
        </Link>
        <Link
          to="/alerts"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition"
        >
          <Bell className="w-4 h-4 text-rose-400" />
          <span>Surveillance Alerts</span>
        </Link>
        <Link
          to="/investigations"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Investigation Case Files</span>
        </Link>
        <Link
          to="/cameras"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Camera Sensor Network</span>
        </Link>
      </div>

    </div>
  );
}
