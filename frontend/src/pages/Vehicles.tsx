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
  Layers,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
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
  const [selectedZone, setSelectedZone] = useState(searchParams.get('zone') || 'all');
  const [direction, setDirection] = useState(searchParams.get('direction') || 'all');
  const [detectionStatus, setDetectionStatus] = useState(searchParams.get('status') || 'all');
  const [minConfidence, setMinConfidence] = useState(searchParams.get('confidence') || '0');
  
  // Date/Time range
  const [timeFrom, setTimeFrom] = useState(searchParams.get('from') || '');
  const [timeTo, setTimeTo] = useState(searchParams.get('to') || '');

  // Sorting and Pagination
  const [sortBy, setSortBy] = useState('last_seen_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
    setCurrentPage(1);

    try {
      const params = new URLSearchParams();
      if (plate.trim()) params.append('plate', plate.trim());
      if (vehicleType !== 'all') params.append('vehicle_type', vehicleType);
      if (color !== 'all') params.append('color', color);
      if (selectedZone !== 'all') params.append('zone_id', selectedZone);
      if (direction !== 'all') params.append('direction', direction);
      if (detectionStatus !== 'all') params.append('detection_status', detectionStatus);
      if (minConfidence !== '0') params.append('min_confidence', String(parseInt(minConfidence) / 100));
      if (timeFrom) {
        const fromDate = new Date();
        const [hours, minutes] = timeFrom.split(':');
        fromDate.setHours(parseInt(hours), parseInt(minutes), 0);
        params.append('start_time', fromDate.toISOString());
      }
      if (timeTo) {
        const toDate = new Date();
        const [hours, minutes] = timeTo.split(':');
        toDate.setHours(parseInt(hours), parseInt(minutes), 0);
        params.append('end_time', toDate.toISOString());
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFilters = () => {
    setPlate('');
    setVehicleType('all');
    setColor('all');
    setSelectedZone('all');
    setDirection('all');
    setDetectionStatus('all');
    setMinConfidence('0');
    setTimeFrom('');
    setTimeTo('');
    setSortBy('last_seen_desc');
    setSearchParams({});
    setCurrentPage(1);
    
    setLoading(true);
    api.get<any[]>('/vehicles/search').then(setVehicles).catch(console.error).finally(() => setLoading(false));
  };

  // Sort logic
  const sortedVehicles = [...vehicles].sort((a, b) => {
    switch (sortBy) {
      case 'last_seen_desc':
        return new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime();
      case 'first_seen_asc':
        return new Date(a.first_seen_at || 0).getTime() - new Date(b.first_seen_at || 0).getTime();
      case 'detections_desc':
        return (b.total_detections || 0) - (a.total_detections || 0);
      case 'distance_desc':
        return (b.total_distance_km || 0) - (a.total_distance_km || 0);
      case 'speed_desc':
        return (b.avg_speed_kmh || 0) - (a.avg_speed_kmh || 0);
      default:
        return 0;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedVehicles.length / itemsPerPage);
  const paginatedVehicles = sortedVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Banner */}
      <div className="w-full bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-center space-x-3 text-amber-300 shadow-md">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="text-sm">
          <strong className="font-bold tracking-wide">⚠ DEMO / SYNTHETIC DATA:</strong> Vehicle and camera records are prototype data generated for SIH demonstration. They do not represent real-world registered vehicle movements unless connected to a live VMS feed.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Car className="w-5 h-5 text-cyan-600" />
            <span>Vehicle Intelligence & Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-criteria ANPR detection registry, hit histories, and verified single-vehicle trajectories
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
            className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-600 border border-cyan-700 text-xs font-mono font-bold transition flex items-center space-x-1.5 shadow-lg shadow-cyan-900/20"
          >
            <span>🎯 Load Demo Vehicle (AP39AB1234)</span>
          </button>
        </div>
      </div>

      {/* Multi-Criteria Filter Panel */}
      <form onSubmit={handleSearch} className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-600" />
            <span>Multi-Criteria Search Parameters</span>
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-500 hover:text-slate-800 transition underline flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Plate */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">License Plate (Full or Partial)</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g. AP39, AP39AB1234..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 uppercase font-mono focus:outline-none focus:border-cyan-500 shadow-inner"
              />
            </div>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Classification</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 capitalize"
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
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Paint Color</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 capitalize"
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
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Operational Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Zones</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Directions</option>
              <option value="NB">Northbound (NB)</option>
              <option value="SB">Southbound (SB)</option>
              <option value="EB">Eastbound (EB)</option>
              <option value="WB">Westbound (WB)</option>
            </select>
          </div>

          {/* Detection Status */}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Detection Status</label>
            <select
              value={detectionStatus}
              onChange={(e) => setDetectionStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="normal">Normal / Unflagged</option>
              <option value="watchlist">Watchlist Match</option>
              <option value="alert-associated">Alert-Associated</option>
            </select>
          </div>

          {/* Min OCR Confidence */}
          <div>
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Min OCR Confidence</label>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="0">Any Confidence</option>
              <option value="80">&ge; 80%</option>
              <option value="90">&ge; 90%</option>
              <option value="95">&ge; 95%</option>
            </select>
          </div>

          {/* Time Range */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-slate-500 mb-1 uppercase font-mono">Detection Time Range</label>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200/80 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-sm font-bold transition shadow-lg shadow-cyan-500/30 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching Database...' : `Execute Search`}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Results Controls & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/40 border border-slate-200">
        <div className="text-sm text-slate-700 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-600" />
          <span>
            {vehicles.length === 0 
              ? 'No vehicles found matching criteria.' 
              : `Found ${vehicles.length} matching vehicle${vehicles.length !== 1 ? 's' : ''}`
            }
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-500 font-mono">Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="last_seen_desc">Last Seen (Newest)</option>
            <option value="first_seen_asc">First Seen (Oldest)</option>
            <option value="detections_desc">Highest Detection Count</option>
            <option value="distance_desc">Longest Tracked Distance</option>
            <option value="speed_desc">Highest Avg Speed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono">Querying intelligence registry...</p>
        </div>
      ) : (
        <>
          {/* Vehicles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedVehicles.map((v) => (
              <div 
                key={v.id} 
                className={`rounded-2xl bg-white/70 border transition flex flex-col overflow-hidden ${
                  v.is_flagged
                    ? 'border-rose-900/80 shadow-lg shadow-rose-950/20 bg-gradient-to-br from-slate-900 to-rose-950/10'
                    : v.primary_plate === 'AP39AB1234'
                      ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/20 bg-gradient-to-br from-slate-900 to-cyan-950/20'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5 flex-grow space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xl font-mono font-black text-cyan-600 tracking-wider">
                        {v.primary_plate}
                      </span>
                      <p className="text-[11px] text-slate-700 capitalize mt-1 flex items-center space-x-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-600 shadow-sm" style={{ backgroundColor: v.color }}></span>
                        <span>{v.color} {v.make || ''} {v.model || ''} ({v.vehicle_type})</span>
                      </p>
                    </div>
                    {v.is_flagged ? (
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center space-x-1 uppercase tracking-wider">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Watchlist Match</span>
                      </span>
                    ) : v.alert_count > 0 ? (
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 uppercase tracking-wider">
                        Alert-Associated
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900 flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Computed Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 py-3 border-y border-slate-200/60 bg-slate-50/40 p-3 rounded-xl mt-4">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Detections</span>
                      <span className="text-slate-800 font-bold text-sm">{v.total_detections}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Cameras Visited</span>
                      <span className="text-slate-800 font-bold text-sm">{v.cameras_visited_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Distance</span>
                      <span className="text-cyan-600 font-bold text-sm">
                        {v.total_detections > 1 ? `${v.total_distance_km} km` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Avg Speed</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {v.total_detections > 1 ? `${v.avg_speed_kmh} km/h` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="uppercase text-[9px] text-slate-500 font-bold">First Seen</span>
                      <span className="font-mono">
                        {v.first_seen_at ? new Date(v.first_seen_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="uppercase text-[9px] text-slate-500 font-bold">Last Seen</span>
                      <span className="font-mono">
                        {v.last_seen_at ? new Date(v.last_seen_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="uppercase text-[9px] text-slate-500 font-bold">Location</span>
                      <span className="truncate max-w-[170px] text-slate-700" title={v.last_camera_name || v.last_zone_name}>
                        {v.last_zone_name || 'City'} • {v.last_camera_name?.split(' ')[0] || ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Links */}
                <div className="grid grid-cols-2 gap-[1px] bg-slate-100 border-t border-slate-200">
                  <Link
                    to={`/vehicles/${v.primary_plate}`}
                    className="py-3 px-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-cyan-600 text-xs font-bold transition flex items-center justify-center space-x-1.5 uppercase tracking-wide"
                  >
                    <span>Profile & Hits</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/trajectory?plate=${v.primary_plate}`}
                    className="py-3 px-3 bg-white hover:bg-slate-100 text-cyan-600 hover:text-cyan-600 text-xs font-bold transition flex items-center justify-center space-x-1.5 uppercase tracking-wide"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>Trajectory</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-mono">
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, vehicles.length)} of {vehicles.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-30 hover:bg-slate-100 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-mono text-slate-700 px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-30 hover:bg-slate-100 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Audit trail notice */}
          <div className="text-center mt-6">
            <span className="font-mono text-[10px] text-slate-600">Search activity is logged for audit purposes.</span>
          </div>
        </>
      )}
    </div>
  );
}
