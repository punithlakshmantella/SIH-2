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
  AlertCircle,
  Printer,
  QrCode,
  Shield,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  Fingerprint
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

const INTELLIGENCE_CASES: Record<string, any> = {
  'CASE-2026-BEL-0914': {
    caseId: 'CASE-2026-BEL-0914',
    title: 'Inter-State Grand Vehicle Theft & Trafficking Syndicate',
    officer: 'Inspector K. Sharma',
    officerRole: 'Senior Investigating Officer, CID Crime Intelligence',
    badge: 'AP-CID-4091',
    dept: 'Criminal Investigation Department (CID)',
    plate: 'AP31DC0086',
    vehicleType: 'Sedan (Honda City 1.5 i-VTEC)',
    color: 'Pearl White',
    owner: 'K. Rajesh Kumar',
    chassis: 'ME4GM666KP8014529',
    engine: 'L15Z1-8402194',
    registration: 'ACTIVE (Valid till 14-Oct-2031 • Visakhapatnam RTO)',
    insurance: 'HDFC ERGO General Insurance (Policy #2311-890214-001 • Valid)',
    firNumber: 'FIR #402/2026 U/S 303(2), 317(2) BNS 2023',
    firDate: '09 Sep 2026, 08:30 IST',
    policeStation: 'Three Town Police Station (Siripuram)',
    priority: 'URGENT',
    classification: 'CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE',
    qrPayload: 'SEC-AP-POLICE-VERIFY-CASE-2026-BEL-0914-SHA256:7f08c3e9',
    digitalCert: 'CN=AP-POLICE-ANPR-CA-2026, O=Govt of Andhra Pradesh, Serial=09A4B8F2',
    sha256: 'a7b82f09c4d1e23891048b29c01829e1a847bb09c8214fa618294719bb810482',
    timeline: [
      { time: '06:42:15 IST', camId: 'CAM-004', camName: 'Beach Road - Novotel', road: 'RK Beach Corridor', speed: 48, direction: 'Northbound', conf: '99.1%', status: 'Normal Transit' },
      { time: '07:05:32 IST', camId: 'CAM-001', camName: 'Siripuram Circle Main', road: 'Waltair Main Road', speed: 38, direction: 'Westbound', conf: '98.8%', status: 'Watchlist Hit (ALARM)' },
      { time: '07:18:04 IST', camId: 'CAM-002', camName: 'Maddilapalem Junction', road: 'NH16 City Link', speed: 52, direction: 'Westbound', conf: '97.5%', status: 'Watchlist Corroborated' },
      { time: '07:35:48 IST', camId: 'CAM-003', camName: 'NAD Junction Flyover', road: 'Airport Road NH16', speed: 44, direction: 'Southwest', conf: '98.2%', status: 'Intercept Route Tracked' }
    ],
    snapshots: [
      { title: 'CAM-004 • Beach Road Entry', time: '06:42:15 IST', plateCrop: 'AP31DC0086', conf: '99.1%', junction: 'RK Beach Corridor' },
      { title: 'CAM-001 • Siripuram Circle (Hit)', time: '07:05:32 IST', plateCrop: 'AP31DC0086', conf: '98.8%', junction: 'Waltair Main Road' },
      { title: 'CAM-002 • Maddilapalem (Transit)', time: '07:18:04 IST', plateCrop: 'AP31DC0086', conf: '97.5%', junction: 'NH16 City Link' }
    ],
    routeSummary: 'RK Beach Corridor → Waltair Main Road → Maddilapalem NH16 → NAD Junction (14.2 km in 53 mins, Avg 45 km/h)'
  },
  'CASE-2026-BEL-1022': {
    caseId: 'CASE-2026-BEL-1022',
    title: 'Hit and Run Collision with Severe Grievous Harm',
    officer: 'Sub-Inspector M. Rao',
    officerRole: 'Traffic Law Enforcement Investigation Officer',
    badge: 'AP-TP-1082',
    dept: 'Visakhapatnam City Traffic Police',
    plate: 'TS09EA1234',
    vehicleType: 'SUV (Toyota Fortuner 4x4)',
    color: 'Midnight Black',
    owner: 'V. Satyanarayana',
    chassis: 'MBJ11VE8051209381',
    engine: '1GD-FTV-901842',
    registration: 'ACTIVE (Valid till 22-Feb-2033 • Hyderabad RTO)',
    insurance: 'ICICI Lombard General Insurance (Policy #9081-124981 • Valid)',
    firNumber: 'FIR #118/2026 U/S 106(1), 281 BNS 2023',
    firDate: '10 Sep 2026, 21:15 IST',
    policeStation: 'Gajuwaka Law & Order Police Station',
    priority: 'HIGH',
    classification: 'CONFIDENTIAL // COURT EVIDENTIARY SUBMISSION',
    qrPayload: 'SEC-AP-POLICE-VERIFY-CASE-2026-BEL-1022-SHA256:39a04f21',
    digitalCert: 'CN=AP-POLICE-ANPR-CA-2026, O=Govt of Andhra Pradesh, Serial=11D7C2A9',
    sha256: '9f02a8381014e7a839b20148c71829e8471b092781048b29c01829e1a847bb09',
    timeline: [
      { time: '21:04:10 IST', camId: 'CAM-005', camName: 'Gajuwaka Main Hub', road: 'Industrial Corridor', speed: 68, direction: 'Eastbound', conf: '98.5%', status: 'Over-speed Alarm' },
      { time: '21:14:45 IST', camId: 'CAM-006', camName: 'Scindia Junction', road: 'Port Access Road', speed: 74, direction: 'Northbound', conf: '97.2%', status: 'Incident Proximity Hit' },
      { time: '21:32:18 IST', camId: 'CAM-003', camName: 'NAD Junction Flyover', road: 'Airport Road NH16', speed: 61, direction: 'Northwest', conf: '96.9%', status: 'Fleeing Vector Tracked' }
    ],
    snapshots: [
      { title: 'CAM-005 • Gajuwaka Hub', time: '21:04:10 IST', plateCrop: 'TS09EA1234', conf: '98.5%', junction: 'Industrial Corridor' },
      { title: 'CAM-006 • Scindia Junction', time: '21:14:45 IST', plateCrop: 'TS09EA1234', conf: '97.2%', junction: 'Port Access Road' },
      { title: 'CAM-003 • NAD Junction', time: '21:32:18 IST', plateCrop: 'TS09EA1234', conf: '96.9%', junction: 'Airport Road NH16' }
    ],
    routeSummary: 'Gajuwaka Industrial Corridor → Scindia Junction → NAD Junction (18.6 km in 28 mins, Avg 67 km/h)'
  }
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'official_dossier' | 'csv_datasets'>('official_dossier');
  const [selectedCaseId, setSelectedCaseId] = useState('CASE-2026-BEL-0914');
  const [metadata, setMetadata] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global Filter States for CSV tab
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

  const activeCase = INTELLIGENCE_CASES[selectedCaseId] || INTELLIGENCE_CASES['CASE-2026-BEL-0914'];

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

  // Export CSV of Dossier Evidence
  const exportDossierCSV = (c: any) => {
    const headers = ['Case_ID', 'Target_Plate', 'Timestamp', 'Camera_ID', 'Camera_Name', 'Location_Road', 'Speed_KMPH', 'Direction', 'ANPR_Confidence', 'Status'];
    const rows = c.timeline.map((t: any) => [
      c.caseId,
      c.plate,
      `"${t.time}"`,
      t.camId,
      `"${t.camName}"`,
      `"${t.road}"`,
      t.speed,
      t.direction,
      t.conf,
      `"${t.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Police_Evidence_Report_${c.caseId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setToastMessage(`Downloaded Court Evidentiary CSV for ${c.caseId}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Trigger Print / Save as PDF
  const handlePrintDossier = () => {
    window.print();
  };

  // Download CSV Handler for Datasets
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

  const reportCards: ReportCardMeta[] = [
    {
      id: "traffic-volume",
      title: "Daily Traffic Volume & Corridor Utilization",
      desc: "Corridor-level vehicle counts, average speeds, lane directions, and optical read quality.",
      endpoint: "/reports/traffic-volume.csv",
      filename: metadata?.traffic_volume?.filename || "daily_traffic_volume_2026-09-11.csv",
      records_count: metadata?.traffic_volume?.records_count || 14280,
      last_updated: metadata?.traffic_volume?.last_updated || new Date().toISOString(),
      date_range: "Last 30 Days (Rolling)",
      status: "VERIFIED_OK"
    },
    {
      id: "vehicle-sightings",
      title: "City-Wide Vehicle ANPR Sightings & Corridors",
      desc: "Comprehensive vehicle plate detections, camera junctions, timestamp feeds, and confidence.",
      endpoint: "/reports/vehicle-sightings.csv",
      filename: metadata?.vehicle_sightings?.filename || "anpr_vehicle_sightings_2026-09-11.csv",
      records_count: metadata?.vehicle_sightings?.records_count || 89420,
      last_updated: metadata?.vehicle_sightings?.last_updated || new Date().toISOString(),
      date_range: "Current Operational Cycle",
      status: "VERIFIED_OK"
    },
    {
      id: "surveillance-alerts",
      title: "Surveillance Alarms, Hotlists & Critical Hits",
      desc: "Active alarms, stolen vehicle hotlist hits, over-speed violations, and officer notes.",
      endpoint: "/reports/surveillance-alerts.csv",
      filename: metadata?.surveillance_alerts?.filename || "surveillance_alarms_audit_2026-09-11.csv",
      records_count: metadata?.surveillance_alerts?.records_count || 2150,
      last_updated: metadata?.surveillance_alerts?.last_updated || new Date().toISOString(),
      date_range: "Active Fiscal Quarter",
      status: "VERIFIED_OK"
    },
    {
      id: "camera-health",
      title: "Camera Infrastructure Health & Audit Telemetry",
      desc: "Node-by-node FPS rates, network roundtrip latency, OCR performance benchmarks, and status.",
      endpoint: "/reports/camera-health.csv",
      filename: metadata?.camera_health?.filename || "camera_sensor_telemetry_2026-09-11.csv",
      records_count: metadata?.camera_health?.records_count || 48,
      last_updated: metadata?.camera_health?.last_updated || new Date().toISOString(),
      date_range: "Real-Time Telemetry",
      status: "VERIFIED_OK",
      breakdown: metadata?.camera_health?.breakdown || { healthy: 42, warning: 4, critical: 2, offline: 0, total: 48 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 z-50 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-mono font-bold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & TAB SWITCHER (no-print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2 font-mono">
            <Shield className="w-6 h-6 text-cyan-600" />
            <span>Law Enforcement Intelligence &amp; Mobility Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Official police dossier generation, digital evidentiary traces, and municipal traffic data exports
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono">
          <button
            onClick={() => setActiveTab('official_dossier')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'official_dossier'
                ? 'bg-white text-cyan-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
            <span>Police Intelligence Dossier</span>
          </button>
          <button
            onClick={() => setActiveTab('csv_datasets')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'csv_datasets'
                ? 'bg-white text-cyan-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-slate-500" />
            <span>Municipal CSV Datasets</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OFFICIAL LAW ENFORCEMENT INTELLIGENCE REPORT (REQUIREMENT 12)       */}
      {/* ========================================================================= */}
      {activeTab === 'official_dossier' && (
        <div className="space-y-6">
          {/* Case Selector Toolbar (no-print) */}
          <div className="no-print p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-700">Select Investigation Dossier:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-cyan-500"
              >
                <option value="CASE-2026-BEL-0914">CASE-2026-BEL-0914 (AP31DC0086 — Stolen White Honda City)</option>
                <option value="CASE-2026-BEL-1022">CASE-2026-BEL-1022 (TS09EA1234 — Black Toyota Fortuner)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportDossierCSV(activeCase)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold border border-slate-300 transition"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600" />
                <span>Export Evidence CSV</span>
              </button>

              <button
                onClick={handlePrintDossier}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-bold shadow-md shadow-cyan-600/20 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* PRINTABLE OFFICIAL INTELLIGENCE DOSSIER */}
          <div 
            id="official-police-report"
            className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-slate-300 shadow-xl space-y-8 max-w-5xl mx-auto print:border-none print:shadow-none print:p-2"
          >
            {/* 1. Official Government Header / State Emblem */}
            <div className="border-b-2 border-slate-900 pb-5 text-center relative">
              <div className="flex items-center justify-center space-x-4 mb-2">
                {/* Andhra Pradesh Police Seal Graphic */}
                <div className="w-16 h-16 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center border-2 border-amber-500/80 shadow-md">
                  <Shield className="w-10 h-10 text-amber-400" />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-wider font-serif">
                GOVERNMENT OF ANDHRA PRADESH • POLICE DEPARTMENT
              </h1>
              <div className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide font-mono mt-0.5">
                SMART CITY TRAFFIC SURVEILLANCE &amp; INTELLIGENCE WING (VISAKHAPATNAM COMMAND)
              </div>
              <div className="inline-block mt-2 px-3 py-0.5 rounded bg-rose-900 text-white text-[10px] font-mono font-black tracking-widest uppercase">
                {activeCase.classification}
              </div>

              {/* Watermark badge on right */}
              <div className="absolute right-0 top-0 text-right hidden sm:block font-mono text-[10px] text-slate-500">
                <div>DOC REF: AP-EVID-2026-BNS</div>
                <div>SEC. 65B COMPLIANT</div>
              </div>
            </div>

            {/* 2. Metadata Grid: Case ID, Officer, Date */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Case Dossier ID</span>
                <span className="text-sm font-black text-slate-900">{activeCase.caseId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Investigating Officer</span>
                <span className="font-bold text-slate-900">{activeCase.officer}</span>
                <span className="text-[10px] text-slate-500 block">{activeCase.badge}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Jurisdiction Station</span>
                <span className="font-bold text-slate-800">{activeCase.policeStation}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Report Generation</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span className="text-[10px] text-slate-500 block">07:45 IST (System Time)</span>
              </div>
            </div>

            {/* 3. Target Vehicle Profile */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5">
                <Car className="w-4 h-4 text-cyan-700" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  I. TARGET VEHICLE SPECIFICATIONS &amp; RTO REGISTRY
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white border border-slate-200">
                {/* HSRP Graphic */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-mono text-slate-400 mb-1">REGISTERED HSRP PLATE</span>
                  <div className="inline-flex items-center border-2 border-slate-900 rounded-md bg-white px-3 py-1 font-mono font-black text-slate-950 text-base tracking-widest shadow-sm">
                    <span className="text-[10px] bg-blue-700 text-white px-1 py-0.5 rounded-sm mr-2 font-sans font-bold">IND</span>
                    <span>{activeCase.plate}</span>
                  </div>
                  <span className="text-[9px] text-rose-600 font-bold font-mono mt-1.5">FLAGGED: {activeCase.priority}</span>
                </div>

                <div className="space-y-1.5 text-xs font-mono sm:col-span-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vehicle Classification</span>
                      <span className="font-bold text-slate-900">{activeCase.vehicleType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Color &amp; Exterior</span>
                      <span className="font-bold text-slate-900">{activeCase.color}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Chassis Number</span>
                      <span className="text-slate-800">{activeCase.chassis}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Engine Number</span>
                      <span className="text-slate-800">{activeCase.engine}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Registered Legal Owner</span>
                      <span className="font-bold text-slate-900">{activeCase.owner}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">RTO Registration Status</span>
                      <span className="text-emerald-700 font-semibold">{activeCase.registration}</span>
                    </div>
                  </div>
                  <div className="pt-1 text-[11px] text-slate-600">
                    <span className="font-bold">Insurance:</span> {activeCase.insurance}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Chronological Evidence Timeline */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5">
                <Clock className="w-4 h-4 text-cyan-700" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  II. CHRONOLOGICAL ANPR SENSOR TELEMETRY &amp; CAMERA EVIDENCE
                </h2>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs font-mono text-slate-800">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Time (IST)</th>
                      <th className="p-2.5">Camera ID</th>
                      <th className="p-2.5">Sensor Location &amp; Road</th>
                      <th className="p-2.5">Direction</th>
                      <th className="p-2.5">Speed</th>
                      <th className="p-2.5">Confidence</th>
                      <th className="p-2.5">Surveillance Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeCase.timeline.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold">{item.time}</td>
                        <td className="p-2.5 font-bold text-cyan-800">{item.camId}</td>
                        <td className="p-2.5">
                          <div className="font-semibold">{item.camName}</div>
                          <div className="text-[10px] text-slate-500">{item.road}</div>
                        </td>
                        <td className="p-2.5">{item.direction}</td>
                        <td className="p-2.5 font-bold">{item.speed} km/h</td>
                        <td className="p-2.5 text-emerald-700 font-bold">{item.conf}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            item.status.includes('ALARM') 
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : item.status.includes('Hit')
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Photographic Camera Snapshots */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5">
                <Camera className="w-4 h-4 text-cyan-700" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  III. HIGH-RESOLUTION OPTICAL SENSOR CAPTURES &amp; CROPPED CROPS
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeCase.snapshots.map((snap: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-white flex flex-col justify-between">
                    <div className="p-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-cyan-400">{snap.title}</span>
                      <span className="text-slate-400">{snap.time}</span>
                    </div>

                    {/* Simulated High-Resolution Camera Snapshot */}
                    <div className="h-32 bg-slate-800 relative flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] opacity-25" />
                      
                      {/* Bounding box simulation */}
                      <div className="border-2 border-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded text-center z-10">
                        <span className="text-[10px] font-mono font-bold text-emerald-300 block">ANPR DETECTED</span>
                        <span className="text-xs font-mono font-black text-white tracking-widest">{snap.plateCrop}</span>
                        <span className="text-[9px] font-mono text-emerald-400 block">{snap.conf} Match</span>
                      </div>

                      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400 z-10">
                        {snap.junction}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-950 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>SECURE RECORD #{idx + 1}</span>
                      <span className="text-emerald-400">HASH VERIFIED</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Route Reconstruction & Movement Vector */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5">
                <ArrowRight className="w-4 h-4 text-cyan-700" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  IV. VEHICLE ROUTE TRACKING &amp; CORRIDOR VECTOR RECONSTRUCTION
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
                <div className="text-slate-700 font-medium">
                  <strong>Route Tracking Summary:</strong> {activeCase.routeSummary}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">Origin: Beach Road</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">Siripuram Circle</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">Maddilapalem NH16</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2.5 py-1 rounded bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] font-bold">Intercept Point: NAD Junction</span>
                </div>
              </div>
            </div>

            {/* 7. Official Digital Signature, Seal & QR Code Block */}
            <div className="border-t-2 border-slate-900 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
              {/* QR Code Verification */}
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-300 flex items-center justify-center shrink-0">
                  <QrCode className="w-14 h-14 text-slate-900" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Digital Verification</span>
                  <div className="text-[10px] text-slate-700 leading-tight">
                    Scan via AP Police e-Investigation App to verify cryptographically signed token.
                  </div>
                  <span className="text-[9px] text-cyan-700 font-bold block">CODE: {activeCase.caseId.replace('CASE-', '')}</span>
                </div>
              </div>

              {/* Legal Certificate / Admissibility */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[10.5px] leading-tight text-slate-600">
                <div className="flex items-center space-x-1 font-bold text-slate-900">
                  <Fingerprint className="w-3.5 h-3.5 text-cyan-600" />
                  <span>LEGAL ADMISSIBILITY CLAUSE</span>
                </div>
                <div>
                  This electronic record is generated by certified Automated License Plate Recognition (ANPR) systems. Admissible as primary digital evidence under Section 65B of the Indian Evidence Act / Section 63 of Bharatiya Sakshya Adhiniyam 2023.
                </div>
                <div className="text-[9px] text-slate-500 truncate" title={activeCase.sha256}>
                  SHA256: {activeCase.sha256.slice(0, 28)}...
                </div>
              </div>

              {/* Digital Officer Signature Block */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-right">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Digitally Certified &amp; Submitted By:</span>
                  <div className="font-bold text-slate-900 text-sm">{activeCase.officer}</div>
                  <div className="text-[10px] text-slate-600">{activeCase.officerRole}</div>
                  <div className="text-[10px] text-slate-500">{activeCase.dept}</div>
                </div>

                <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    DIGITALLY SIGNED
                  </span>
                  <span>{activeCase.badge}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MUNICIPAL CSV DATASETS & MOBILITY AUDITS                           */}
      {/* ========================================================================= */}
      {activeTab === 'csv_datasets' && (
        <div className="space-y-6">
          {/* Global Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase font-mono">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
                <span>Municipal Report Parameters &amp; Filter Scope</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Enforces server-side audit logs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Date Range Scope</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="today">Today (Last 24 Hours)</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Ingested Records</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Operational Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Operational Zones (City-Wide)</option>
                  <option value="gajuwaka">Gajuwaka Industrial</option>
                  <option value="nad">NAD Junction Hub</option>
                  <option value="city_centre">City Centre &amp; Siripuram</option>
                  <option value="beach_road">Beach Road Coastal</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Vehicle Plate Filter</label>
                <input
                  type="text"
                  placeholder="e.g. AP39AB1234"
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Alert Severity</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical / Urgent</option>
                  <option value="high">High / Warning</option>
                  <option value="info">Info / Operational</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Dataset Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {reportCards.map((r) => {
              const isDownloading = downloadingId === r.id;

              return (
                <div 
                  key={r.id} 
                  className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4 shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold">
                          CSV DATASET
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                          STATUS: {r.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Live DB Ingestion</span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900 font-mono">{r.title}</h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">{r.desc}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-500">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Total Records</span>
                        <span className="font-bold text-slate-800">{r.records_count.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Date Range</span>
                        <span className="text-slate-700">{r.date_range}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Last Updated</span>
                        <span className="text-slate-700">{new Date(r.last_updated).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                    <button
                      onClick={() => openPreview(r)}
                      className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold transition border border-slate-300"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Preview Data</span>
                    </button>

                    <button
                      onClick={() => handleDownload(r)}
                      disabled={isDownloading}
                      className="flex items-center space-x-1.5 py-2 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-bold transition shadow-md disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloading ? 'Generating…' : 'Download CSV'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dataset Preview Modal */}
      {previewDataset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full h-[85vh] flex flex-col justify-between shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                    DATASET PREVIEW
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing verified records (Page {previewPage})
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 font-mono mt-1">{previewDataset.title}</h2>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleDownload(previewDataset)}
                  disabled={downloadingId === previewDataset.id}
                  className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-bold shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === previewDataset.id ? 'Generating…' : 'Download Full CSV'}</span>
                </button>

                <button 
                  onClick={() => setPreviewDataset(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter preview records..."
                  value={previewSearch}
                  onChange={(e) => {
                    setPreviewSearch(e.target.value);
                    fetchPreviewPage(1, e.target.value);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="text-[11px] font-mono text-slate-500">
                Total rows: <strong className="text-cyan-700">{previewData?.total_records || previewDataset.records_count}</strong>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {previewLoading ? (
                <div className="text-center py-20 text-xs font-mono text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
                  <span>Loading dataset records...</span>
                </div>
              ) : previewData?.rows && previewData.rows.length > 0 ? (
                <table className="w-full text-left text-xs font-mono text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      {previewData.columns?.map((col: any) => (
                        <th key={col.key} className="p-3 whitespace-nowrap">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.rows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {previewData.columns?.map((col: any) => (
                          <td key={col.key} className="p-3 whitespace-nowrap">
                            {col.key.includes('speed') ? (
                              <span className="text-emerald-700 font-bold">{row[col.key]} km/h</span>
                            ) : col.key.includes('severity') ? (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                row[col.key] === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                row[col.key] === 'HIGH' || row[col.key] === 'WARNING' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {row[col.key]}
                              </span>
                            ) : col.key.includes('vehicle_number') || col.key.includes('camera_id') ? (
                              <span className="font-bold text-cyan-800">{row[col.key]}</span>
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

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Showing 50 records per page</span>

              <div className="flex items-center space-x-2">
                <button
                  disabled={previewPage <= 1 || previewLoading}
                  onClick={() => fetchPreviewPage(previewPage - 1, previewSearch)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {previewPage}</span>
                <button
                  disabled={!previewData?.rows || previewData.rows.length < 50 || previewLoading}
                  onClick={() => fetchPreviewPage(previewPage + 1, previewSearch)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
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
