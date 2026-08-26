import React from 'react';
import { Settings, ShieldCheck, Database, Radio } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>System Environment & Node Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Platform telemetry parameters, Visakhapatnam GIS grid parameters, and engine configs
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Operational Parameters
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Target Metropolitan City:</span>
            <span className="font-mono font-bold text-cyan-400">Visakhapatnam, Andhra Pradesh</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Map Center Coordinates:</span>
            <span className="font-mono text-slate-200">17.6868° N, 83.2185° E</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">ANPR / OCR Pipeline Engine:</span>
            <span className="font-mono text-slate-200">OpenCV CLAHE + Generic Indian HSRP Parser</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Re-ID Engine Mode:</span>
            <span className="font-mono text-slate-200">Multi-Modal Spatio-Temporal Heuristics</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400">Max Physical Speed Threshold:</span>
            <span className="font-mono text-slate-200">140.0 km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
