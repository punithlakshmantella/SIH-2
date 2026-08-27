import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Database, 
  Eye, 
  Search, 
  Filter, 
  Calendar, 
  RefreshCw, 
  Camera, 
  Activity, 
  AlertTriangle, 
  Car, 
  GitFork, 
  Zap, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface ReportCardMeta {
  id: string;
  title: string;
  desc: string;
  endpoint: string;
  filename: string;
  records_count: number;
  last_updated: string;
  date_range: string;
  status: string;
  summary?: any;
  breakdown?: any;
}

export default function Reports() {
  const [metadata, setMetadata] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global Filter States
  const [dateRange, setDateRange] = useState('30d');
  const [selectedZone, setSelectedZone] = useState('all');
  const [searchPlate, setSearchPlate] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Preview Modal States
  const [previewDataset, setPreviewDataset] = useState<ReportCardMeta | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSearch, setPreviewSearch] = useState('');

  const fetchMetadata = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/reports/meta');
      setMetadata(res.datasets);
    } catch (err) {
      console.error('Failed to load reports metadata', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Download CSV Handler
  const handleDownload = async (report: ReportCardMeta) => {
    setDownloadingId(report.id);
    try {
      const token = localStorage.getItem('cityvision_token');
      const response = await fetch(`http://localhost:8000/api/v1${report.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to generate CSV report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToastMessage(`Downloaded ${report.filename} successfully`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to export CSV dataset.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Open Preview Modal
  const openPreview = async (report: ReportCardMeta) => {
    setPreviewDataset(report);
    setPreviewPage(1);
    setPreviewSearch('');
    setPreviewLoading(true);

    try {
      const res = await api.get<any>(`/reports/preview/${report.id}?page=1&page_size=50`);
      setPreviewData(res);
    } catch (err) {
      console.error('Failed to load preview data', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Change Preview Page or In-Modal Search
  const fetchPreviewPage = async (page: number, searchVal: string) => {
    if (!previewDataset) return;
    setPreviewLoading(true);
    try {
      let url = `/reports/preview/${previewDataset.id}?page=${page}&page_size=50`;
      if (searchVal.trim()) url += `&search=${encodeURIComponent(searchVal.trim())}`;
      const res = await api.get<any>(url);
      setPreviewData(res);
      setPreviewPage(page);
    } catch (err) {
      console.error('Failed to load page', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Standard 4 Report Configurations
  const reportCards: ReportCardMeta[] = [
    {
      id: "traffic-volume",
      title: "Daily Traffic Volume & Corridor Utilization",
      desc: "Corridor-level vehicle counts, average speeds, lane directions, and optical read quality.",
      endpoint: "/reports/traffic-volume.csv",
      filename: metadata?.traffic_volume?.filename || "daily_traffic_volume_2026-08-27.csv",
      records_count: metadata?.traffic_volume?.records_count || 1596,
      last_updated: metadata?.traffic_volume?.last_updated || new Date().toISOString(),
      date_range: "Last 30 Days",
      status: "Ready"
    },
    {
      id: "alerts",
      title: "Watchlist Hits & Surveillance Anomaly Log",
      desc: "All automated security violations, overspeeding alerts, watchlist hits, and officer resolution logs.",
      endpoint: "/reports/alerts.csv",
      filename: metadata?.alerts_log?.filename || "watchlist_surveillance_log_2026-08-27.csv",
      records_count: metadata?.alerts_log?.records_count || 7,
      last_updated: metadata?.alerts_log?.last_updated || new Date().toISOString(),
      date_range: "Active & Historical Logs",
      status: "Ready"
    },
    {
      id: "od-matrix",
      title: "Origin-Destination (OD) Transit Matrix",
      desc: "Camera-to-camera commuter volumes, transit times, and average velocities across zones.",
      endpoint: "/reports/origin-destination.csv",
      filename: metadata?.od_matrix?.filename || "od_transit_matrix_2026-08-27.csv",
      records_count: metadata?.od_matrix?.records_count || 7,
      last_updated: metadata?.od_matrix?.last_updated || new Date().toISOString(),
      date_range: "Corridor Flow Vectors",
      status: "Ready",
      summary: metadata?.od_matrix?.summary
    },
    {
      id: "camera-health",
      title: "Camera Sensor Health & Telemetry Audit",
      desc: "Real-time stream FPS, network latency (ms), packet loss, and genuine OCR accuracy.",
      endpoint: "/reports/camera-health.csv",
      filename: metadata?.camera_health?.filename || "camera_health_telemetry_2026-08-27.csv",
      records_count: metadata?.camera_health?.records_count || 100,
      last_updated: metadata?.camera_health?.last_updated || new Date().toISOString(),
      date_range: "Live Network Ingest",
      status: "Ready",
      breakdown: metadata?.camera_health?.breakdown
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-mono animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Mobility, Surveillance &amp; Audit Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Export verified municipal traffic data, audit trails, and surveillance logs in standard CSV format
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified Ingest</span>
          </div>

          <button
            onClick={fetchMetadata}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition"
            title="Refresh Report Metas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. GLOBAL SEARCH & FILTER TOOLBAR */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200 uppercase font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Municipal Report Parameters &amp; Filter Scope</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Enforces server-side audit logs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {/* Date Range */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Date Range Scope</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="today">Today (Last 24 Hours)</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Ingested Records</option>
            </select>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Operational Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Operational Zones (City-Wide)</option>
              <option value="gajuwaka">Gajuwaka Industrial</option>
              <option value="nad">NAD Junction Hub</option>
              <option value="city_centre">City Centre &amp; Siripuram</option>
              <option value="beach_road">Beach Road Coastal</option>
            </select>
          </div>

          {/* Subject Plate Search */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Vehicle Plate Filter</label>
            <input
              type="text"
              placeholder="e.g. AP39AB1234"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 uppercase focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Alert Severity */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Alert Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical / Urgent</option>
              <option value="high">High / Warning</option>
              <option value="info">Info / Operational</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. FOUR REPORT DATASET CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {reportCards.map((r) => {
          const isDownloading = downloadingId === r.id;

          return (
            <div 
              key={r.id} 
              className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition flex flex-col justify-between space-y-4 shadow-lg"
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold">
                      CSV DATASET
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold">
                      STATUS: {r.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Live DB Ingestion</span>
                </div>

                {/* Title & Description */}
                <div>
                  <h2 className="text-base font-bold text-slate-100 font-mono">{r.title}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">{r.desc}</p>
                </div>

                {/* Metadata Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Records</span>
                    <span className="font-bold text-slate-200">{r.records_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Data Date Range</span>
                    <span className="text-slate-300">{r.date_range}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Last Updated</span>
                    <span className="text-slate-300">{new Date(r.last_updated).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Card 3: OD Visual Summary Mini-bar */}
                {r.summary && (
                  <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl text-[10px] font-mono text-indigo-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>Top Origin: <strong className="text-slate-200">{r.summary.top_origin_zone}</strong></div>
                    <div>Top Dest: <strong className="text-slate-200">{r.summary.top_dest_zone}</strong></div>
                    <div className="truncate">Busiest Route: <strong className="text-cyan-300">{r.summary.highest_volume_route}</strong></div>
                    <div>Avg Transit: <strong className="text-emerald-300">{r.summary.avg_transit_time_minutes}m</strong></div>
                  </div>
                )}

                {/* Card 4: Camera Health Breakdown Mini-bar */}
                {r.breakdown && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-[10px] font-mono text-slate-300 flex items-center justify-between">
                    <div>Healthy: <strong className="text-emerald-400">{r.breakdown.healthy}</strong></div>
                    <div>Warning: <strong className="text-amber-400">{r.breakdown.warning}</strong></div>
                    <div>Critical: <strong className="text-rose-400">{r.breakdown.critical}</strong></div>
                    <div>Offline: <strong className="text-slate-400">{r.breakdown.offline}</strong></div>
                    <div>Total Sensors: <strong className="text-cyan-400">{r.breakdown.total}</strong></div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Preview Data + Download CSV */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => openPreview(r)}
                  className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition border border-slate-700 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Preview Data</span>
                </button>

                <button
                  onClick={() => handleDownload(r)}
                  disabled={isDownloading}
                  className="flex items-center space-x-1.5 py-2 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-black transition shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Generating CSV…' : 'Download CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. PREVIEW DATA MODAL */}
      {previewDataset && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full h-[85vh] flex flex-col justify-between shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    DATASET PREVIEW
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing top 50 verified records (Page {previewPage})
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 font-mono mt-1">{previewDataset.title}</h2>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleDownload(previewDataset)}
                  disabled={downloadingId === previewDataset.id}
                  className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold shadow-md shadow-cyan-600/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === previewDataset.id ? 'Generating…' : 'Download Full CSV'}</span>
                </button>

                <button 
                  onClick={() => setPreviewDataset(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Modal Search Bar */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter preview records..."
                  value={previewSearch}
                  onChange={(e) => {
                    setPreviewSearch(e.target.value);
                    fetchPreviewPage(1, e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Total dataset size: <strong className="text-cyan-400">{previewData?.total_records || previewDataset.records_count}</strong> rows
              </div>
            </div>

            {/* Modal Table Container */}
            <div className="flex-1 overflow-auto p-6">
              {previewLoading ? (
                <div className="text-center py-20 text-xs font-mono text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                  <span>Loading dataset records...</span>
                </div>
              ) : previewData?.rows && previewData.rows.length > 0 ? (
                <table className="w-full text-left text-xs font-mono text-slate-300">
                  <thead className="bg-slate-950/90 text-slate-400 text-[10px] uppercase sticky top-0 border-b border-slate-800">
                    <tr>
                      {previewData.columns?.map((col: any) => (
                        <th key={col.key} className="p-3 whitespace-nowrap">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewData.rows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40 transition">
                        {previewData.columns?.map((col: any) => (
                          <td key={col.key} className="p-3 whitespace-nowrap">
                            {col.key.includes('speed') ? (
                              <span className="text-emerald-400 font-bold">{row[col.key]} km/h</span>
                            ) : col.key.includes('severity') ? (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                row[col.key] === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                                row[col.key] === 'HIGH' || row[col.key] === 'WARNING' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                                'bg-slate-800 text-slate-300'
                              }`}>
                                {row[col.key]}
                              </span>
                            ) : col.key.includes('vehicle_number') || col.key.includes('camera_id') ? (
                              <span className="font-bold text-cyan-300">{row[col.key]}</span>
                            ) : (
                              row[col.key] ?? '—'
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-20 text-xs font-mono text-slate-500">
                  No records matching active search filters.
                </div>
              )}
            </div>

            {/* Modal Pagination Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Showing up to 50 rows per batch</span>

              <div className="flex items-center space-x-2">
                <button
                  disabled={previewPage <= 1 || previewLoading}
                  onClick={() => fetchPreviewPage(previewPage - 1, previewSearch)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {previewPage}</span>
                <button
                  disabled={!previewData?.rows || previewData.rows.length < 50 || previewLoading}
                  onClick={() => fetchPreviewPage(previewPage + 1, previewSearch)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
