import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  GitFork, 
  MapPin, 
  Filter, 
  RefreshCw, 
  ArrowRight, 
  Activity,
  Layers,
  Car
} from 'lucide-react';
import { api } from '../services/api';
import { Zone } from '../types';

export default function TrafficFlow() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const flowsLayerRef = useRef<L.LayerGroup | null>(null);

  const [flows, setFlows] = useState<any[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedFlow, setSelectedFlow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Load zones
  useEffect(() => {
    api.get<Zone[]>('/zones').then(setZones).catch(console.error);
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      let url = '/analytics/origin-destination';
      if (selectedZone !== 'all') {
        url += `?zone_id=${selectedZone}`;
      }
      const data = await api.get<any[]>(url);
      setFlows(data);
      if (data.length > 0) setSelectedFlow(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [selectedZone]);

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
    flowsLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Draw Flow Vectors on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !flowsLayerRef.current) return;

    const layerGroup = flowsLayerRef.current;
    layerGroup.clearLayers();

    flows.forEach((f) => {
      const isSelected = selectedFlow?.id === f.id;
      const weight = Math.max(2.5, Math.min(8, f.vehicle_count / 15));
      const color = isSelected ? '#06b6d4' : '#3b82f6';

      const polyline = L.polyline([f.origin_coords, f.dest_coords], {
        color: color,
        weight: isSelected ? weight + 3 : weight,
        opacity: isSelected ? 1.0 : 0.65,
      });

      polyline.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <strong style="color: #0284c7;">Origin: ${f.origin_camera_name}</strong><br/>
          <strong style="color: #4f46e5;">Destination: ${f.dest_camera_name}</strong><br/>
          <div style="margin-top: 6px; padding: 4px; background: #f1f5f9; border-radius: 4px; font-size: 11px;">
            <span>Commuter Volume: <strong>${f.vehicle_count} vehicles</strong></span><br/>
            <span>Avg Travel Time: <strong>${f.avg_travel_time_sec}s</strong></span><br/>
            <span>Avg Corridor Velocity: <strong>${f.avg_speed_kmh} km/h</strong></span>
          </div>
        </div>
      `);

      polyline.on('click', () => {
        setSelectedFlow(f);
      });

      layerGroup.addLayer(polyline);

      // Origin Marker
      const originMarker = L.circleMarker(f.origin_coords, {
        radius: 5,
        color: '#0284c7',
        fillColor: '#0284c7',
        fillOpacity: 0.9,
      });
      layerGroup.addLayer(originMarker);

      // Dest Marker
      const destMarker = L.circleMarker(f.dest_coords, {
        radius: 6,
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: 0.9,
      });
      layerGroup.addLayer(destMarker);
    });
  }, [flows, selectedFlow]);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <GitFork className="w-4 h-4 text-cyan-400" />
            <span>Origin-Destination (OD) Flow Vectors & Transition Matrix</span>
          </h1>
          <span className="text-[11px] text-slate-400">
            Inter-camera commuter mobility corridors, transit durations, and corridor throughput
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Corridors & Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <button
            onClick={fetchFlows}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Flows"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Leaflet Flow Map + OD Transitions Table */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Map Container */}
        <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800 relative z-0 shadow-lg min-h-[350px]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] space-y-1 z-[1000] shadow-lg">
            <span className="font-bold text-slate-300 block text-[10px] uppercase font-mono tracking-wider">OD Vector Legend</span>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Origin Sensor Node</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Destination Sensor Node</span>
            </div>
          </div>
        </div>

        {/* Ranked OD Matrix Table */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto space-y-4">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Top Transition Corridors ({flows.length})
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">Ranked by volume</span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {flows.map((f) => {
                const isSelected = selectedFlow?.id === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFlow(f);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.panTo(f.origin_coords);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 truncate max-w-[200px]">
                        <span className="font-bold text-slate-200 truncate">{f.origin_camera_name}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="font-bold text-slate-200 truncate">{f.dest_camera_name}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400 text-xs">
                        {f.vehicle_count} v
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>{f.origin_zone} → {f.dest_zone}</span>
                      <span>{f.avg_travel_time_sec}s • {f.avg_speed_kmh} km/h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
            Visakhapatnam Origin-Destination Topology Grid
          </div>
        </div>
      </div>
    </div>
  );
}
