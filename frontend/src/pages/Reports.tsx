import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { api } from '../services/api';

export default function Reports() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const reportEndpoints = [
    {
      id: "traffic-volume",
      title: "Daily Traffic Volume & Corridor Utilization",
      desc: "Corridor-level vehicle counts, average speeds, lane directions, and optical read quality.",
      endpoint: "/reports/traffic-volume.csv",
      filename: "visakhapatnam_traffic_volume.csv"
    },
    {
      id: "alerts",
      title: "Watchlist Hits & Surveillance Anomaly Log",
      desc: "All automated security violations, overspeeding alerts, and officer resolution logs.",
      endpoint: "/reports/alerts.csv",
      filename: "cityvision_alerts_log.csv"
    },
    {
      id: "od-flows",
      title: "Origin-Destination (OD) Transit Matrix",
      desc: "Camera-to-camera commuter volumes, transit times, and average velocities across zones.",
      endpoint: "/reports/origin-destination.csv",
      filename: "visakhapatnam_od_matrix.csv"
    },
    {
      id: "camera-health",
      title: "Camera Sensor Health & Telemetry Audit",
      desc: "Real-time stream FPS, network latency (ms), packet loss, and genuine OCR accuracy.",
      endpoint: "/reports/camera-health.csv",
      filename: "visakhapatnam_camera_health.csv"
    }
  ];

  const handleDownload = async (report: typeof reportEndpoints[0]) => {
    setDownloading(report.id);
    try {
      const token = localStorage.getItem('cityvision_token');
      const response = await fetch(`http://localhost:8000/api/v1${report.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to generate report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export report CSV.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span>Mobility, Surveillance & Audit Reports</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Export verified municipal traffic data, audit trails, and surveillance logs in standard CSV format
        </p>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportEndpoints.map((r) => (
          <div key={r.id} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-100">{r.title}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                  CSV DATASET
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Live DB Ingestion</span>
              <button
                onClick={() => handleDownload(r)}
                disabled={downloading === r.id}
                className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === r.id ? 'Generating CSV...' : 'Download CSV'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
