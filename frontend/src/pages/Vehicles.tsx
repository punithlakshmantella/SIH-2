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
  ShieldCheck,
  Video,
  FileText,
  X,
  Eye,
  FolderKanban,
  Printer,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { Camera, Zone } from '../types';

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [drawerVehicle, setDrawerVehicle] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(Boolean(searchParams.get('plate') || searchParams.get('type') || searchParams.get('color')));
  
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
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to search vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasSearched) {
      handleSearch();
    }
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
    setVehicles([]);
    setHasSearched(false);
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

      {/* Content Rendering: Initial State vs Loading vs Search Results */}
      {!hasSearched ? (
        <div className="p-12 sm:p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto border border-cyan-100 shadow-sm">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 font-mono uppercase tracking-wider">No vehicles loaded</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Please enter a license plate number above, select filters, or click <strong>Execute Search</strong> to retrieve active surveillance records from the city database.
            </p>
          </div>
          <button
            onClick={() => {
              setHasSearched(true);
              handleSearch();
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-600/20 transition inline-flex items-center space-x-1.5 font-mono"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Execute Search</span>
          </button>
        </div>
      ) : loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono">Querying intelligence registry...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3 max-w-md mx-auto my-8">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 font-mono uppercase">No Matching Vehicles Found</h3>
          <p className="text-xs text-slate-500">
            No active detection records matched the specified search filters. Try widening your criteria.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition font-mono"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Vehicles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedVehicles.map((v) => {
              const isSuspect = v.is_flagged || v.primary_plate === 'AP39AB1234' || v.primary_plate === 'AP31TX9901';
              const ownerName = v.owner_name || (
                v.primary_plate === 'AP39AB1234' ? 'Vikramaditya Rao (ID: AP-VSP-98214)' :
                v.primary_plate === 'AP31TX9901' ? 'K. S. Narayana (ID: AP-VSP-44102)' :
                v.primary_plate === 'TS09UB4432' ? 'Sri Balaji Roadlines Logistics' :
                'Ravi Varma (AP RTO Registry)'
              );
              const regStatus = isSuspect ? 'FLAGGED — Visakhapatnam CID' : 'ACTIVE / VALID (AP RTO)';

              return (
                <div 
                  key={v.id} 
                  className={`rounded-2xl bg-white border transition flex flex-col overflow-hidden shadow-sm hover:shadow-md ${
                    isSuspect
                      ? 'border-rose-400 ring-1 ring-rose-400/40 shadow-rose-500/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Visual License Plate Header Banner */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                    {/* Realistic Indian HSRP Plate Graphic */}
                    <div className="inline-flex items-center h-10 px-2.5 py-1 bg-white border-2 border-slate-800 rounded-lg shadow-sm">
                      {/* Blue IND Strip */}
                      <div className="flex flex-col items-center justify-center pr-2 border-r border-slate-300 mr-2">
                        <span className="text-[7px] font-bold font-mono text-blue-700 leading-none">IND</span>
                        <div className="w-1.5 h-1.5 rounded-full border border-blue-600 bg-blue-100 mt-0.5"></div>
                      </div>
                      {/* Plate Number */}
                      <span className="text-base font-mono font-black tracking-widest text-slate-900 select-all">
                        {v.primary_plate}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isSuspect ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 flex items-center space-x-1 uppercase tracking-wider font-mono">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          <span>Watchlist Match</span>
                        </span>
                      ) : v.alert_count > 0 ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 uppercase tracking-wider font-mono">
                          Alert-Associated
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center space-x-1 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-grow space-y-3">
                    {/* Vehicle Description */}
                    <div className="flex items-center space-x-2">
                      <span 
                        className="inline-block w-3.5 h-3.5 rounded-full border border-slate-400 shadow-sm shrink-0" 
                        style={{ backgroundColor: v.color || '#94a3b8' }}
                        title={`Color: ${v.color}`}
                      ></span>
                      <span className="text-xs font-bold text-slate-800 capitalize">
                        {v.color} {v.make || ''} {v.model || ''}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] font-mono text-slate-600 capitalize">
                        {v.vehicle_type}
                      </span>
                    </div>

                    {/* Owner & Registration Status (Requirement 7) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Owner:</span>
                        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px]">{ownerName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Reg Status:</span>
                        <span className={`font-mono font-bold text-[10px] ${isSuspect ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {regStatus}
                        </span>
                      </div>
                    </div>

                    {/* Computed Statistics */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Detection Count</span>
                        <span className="text-slate-900 font-bold text-sm">{v.total_detections} Hits</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Cameras Visited</span>
                        <span className="text-slate-900 font-bold text-sm">{v.cameras_visited_count} Nodes</span>
                      </div>
                    </div>

                    {/* Context Timeline & Location (Requirement 7) */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="uppercase text-[9px] text-slate-500 font-bold font-mono">Last Seen:</span>
                        <span className="font-mono text-slate-700 text-[11px]">
                          {v.last_seen_at ? new Date(v.last_seen_at).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="uppercase text-[9px] text-slate-500 font-bold font-mono">Current Location:</span>
                        <span className="truncate max-w-[190px] text-slate-800 font-semibold text-[11px]" title={v.last_camera_name || v.last_zone_name}>
                          {v.last_camera_name || v.last_zone_name || 'Siripuram Circle North ANPR'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Required Action Buttons (Requirement 7): View Details, View Route, View Video, Generate Report */}
                  <div className="grid grid-cols-4 gap-[1px] bg-slate-200 border-t border-slate-200 text-center">
                    <button
                      onClick={() => setDrawerVehicle(v)}
                      className="py-2.5 px-2 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="Open Vehicle Detail Drawer"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>Details</span>
                    </button>

                    <Link
                      to={`/trajectory?plate=${v.primary_plate}`}
                      className="py-2.5 px-2 bg-white hover:bg-purple-50 text-purple-700 text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="View Route Tracking"
                    >
                      <Route className="w-3 h-3 text-purple-600" />
                      <span>Route</span>
                    </Link>

                    <Link
                      to="/video-ingestion"
                      className="py-2.5 px-2 bg-white hover:bg-blue-50 text-blue-700 text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="View Video Footage"
                    >
                      <Video className="w-3 h-3 text-blue-600" />
                      <span>Video</span>
                    </Link>

                    <Link
                      to={`/reports?plate=${v.primary_plate}`}
                      className="py-2.5 px-2 bg-white hover:bg-cyan-50 text-cyan-800 text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="Generate Official Report"
                    >
                      <FileText className="w-3 h-3 text-cyan-600" />
                      <span>Report</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-mono">
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, vehicles.length)} of {vehicles.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* VEHICLE DETAIL DRAWER (Requirement 8) */}
      {drawerVehicle && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setDrawerVehicle(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                      RTA &amp; ANPR Telemetry
                    </span>
                    <span className="text-xs font-mono text-slate-400">UUID: {drawerVehicle.vehicle_id ? String(drawerVehicle.vehicle_id).slice(0, 10) : 'VEH-2026-881'}</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    Vehicle Detail Dossier
                  </h2>
                </div>

                <button
                  onClick={() => setDrawerVehicle(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. HSRP Number Plate Banner */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="inline-flex items-center bg-white border-2 border-slate-900 rounded-lg px-3 py-1.5 shadow-md">
                    <div className="flex flex-col items-center justify-center pr-2 border-r border-slate-300 mr-2">
                      <span className="text-[8px] font-black font-mono text-blue-700 leading-none">IND</span>
                      <div className="w-2 h-2 rounded-full border border-blue-600 bg-blue-100 mt-0.5"></div>
                    </div>
                    <span className="text-xl font-mono font-black tracking-widest text-slate-900 select-all">
                      {drawerVehicle.primary_plate}
                    </span>
                  </div>

                  {drawerVehicle.is_suspect || drawerVehicle.watchlisted ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 flex items-center space-x-1.5 font-mono">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>CRITICAL WATCHLIST HIT</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center space-x-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>RTA VERIFIED</span>
                    </span>
                  )}
                </div>

                {/* 2. Owner & Registration Section */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Owner &amp; Registration Identity
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Registered Owner</span>
                      <span className="text-sm font-bold text-slate-900">
                        {drawerVehicle.owner_name || (drawerVehicle.primary_plate?.includes('1234') ? 'Vikram Malhotra' : drawerVehicle.primary_plate?.includes('9901') ? 'Anand Varma' : 'K. Satyanarayana')}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono mt-0.5">+91 98480 ••••• • Res. Visakhapatnam</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Registration Status</span>
                      <span className={`text-sm font-mono font-bold ${drawerVehicle.is_suspect ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {drawerVehicle.is_suspect ? 'Blacklisted / Watchlist Suspect' : 'Active & Valid RTA Registered'}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono mt-0.5">RC No: RC-AP31-2021-98741</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">RTO Division</span>
                      <span className="text-slate-800 font-semibold">AP-31 Visakhapatnam North RTO</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Validity</span>
                      <span className="text-slate-800 font-mono">Valid up to 14 Mar 2036</span>
                    </div>
                  </div>
                </div>

                {/* 3. Vehicle Type, Color & Specs */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Vehicle Specifications
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Vehicle Type</span>
                      <span className="text-xs font-bold text-slate-900 capitalize flex items-center space-x-1 mt-1">
                        <Car className="w-3.5 h-3.5 text-cyan-600" />
                        <span>{drawerVehicle.vehicle_type || 'Car / Sedan'}</span>
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Body Color</span>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: drawerVehicle.color || '#94a3b8' }}
                        />
                        <span className="text-xs font-bold text-slate-900 capitalize truncate">
                          {drawerVehicle.color || 'White'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Make / Model</span>
                      <span className="text-xs font-bold text-slate-900 truncate block mt-1">
                        {drawerVehicle.make || 'Hyundai'} {drawerVehicle.model || 'Creta SX'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Insurance Section */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Motor Insurance Policy
                  </h3>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">National Insurance Company Ltd.</span>
                      <span className="text-[10px] text-slate-500 font-mono">Policy No: NIC-MOT-2025-88491-B</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active (Exp: 12 Dec 2026)
                    </span>
                  </div>
                </div>

                {/* 5. Last Seen & Current Location */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Surveillance Telemetry
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Current Location</span>
                      <span className="text-xs font-bold text-slate-900 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{drawerVehicle.last_camera_name || drawerVehicle.last_zone_name || 'Siripuram Circle North ANPR'}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">GPS: 17.7215° N, 83.3162° E</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Last Seen Timestamp</span>
                      <span className="text-xs font-mono font-bold text-slate-900 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>{drawerVehicle.last_seen_at ? new Date(drawerVehicle.last_seen_at).toLocaleString('en-IN') : '11 Sep 2026, 11:24:18 AM'}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Elapsed: 4 mins ago</span>
                    </div>
                  </div>
                </div>

                {/* 6. Visited Cameras & Detection History */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      Detection History ({drawerVehicle.total_detections || 6} Hits)
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-700 font-bold">
                      {drawerVehicle.cameras_visited_count || 4} Unique Cameras Visited
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Node / Road</th>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Speed</th>
                          <th className="py-2 px-3 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">Siripuram Circle North ANPR</td>
                          <td className="py-2 px-3 text-slate-500">11:24:18 AM</td>
                          <td className="py-2 px-3 text-slate-700">48 km/h</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">98.8%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">Jagadamba Junction Cinema Rd</td>
                          <td className="py-2 px-3 text-slate-500">11:15:02 AM</td>
                          <td className="py-2 px-3 text-slate-700">52 km/h</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">97.4%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">Beach Road Coastal Promenade</td>
                          <td className="py-2 px-3 text-slate-500">10:58:44 AM</td>
                          <td className="py-2 px-3 text-slate-700">39 km/h</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">99.1%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">Aganampudi Toll Plaza NH16</td>
                          <td className="py-2 px-3 text-slate-500">10:32:10 AM</td>
                          <td className="py-2 px-3 text-slate-700">64 km/h</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">98.2%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 7. Photographic Evidence Frame */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      ANPR Photographic Evidence Frame
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold">OCR Match: 98.9%</span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center shadow-inner">
                    {/* Simulated Camera Feed Frame */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
                    
                    {/* Bounding Box on Plate */}
                    <div className="relative border-2 border-emerald-400 bg-emerald-500/10 px-6 py-4 rounded-lg flex flex-col items-center">
                      <div className="text-[9px] font-mono font-bold text-emerald-300 bg-slate-900/90 px-1.5 py-0.5 rounded -top-3 absolute">
                        TARGET VEHICLE [YOLOv8x-ANPR]
                      </div>
                      <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded border border-slate-700 shadow">
                        <span className="text-[8px] font-bold text-blue-700 font-mono">IND</span>
                        <span className="text-base font-black font-mono tracking-widest text-slate-900">{drawerVehicle.primary_plate}</span>
                      </div>
                    </div>

                    {/* Camera OSD Watermarks */}
                    <div className="absolute top-2 left-3 text-[10px] font-mono text-emerald-400 flex items-center space-x-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>CAM-CTR-005 • SIRIPURAM NORTH</span>
                    </div>
                    <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-300">
                      SEC-65B HASH: 8f4b12a9e2d7c501...
                    </div>
                    <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-300">
                      11/09/2026 11:24:18 IST
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Action Buttons (Requirement 8): View Route, View Video, Open Investigation, Generate PDF */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-2.5">
                <Link
                  to={`/trajectory?plate=${drawerVehicle.primary_plate}`}
                  className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition"
                >
                  <Route className="w-4 h-4" />
                  <span>View Route</span>
                </Link>

                <Link
                  to="/video-ingestion"
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition"
                >
                  <Video className="w-4 h-4" />
                  <span>View Video</span>
                </Link>

                <Link
                  to={`/investigations?plate=${drawerVehicle.primary_plate}`}
                  className="py-2.5 px-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition"
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>Open Investigation</span>
                </Link>

                <Link
                  to={`/reports?plate=${drawerVehicle.primary_plate}`}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate PDF</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

