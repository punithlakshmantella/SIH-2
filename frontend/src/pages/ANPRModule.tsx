import React, { useState, useEffect } from 'react';
import { ScanLine, Upload, CheckCircle2, AlertTriangle, Cpu, ArrowRight, ShieldCheck, Sparkles, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';

export default function ANPRModule() {
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<string>('clean_ap39ab1234.jpg');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<any>('/anpr/samples').then((data) => {
      if (data && data.samples) {
        setSamples(data.samples);
      }
    }).catch(console.error);
  }, []);

  const runInference = async (sampleName: string) => {
    setSelectedSample(sampleName);
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('sample_filename', sampleName);
      const res = await api.post<any>('/anpr/inference', formData);
      setResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ScanLine className="w-5 h-5 text-cyan-400" />
            <span>ANPR & Generic Indian Plate OCR Lab</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real OpenCV image enhancement (CLAHE, deskew, denoising) and optical character extraction
          </p>
        </div>

        <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono rounded-full flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Real Model Inference Active</span>
        </div>
      </div>

      {/* Grid: Sample Selector & Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sample Footage Selection */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Bundled Sample Footage</span>
            </h2>
            <p className="text-xs text-slate-400">
              Run real inference against clean reference shots or deliberately degraded adverse footage:
            </p>

            <div className="space-y-2 pt-1">
              {samples.map((s) => (
                <button
                  key={s.filename}
                  type="button"
                  onClick={() => runInference(s.filename)}
                  className={`w-full p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedSample === s.filename
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{s.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      s.condition === 'clean'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {s.condition}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Real Inference Output */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Live ANPREngine Pipeline Output</span>
              </h3>
              {result && (
                <span className="text-xs text-slate-500 font-mono">
                  Latency: {result.execution_time_ms} ms
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Executing OpenCV preprocessing & OCR inference...</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Plate Output Box */}
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Extracted Registration</span>
                    <span className="text-3xl font-black text-slate-100 font-mono tracking-widest bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-800 inline-block mt-1">
                      {result.normalized_plate}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Optical Confidence</span>
                    <span className={`text-2xl font-black font-mono inline-block mt-1 ${
                      result.is_low_confidence ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {Math.round(result.confidence * 100)}%
                    </span>
                    <span className={`block text-[10px] font-bold uppercase mt-0.5 ${
                      result.is_low_confidence ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      [{result.confidence_label}]
                    </span>
                  </div>
                </div>

                {/* Preprocessing Applied */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">OpenCV Preprocessing Pipeline Applied:</span>
                  <div className="flex flex-wrap gap-2">
                    {result.preprocessing_applied.map((step: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300">
                        ✓ {step.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Classification */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">Vehicle Color</span>
                    <span className="text-xs font-bold text-slate-200 capitalize font-mono">{result.vehicle_color}</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">Vehicle Classification</span>
                    <span className="text-xs font-bold text-slate-200 capitalize font-mono">{result.vehicle_type}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                Select a sample footage image on the left to run live ANPR inference.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
