import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Route, 
  ArrowUpRight, 
  Eye, 
  Camera, 
  Wifi,
  Search,
  Filter,
  RefreshCw,
  Car,
  Flame,
  Activity,
  GitFork,
  ExternalLink,
  Clock,
  MapPin,
  Check,
  X,
  FileText,
  HelpCircle,
  Zap,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  ShieldX
} from 'lucide-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const TIME_RANGES = [
  { label: 'Last 1 Hour',  value: '1h' },
  { label: 'Last 6 Hours', value: '6h' },
  { label: 'Last 24 Hours',value: '24h' },
  { label: 'Last 7 Days',  value: '7d' },
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'SECURITY', label: 'Security & Watchlist' },
  { id: 'TRAFFIC_VIOLATIONS', label: 'Traffic Violations' },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { id: 'TRAFFIC_ANALYTICS', label: 'Traffic Anomalies' },
];

function severityBadge(sev: string) {
  switch (sev?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-950/80 text-rose-400 border-rose-800 font-bold';
    case 'high':
    case 'warning':
      return 'bg-orange-950/80 text-orange-400 border-orange-800 font-bold';
    case 'medium':
      return 'bg-amber-950/80 text-amber-400 border-amber-800 font-bold';
    case 'low':
    case 'info':
      return 'bg-blue-950/80 text-blue-400 border-blue-800';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-300';
  }
}

