import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Camera as CameraIcon, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  SlidersHorizontal,
  Navigation,
  Radio,
  Gauge
} from 'lucide-react';
import { api } from '../services/api';
import { Camera, Zone } from '../types';

export default function LiveMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'warning' | 'offline'>('all');
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  // Load cameras and zones
  const loadMapData = async () => {
    setLoading(true);
    try {
      const [camsData, zonesData] = await Promise.all([
        api.get<Camera[]>('/cameras'),
        api.get<Zone[]>('/zones')
      ]);
      setCameras(camsData);
      setZones(zonesData);
    } catch (err) {
      console.error("Failed to load map data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Visakhapatnam coordinates
    const map = L.map(mapContainerRef.current, {
      center: [17.7200, 83.2700],
      zoom: 12,
      zoomControl: true
    });

    // Dark-themed OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers on filter / data change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    const filtered = cameras.filter(cam => {
      const matchZone = selectedZone === 'all' || cam.zone_id === selectedZone;
      const matchStatus = statusFilter === 'all' || cam.status === statusFilter;
      return matchZone && matchStatus;
    });

    filtered.forEach(cam => {
      const color = cam.status === 'online' ? '#10b981' : cam.status === 'warning' ? '#f59e0b' : '#ef4444';
      
      const customIcon = L.divIcon({
        className: 'custom-camera-marker',
        html: `
          <div style="
            background-color: ${color};
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2.5px solid #0f172a;
            box-shadow: 0 0 10px ${color}88;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0f172a;
            font-weight: bold;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <strong style="font-size: 13px; color: #0284c7;">${cam.id}</strong><br/>
          <strong>${cam.name}</strong><br/>
          <span style="color: #64748b;">${cam.road_name || 'Corridor'} • ${cam.zone_name || 'Zone'}</span><br/>
          <div style="margin-top: 6px; padding: 4px; background: #f1f5f9; border-radius: 4px; font-size: 11px;">
            <span>Status: <strong>${cam.status.toUpperCase()}</strong></span><br/>
            <span>Direction: <strong>${cam.direction}</strong> | FPS: <strong>${cam.fps}</strong></span><br/>
            <span>OCR Accuracy: <strong>${cam.ocr_accuracy}%</strong></span>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedCamera(cam);
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [cameras, selectedZone, statusFilter]);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Live City GIS Map — Visakhapatnam</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                OpenStreetMap GIS
              </span>
            </h1>
            <span className="text-[11px] text-slate-400">
              Showing {cameras.length} CCTV / ANPR surveillance nodes across 6 operational zones
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Zones ({zones.length})</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online Only</option>
            <option value="warning">Warning Only</option>
            <option value="offline">Offline Only</option>
          </select>

          <button
            onClick={loadMapData}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh map data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Container & Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Map Area */}
        <div className="lg:col-span-9 rounded-2xl overflow-hidden border border-slate-800 relative z-0 shadow-lg">
          <div ref={mapContainerRef} className="w-full h-full min-h-[450px]" />
          
          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 z-[1000] shadow-lg">
            <span className="font-bold text-slate-300 block text-[10px] uppercase font-mono tracking-wider">Camera Status</span>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Online ({cameras.filter(c => c.status === 'online').length})</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Warning ({cameras.filter(c => c.status === 'warning').length})</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Offline ({cameras.filter(c => c.status === 'offline').length})</span>
            </div>
          </div>
        </div>

        {/* Selected Camera Drawer */}
        <div className="lg:col-span-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto space-y-4">
          {selectedCamera ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">{selectedCamera.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedCamera.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    selectedCamera.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {selectedCamera.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 mt-1">{selectedCamera.name}</h3>
                <span className="text-xs text-slate-400">{selectedCamera.road_name} • {selectedCamera.zone_name}</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Direction:</span>
                  <span className="font-mono font-semibold">{selectedCamera.direction}bound</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-mono">{selectedCamera.latitude.toFixed(4)}, {selectedCamera.longitude.toFixed(4)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Stream FPS:</span>
                  <span className="font-mono">{selectedCamera.fps} FPS</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Network Latency:</span>
                  <span className="font-mono">{selectedCamera.latency_ms} ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Real OCR Accuracy:</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedCamera.ocr_accuracy}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Vehicles / Min:</span>
                  <span className="font-mono">{selectedCamera.vehicles_per_min} vpm</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-500 space-y-2">
              <CameraIcon className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Click on any camera marker on the map to inspect live telemetry & OCR metrics.</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
            Visakhapatnam GIS Grid • EPSG:4326 WGS84
          </div>
        </div>
      </div>
    </div>
  );
}
