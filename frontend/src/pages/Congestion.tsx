import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Flame, 
  AlertTriangle, 
  Clock, 
  Activity, 
  RefreshCw, 
  Sparkles, 
  Cpu, 
  ShieldAlert, 
  Compass,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { api } from '../services/api';
import { Road } from '../types';

export default function Congestion() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  const [heatmapData, setHeatmapData] = useState<any | null>(null);
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedRoadId, setSelectedRoadId] = useState<number>(1);
  const [horizonMinutes, setHorizonMinutes] = useState<number>(15);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load Roads and Heatmap Data
  const loadCongestionData = async () => {
    setLoading(true);
    try {
      const [heatRes, roadsRes] = await Promise.all([
        api.get<any>('/analytics/congestion'),
        api.get<Road[]>('/roads')
      ]);
      setHeatmapData(heatRes);
      setRoads(roadsRes);
      if (roadsRes.length > 0) {
        setSelectedRoadId(roadsRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCongestionData();
  }, []);

  // Run Prototype Prediction
  const runPrediction = async (rId: number, horizon: number) => {
    setLoadingPrediction(true);
    try {
      const data = await api.get<any>(`/analytics/congestion/predict?road_id=${rId}&horizon_minutes=${horizon}`);
      setPrediction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrediction(false);
    }
  };

  useEffect(() => {
    if (selectedRoadId) {
      runPrediction(selectedRoadId, horizonMinutes);
    }
  }, [selectedRoadId, horizonMinutes]);

  // Init Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7200, 83.2700],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    heatmapLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Density Circles on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !heatmapLayerRef.current || !heatmapData) return;

    const layerGroup = heatmapLayerRef.current;
    layerGroup.clearLayers();

    heatmapData.heatmap_points?.forEach((pt: any) => {
      const radius = Math.max(12, pt.intensity * 25);
      const color = pt.intensity > 0.7 ? '#ef4444' : pt.intensity > 0.45 ? '#f59e0b' : '#10b981';

      const circle = L.circleMarker([pt.latitude, pt.longitude], {
        radius: radius,
        fillColor: color,
        color: color,
        weight: 1.5,
        opacity: 0.8,
        fillOpacity: 0.45,
      });

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <strong style="color: #0284c7;">${pt.road_name}</strong><br/>
          <span>${pt.camera_name}</span><br/>
          <div style="margin-top: 6px; padding: 4px; background: #f1f5f9; border-radius: 4px; font-size: 11px;">
            <span>Occupancy Density: <strong>${Math.round(pt.intensity * 100)}%</strong></span><br/>
            <span>Severity: <strong>${pt.severity.toUpperCase()}</strong></span>
          </div>
        </div>
      `);

      layerGroup.addLayer(circle);
    });
  }, [heatmapData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>Corridor Congestion & Predictive Risk Forecasting</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time arterial road occupancy density, bottle-neck detection & prototype forecast model
          </p>
        </div>

        <button
          onClick={loadCongestionData}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Live Density</span>
        </button>
      </div>

      {/* Grid: Live Map + Affected Corridors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map */}
        <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800 relative z-0 shadow-lg min-h-[380px]">
          <div ref={mapContainerRef} className="w-full h-full" />

          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] space-y-1 z-[1000] shadow-lg">
            <span className="font-bold text-slate-300 block text-[10px] uppercase font-mono tracking-wider">Density Intensity</span>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Low (&lt;45%)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Moderate (45-70%)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Severe (&gt;70%)</span>
            </div>
          </div>
        </div>

        {/* Affected Corridors */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Active Congestion Hotspots ({heatmapData?.affected_corridors?.length || 0})
              </h2>
              <span className="text-[10px] text-rose-400 font-mono">High Density</span>
            </div>

            <div className="space-y-2.5 mt-3 max-h-[300px] overflow-y-auto pr-1">
              {heatmapData?.affected_corridors?.map((c: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">{c.road_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      c.severity === 'severe' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                      'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {c.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{c.zone_name}</span>
                    <span className="font-bold text-rose-400">{c.current_density}% occupancy</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Congestion Duration: ~{c.duration_minutes} mins
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
            Visakhapatnam Congestion Radar • Real Density Stream
          </div>
        </div>
      </div>

      {/* Flagship PROTOTYPE Congestion Prediction Section */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-indigo-900/60 shadow-xl space-y-6">
        {/* Prototype Header with Honest Compliance Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-950 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Prototype Congestion Risk Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Forecasts corridor density over N-minute horizons via pluggable estimator interface
            </p>
          </div>

          {/* Mandatory Prototype Disclaimer Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-300 text-xs font-mono flex items-center space-x-2 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold">PROTOTYPE MODEL — DEMO / SIMULATION PURPOSES ONLY</span>
          </div>
        </div>

        {/* Prediction Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Road Corridor</label>
            <select
              value={selectedRoadId}
              onChange={(e) => setSelectedRoadId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {roads.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.zone_name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Prediction Horizon</label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHorizonMinutes(m)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition ${
                    horizonMinutes === m
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  +{m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prediction Results & Forecast Chart */}
        {prediction && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-bold text-slate-300 font-mono uppercase block">
                Forecasted Density Trajectory (+{prediction.horizon_minutes} Minutes)
              </span>

              <div className="h-56 w-full p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.forecast_series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="predicted_density_pct" name="Predicted Density (%)" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Current Occupancy:</span>
                    <span className="text-sm font-bold font-mono text-slate-200">{prediction.current_density_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Predicted in +{prediction.horizon_minutes}m:</span>
                    <span className="text-lg font-black font-mono text-indigo-400">{prediction.predicted_density_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-xs text-slate-400">Calculated Risk Level:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      prediction.risk_level === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                      prediction.risk_level === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {prediction.risk_level}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/60 text-xs text-indigo-200 space-y-1">
                  <span className="font-bold block text-indigo-300">Automated Tactical Recommendation:</span>
                  <p className="text-[11px] leading-relaxed text-slate-300">{prediction.recommendation}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[10px] text-slate-500 font-mono">
                {prediction.disclaimer}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