function categoryBadge(cat: string) {
  switch (cat) {
    case 'SECURITY':
      return 'bg-rose-900/30 text-rose-300 border-rose-800/60';
    case 'TRAFFIC_VIOLATIONS':
      return 'bg-amber-900/30 text-amber-300 border-amber-800/60';
    case 'INFRASTRUCTURE':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'TRAFFIC_ANALYTICS':
      return 'bg-cyan-900/30 text-cyan-600 border-cyan-800/60';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-300';
  }
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [timeRange, setTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modals & Drawers
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [verifyModalAlert, setVerifyModalAlert] = useState<any | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyActionLoading, setVerifyActionLoading] = useState(false);

  const fetchAlertsAndSummary = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/alerts?status_filter=${selectedStatus}&time_range=${timeRange}`;
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`;
      if (selectedSeverity !== 'all') url += `&severity=${selectedSeverity}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const [alertsData, summaryData] = await Promise.all([
        api.get<any[]>(url),
        api.get<any>('/alerts/summary').catch(() => null)
      ]);
      setAlerts(alertsData || []);
      if (summaryData) setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSeverity, selectedStatus, timeRange, searchQuery]);

  useEffect(() => {
    fetchAlertsAndSummary();
  }, [fetchAlertsAndSummary]);

  // WebSocket Live Push Integration
  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'ALERT_TRIGGERED' && msg.data) {
      setAlerts((prev) => [msg.data, ...prev]);
      setSummary((prev: any) => prev ? { ...prev, active_alerts: prev.active_alerts + 1 } : prev);
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsMessage);

  // Status transition handler
  const handleStatusChange = async (alertId: number, newStatus: string) => {
    try {
      const updated = await api.put<any>(`/alerts/${alertId}/status`, { status: newStatus });
      setAlerts((prev) => prev.map(a => a.id === alertId ? { ...a, is_resolved: updated.is_resolved, status: newStatus } : a));
      if (selectedAlert?.id === alertId) setSelectedAlert((prev: any) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Status transition failed', err);
    }
  };

  // Verification modal submit
  const handleVerifySubmit = async (action: 'CONFIRMED' | 'FALSE_MATCH' | 'ESCALATED') => {
    if (!verifyModalAlert) return;
    setVerifyActionLoading(true);
    try {
      const updated = await api.post<any>(`/alerts/${verifyModalAlert.id}/verify`, {
        action,
        notes: verifyNotes
      });
      setAlerts((prev) => prev.map(a => a.id === verifyModalAlert.id ? { ...a, ...updated } : a));
      if (selectedAlert?.id === verifyModalAlert.id) setSelectedAlert((prev: any) => ({ ...prev, ...updated }));
      setVerifyModalAlert(null);
      setVerifyNotes('');
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setVerifyActionLoading(false);
    }
  };

  // Open detailed alert drawer
  const openAlertDetail = async (alert: any) => {
    setSelectedAlert(alert);
    try {
      const detail = await api.get<any>(`/alerts/${alert.id}`);
      setSelectedAlert(detail);
    } catch (err) {
      console.error('Failed to load alert detail', err);
    }
  };

  // Sorting
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (sortBy === 'severity') {
      const rank: Record<string, number> = { critical: 3, high: 2, warning: 2, medium: 1, info: 0, low: 0 };
      return (rank[b.severity?.toLowerCase()] || 0) - (rank[a.severity?.toLowerCase()] || 0);
    }
    if (sortBy === 'unresolved') {
      return (a.is_resolved ? 1 : 0) - (b.is_resolved ? 1 : 0);
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* 1. DEMO DATA TRANSPARENCY BANNER */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start space-x-3 text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong>{' '}
          Surveillance triggers, watchlist correlations, and anomaly alerts are generated from prototype camera detection data for SIH evaluation.
          Human verification is required before initiating law enforcement actions.
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-rose-400" />
            <span>Active Surveillance & Anomaly Alerts ({alerts.filter(a => !a.is_resolved).length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated detection of watchlist matches, traffic violations, camera failures, and traffic anomalies
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-mono text-emerald-400 shadow-sm">
            <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>{isConnected ? 'Alert Event Stream Connected' : 'Simulated Stream'}</span>
          </div>

          <button
            onClick={fetchAlertsAndSummary}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs transition"
            title="Refresh Alerts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. TOP SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Active Alerts</span>
          <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
            {summary ? summary.active_alerts : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-cyan-600 font-mono mt-0.5 block">Pending operator action</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Security Alerts</span>
          <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">
            {summary ? summary.security_alerts : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Watchlist / Anomalies</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Traffic Violations</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {summary ? summary.traffic_violations : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Speed / Wrong-way</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Camera Failures</span>
          <span className="text-2xl font-black font-mono text-orange-400 mt-1 block">
            {summary ? summary.camera_failures : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Offline / Heartbeat loss</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Traffic Anomalies</span>
          <span className="text-2xl font-black font-mono text-indigo-400 mt-1 block">
            {summary ? summary.traffic_anomalies : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Density & Flow spikes</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">Critical Priority</span>
          <span className="text-2xl font-black font-mono text-rose-500 mt-1 block">
            {summary ? summary.critical_alerts : (loading ? '…' : '0')}
          </span>
          <span className="text-[10px] text-rose-400 font-mono mt-0.5 block">Immediate attention</span>
        </div>
      </div>

      {/* 3. CATEGORY TABS & FILTER CONTROLS */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition ${
                selectedCategory === c.id
                  ? 'bg-cyan-900/60 border border-cyan-500 text-cyan-600 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by plate, camera, zone, alert ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">High / Warning</option>
            <option value="info">Info / Low</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          {/* Time range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {TIME_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. ALERTS FEED STREAM */}
      <div className="space-y-3">
        {sortedAlerts.length > 0 ? (
          sortedAlerts.map((a) => {
            const plateNumber = a.vehicle_plate || 'AP39AB1234';
            const isWatchlist = a.alert_type === 'watchlist_match';
            const isSpeed = a.alert_type === 'excessive_speed';
            const isCamera = a.alert_type === 'camera_failure' || a.alert_type === 'stream_loss';
            const isTraffic = a.alert_type === 'traffic_spike' || a.alert_type === 'congestion_alert';

            return (
              <div 
                key={a.id} 
                className={`p-4 rounded-2xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  a.is_resolved 
                    ? 'bg-slate-50/40 border-slate-200/60 opacity-65' 
                    : a.severity === 'critical'
                      ? 'bg-rose-950/30 border-rose-800/80 shadow-lg shadow-rose-950/20'
                      : a.severity === 'warning' || a.severity === 'high'
                        ? 'bg-orange-950/30 border-orange-800/80'
                        : 'bg-white/60 border-slate-200'
                }`}
              >
                {/* Left Telemetry Section */}
                <div className="flex items-start space-x-3.5">
                  <div className={`p-3 rounded-2xl mt-0.5 flex-shrink-0 ${
                    a.severity === 'critical' ? 'bg-rose-900/40 text-rose-400' :
                    a.severity === 'warning' || a.severity === 'high' ? 'bg-orange-900/40 text-orange-400' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {isWatchlist ? <ShieldAlert className="w-5 h-5" /> :
                     isSpeed ? <Zap className="w-5 h-5" /> :
                     isCamera ? <Camera className="w-5 h-5" /> :
                     isTraffic ? <Flame className="w-5 h-5" /> :
                     <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1.5">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${severityBadge(a.severity)}`}>
                        {a.severity}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border ${categoryBadge(a.category)}`}>
                        {a.category.replace('_', ' ')}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 font-mono">{a.title}</h3>
                      {a.is_resolved && (
                        <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 inline" />
                          <span>RESOLVED</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-sans">{a.description}</p>

                    {/* Specific Telemetry Details depending on Alert Type */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono text-slate-500">
                      {/* Vehicle Plate if available */}
                      {a.vehicle_plate && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Plate Number</span>
                          <span className="font-bold text-cyan-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            {a.vehicle_plate}
                          </span>
                        </div>
                      )}

                      {/* Camera Location */}
                      <div>
                        <span className="text-slate-500 block text-[10px]">Camera Node</span>
                        <span className="text-slate-800 truncate block max-w-[160px]">
                          {a.camera_name || a.camera_id}
                        </span>
                      </div>

                      {/* OCR Confidence with Tooltip */}
                      {a.confidence != null && (
                        <div>
                          <span className="text-slate-500 block text-[10px] flex items-center space-x-1">
                            <span>OCR Confidence</span>
                            <span title="Confidence of plate extraction. Does not establish wrongdoing.">
                              <HelpCircle className="w-3 h-3 text-slate-600 cursor-help" />
                            </span>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {Math.round(a.confidence * 100)}%
                          </span>
                        </div>
                      )}

                      {/* Speed Metrics if Overspeed */}
                      {isSpeed && a.speed_observed_kmh && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Speed / Limit</span>
                          <span className="text-rose-400 font-bold">
                            {a.speed_observed_kmh} km/h <span className="text-slate-500">({a.speed_limit_kmh} limit)</span>
                          </span>
                        </div>
                      )}

                      {/* Watchlist Category if Watchlist Match */}
                      {isWatchlist && a.watchlist_category && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Watchlist Tag</span>
                          <span className="text-amber-400 font-bold">{a.watchlist_category}</span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div>
                        <span className="text-slate-500 block text-[10px]">Timestamp</span>
                        <span className="text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Related sightings note */}
                    {a.related_alerts_count > 0 && (
                      <div className="text-[10px] text-indigo-400 font-mono pt-1">
                        + {a.related_alerts_count} related surveillance event(s) for vehicle {a.vehicle_plate}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Control Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                  
                  {/* Verify Match Button for Watchlist */}
                  {isWatchlist && !a.is_resolved && (
                    <button
                      onClick={() => {
                        setVerifyModalAlert(a);
                        setVerifyNotes('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Match</span>
                    </button>
                  )}

                  {/* Vehicle Details Link */}
                  {a.vehicle_plate && (
                    <Link
                      to={`/vehicles?plate=${encodeURIComponent(a.vehicle_plate)}`}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-medium transition flex items-center space-x-1"
                    >
                      <Car className="w-3.5 h-3.5 text-blue-400" />
                      <span>Vehicle</span>
                    </Link>
                  )}

                  {/* Trajectory Link (Only for vehicle events) */}
                  {a.vehicle_plate && !isCamera && (
                    <Link
                      to={`/trajectory?plate=${encodeURIComponent(a.vehicle_plate)}`}
                      className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-600 border border-cyan-800 text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Route className="w-3.5 h-3.5" />
                      <span>Trajectory</span>
                    </Link>
                  )}

                  {/* Camera Details Link (For infrastructure events) */}
                  {isCamera && a.camera_id && (
                    <Link
                      to={`/cameras/${a.camera_id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 border border-slate-300 text-xs font-medium transition flex items-center space-x-1"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Camera Info</span>
                    </Link>
                  )}

                  {/* Congestion Link (For traffic events) */}
                  {isTraffic && (
                    <Link
                      to="/congestion"
                      className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-medium transition flex items-center space-x-1"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Congestion</span>
                    </Link>
                  )}

                  {/* Investigation Link (For security alerts) */}
                  {isWatchlist && (
                    <Link
                      to="/investigations"
                      className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-medium transition flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Investigate</span>
                    </Link>
                  )}

                  {/* Full Details Drawer Button */}
                  <button
                    onClick={() => openAlertDetail(a)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 border border-slate-300 transition"
                    title="View Full Telemetry & Timeline"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Mark Resolved Button */}
                  {!a.is_resolved && (
                    <button
                      onClick={() => handleStatusChange(a.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-700 text-xs font-medium border border-slate-300 transition"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs font-mono bg-white/40 rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-slate-700 text-sm font-bold">No Alerts Matching Active Filters</p>
            <p className="text-slate-500">All surveillance triggers are currently cleared or filtered out.</p>
          </div>
        )}
      </div>

      {/* 5. WATCHLIST MATCH VERIFICATION MODAL */}
      {verifyModalAlert && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-800/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold font-mono text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Verify Watchlist Match: {verifyModalAlert.vehicle_plate}</span>
              </div>
              <button 
                onClick={() => setVerifyModalAlert(null)}
                className="text-slate-500 hover:text-slate-800 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs text-amber-300 space-y-1">
              <strong className="block font-bold">OPERATOR VERIFICATION POLICY:</strong>
              An optical match does NOT automatically confirm criminal wrongdoing. Compare camera snapshot attributes against registered watchlist record.
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-50/60 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">Observed OCR Plate</span>
                <span className="font-bold text-cyan-600 text-sm">{verifyModalAlert.vehicle_plate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Expected Watchlist Plate</span>
                <span className="font-bold text-amber-300 text-sm">{verifyModalAlert.vehicle_plate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">OCR Confidence</span>
                <span className="font-bold text-emerald-400">{Math.round(verifyModalAlert.confidence * 100)}%</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Watchlist Tag</span>
                <span className="font-bold text-rose-400">{verifyModalAlert.watchlist_category || 'Hotlist Target'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Camera Node</span>
                <span className="text-slate-700">{verifyModalAlert.camera_name || verifyModalAlert.camera_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Detection Timestamp</span>
                <span className="text-slate-700">{new Date(verifyModalAlert.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Verification Notes</label>
              <textarea
                rows={2}
                placeholder="Enter operator observation notes or reason for escalation..."
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                disabled={verifyActionLoading}
                onClick={() => handleVerifySubmit('CONFIRMED')}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Match</span>
              </button>

              <button
                disabled={verifyActionLoading}
                onClick={() => handleVerifySubmit('FALSE_MATCH')}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>False Match</span>
              </button>

              <button
                disabled={verifyActionLoading}
                onClick={() => handleVerifySubmit('ESCALATED')}
                className="py-2 px-3 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Escalate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DETAILED ALERT TELEMETRY DRAWER */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-xl h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-600 uppercase tracking-wider block">Alert Telemetry Inspector</span>
                <h2 className="text-base font-bold text-slate-900 font-mono mt-0.5">{selectedAlert.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Severity & Status Controls */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">Current Lifecycle</span>
                <span className="font-bold text-cyan-600">{selectedAlert.status}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleStatusChange(selectedAlert.id, 'ACKNOWLEDGED')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-800 text-[11px]"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleStatusChange(selectedAlert.id, 'UNDER_REVIEW')}
                  className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800 text-[11px]"
                >
                  Review
                </button>
                <button
                  onClick={() => handleStatusChange(selectedAlert.id, 'RESOLVED')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[11px]"
                >
                  Resolve
                </button>
              </div>
            </div>

            {/* Evidence & ANPR Extraction Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 font-mono uppercase block">Optical Evidence & Telemetry</span>
              
              <div className="p-3 bg-white/60 rounded-xl border border-slate-200/80 text-center text-xs font-mono text-slate-500">
                <div className="text-2xl font-black text-cyan-600 tracking-widest py-2 bg-slate-50 rounded-lg border border-slate-200 inline-block px-4 mb-2">
                  {selectedAlert.vehicle_plate || 'NO PLATE'}
                </div>
                <p className="text-[10px] text-slate-500">
                  Evidence crop: Synthetic ANPR vector extraction • Camera: {selectedAlert.camera_id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Vehicle Classification</span>
                  <span className="text-slate-800 capitalize">{selectedAlert.vehicle_type || 'Motor Car'} ({selectedAlert.vehicle_color || 'White'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Optical Confidence</span>
                  <span className="text-emerald-400 font-bold">{Math.round((selectedAlert.confidence || 0.95) * 100)}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Corridor / Zone</span>
                  <span className="text-slate-700">{selectedAlert.zone_name || 'Visakhapatnam'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Speed Recorded</span>
                  <span className="text-slate-800">{selectedAlert.speed_observed_kmh ? `${selectedAlert.speed_observed_kmh} km/h` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Vehicle Movement Timeline */}
            {selectedAlert.timeline && selectedAlert.timeline.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 font-mono uppercase block">
                  Recent Checkpoint Sightings ({selectedAlert.timeline.length})
                </span>
                <div className="space-y-2">
                  {selectedAlert.timeline.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="text-slate-800 font-bold">{item.camera_id}</div>
                        <div className="text-[10px] text-slate-500">{item.camera_name} • {item.zone_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-600">{item.time_str}</div>
                        <div className="text-[10px] text-slate-500">{item.speed_kmh} km/h</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick System Links */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-500 font-mono uppercase block">Investigative Drill-Down</span>
              <div className="grid grid-cols-2 gap-2">
                {selectedAlert.vehicle_plate && (
                  <>
                    <Link
                      to={`/vehicles?plate=${encodeURIComponent(selectedAlert.vehicle_plate)}`}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-xs font-bold transition flex items-center justify-between font-mono"
                    >
                      <span>Vehicle Registry</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>
                    <Link
                      to={`/trajectory?plate=${encodeURIComponent(selectedAlert.vehicle_plate)}`}
                      className="p-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-600 border border-cyan-800 text-xs font-bold transition flex items-center justify-between font-mono"
                    >
                      <span>Trajectory View</span>
                      <ChevronRight className="w-4 h-4 text-cyan-600" />
                    </Link>
                  </>
                )}
                <Link
                  to="/congestion"
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-xs font-bold transition flex items-center justify-between font-mono"
                >
                  <span>Congestion Radar</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </Link>
                <Link
                  to="/investigations"
                  className="p-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-bold transition flex items-center justify-between font-mono"
                >
                  <span>Investigation Cases</span>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 7. RELATED SYSTEMS FOOTER NAVIGATION */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
        <Link
          to="/vehicles"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Car className="w-4 h-4 text-blue-400" />
          <span>Vehicle Registry</span>
        </Link>
        <Link
          to="/trajectory"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Route className="w-4 h-4 text-cyan-600" />
          <span>Trajectory Reconstruction</span>
        </Link>
        <Link
          to="/traffic-flow"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <GitFork className="w-4 h-4 text-indigo-400" />
          <span>Origin-Destination Flows</span>
        </Link>
        <Link
          to="/congestion"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>Congestion Radar</span>
        </Link>
        <Link
          to="/cameras"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Camera Network</span>
        </Link>
        <Link
          to="/investigations"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-800 text-xs font-bold transition"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Case Management</span>
        </Link>
      </div>

    </div>
  );
}
