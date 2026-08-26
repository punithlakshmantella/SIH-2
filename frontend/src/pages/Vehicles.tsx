import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Car, 
  Search, 
  ArrowUpRight, 
  ShieldAlert, 
  Route, 
  Filter, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  Compass,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { Camera, Zone } from '../types';

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  
  // Filter States
  const [plate, setPlate] = useState(searchParams.get('plate') || '');
  const [vehicleType, setVehicleType] = useState(searchParams.get('type') || 'all');
  const [color, setColor] = useState(searchParams.get('color') || 'all');
  const [selectedCamera, setSelectedCamera] = useState(searchParams.get('camera') || 'all');
  const [selectedZone, setSelectedZone] = useState(searchParams.get('zone') || 'all');
  const [direction, setDirection] = useState(searchParams.get('direction') || 'all');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cameras and zones metadata
  useEffect(() => {
    Promise.all([
      api.get<Camera[]>('/cameras'),
      api.get<Zone[]>('/zones')
    ]).then(([cams, zns]) => {
      setCameras(cams);
      setZones(zns);
    }).catch(console.error);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (plate.trim()) params.append('plate', plate.trim());
      if (vehicleType !== 'all') params.append('vehicle_type', vehicleType);
      if (color !== 'all') params.append('color', color);
      if (selectedCamera !== 'all') params.append('camera_id', selectedCamera);
      if (selectedZone !== 'all') params.append('zone_id', selectedZone);
      if (direction !== 'all') params.append('direction', direction);

      setSearchParams(params);
      const data = await api.get<any[]>(`/vehicles/search?${params.toString()}`);
      setVehicles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const resetFilters = () => {
    setPlate('');
    setVehicleType('all');
    setColor('all');
    setSelectedCamera('all');
    setSelectedZone('all');
    setDirection('all');
    setSearchParams({});
    api.get<any[]>('/vehicles/search').then(setVehicles).catch(console.error);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Car className="w-5 h-5 text-cyan-400" />
            <span>Vehicle Intelligence & Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-criteria vehicle search, ANPR hit histories, and verified single-vehicle trajectories
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Flagship Demo Search Button */}
          <button
            onClick={() => {
              setPlate('AP39AB1234');
              setTimeout(() => {
                const params = new URLSearchParams({ plate: 'AP39AB1234' });
                setSearchParams(params);
                setLoading(true);
                api.get<any[]>('/vehicles/search?plate=AP39AB1234')
                  .then(setVehicles)
                  .finally(() => setLoading(false));
              }, 50);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700 text-xs font-mono font-bold transition flex items-center space-x-1.5"
          >
            <span>🎯 Load Demo Vehicle (AP39AB1234)</span>
          </button>
        </div>
      </div>

      {/* Multi-Criteria Filter Panel */}
      <form onSubmit={handleSearch} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multi-Criteria Search Parameters</span>
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition underline"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Plate */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1">License Plate (Full or Partial)</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g. AP39, AP39AB1234, TS09..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 uppercase font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Vehicle Classification</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 capitalize"
            >
              <option value="all">All Vehicle Types</option>
              <option value="car">Car / Sedan / SUV</option>
              <option value="motorcycle">Motorcycle / Scooter</option>
              <option value="auto_rickshaw">Auto Rickshaw</option>
              <option value="truck">Heavy Truck</option>
              <option value="bus">Public / Private Bus</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Paint Color</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 capitalize"
            >
              <option value="all">All Colors</option>
              <option value="white">White</option>
              <option value="silver">Silver / Grey</option>
              <option value="black">Black</option>
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="yellow">Yellow</option>
            </select>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Operational Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Zones</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Directions</option>
              <option value="NB">Northbound (NB)</option>
              <option value="SB">Southbound (SB)</option>
              <option value="EB">Eastbound (EB)</option>
              <option value="WB">Westbound (WB)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Searching Database...' : `Execute Search (${vehicles.length} results)`}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Found <strong>{vehicles.length}</strong> matching vehicles in database</span>
        <span className="font-mono text-[11px]">All searches automatically logged to immutable audit trail</span>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div 
            key={v.id} 
            className={`p-5 rounded-2xl bg-slate-900/70 border transition flex flex-col justify-between space-y-3 ${
              v.primary_plate === 'AP39AB1234'
                ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/40 bg-gradient-to-br from-slate-900 to-cyan-950/30'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-base font-mono font-black text-cyan-400 tracking-wider">
                  {v.primary_plate}
                </span>
                {v.is_flagged ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center space-x-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>FLAGGED</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                    ID #{v.id}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 capitalize mt-1 flex items-center space-x-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: v.color }}></span>
                <span>{v.color} {v.make} {v.model} ({v.vehicle_type})</span>
              </p>
            </div>

            {/* Computed Statistics */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 py-2 border-y border-slate-800/60 bg-slate-950/40 p-2.5 rounded-xl">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Detections</span>
                <span className="text-slate-200 font-bold">{v.total_detections} hits</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Cameras Visited</span>
                <span className="text-slate-200 font-bold">{v.cameras_visited_count} nodes</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Tracked Distance</span>
                <span className="text-slate-200 font-bold">{v.total_distance_km} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Avg Speed</span>
                <span className="text-slate-200 font-bold">{v.avg_speed_kmh} km/h</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span className="truncate max-w-[170px]" title={v.last_camera_name || v.last_zone_name}>
                Last seen: <strong>{v.last_zone_name || 'City'}</strong>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {v.last_seen_at ? new Date(v.last_seen_at).toLocaleTimeString() : 'Recent'}
              </span>
            </div>

            {/* Action Links */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to={`/vehicles/${v.primary_plate}`}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center justify-center space-x-1"
              >
                <span>Profile & Hits</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
              <Link
                to={`/trajectory?plate=${v.primary_plate}`}
                className="py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md shadow-cyan-600/20"
              >
                <Route className="w-3.5 h-3.5" />
                <span>Trajectory</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
