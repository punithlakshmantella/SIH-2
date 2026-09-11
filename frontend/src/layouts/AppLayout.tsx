import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Camera, 
  Bell, 
  LogOut, 
  Radio, 
  Menu, 
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  Search,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  User,
  Car,
  Route,
  FolderKanban,
  MapPin,
  Key,
  Shield,
  ShieldAlert,
  Award,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { 
  normalizeRole, 
  ROLE_CONFIGS, 
  isRouteAllowed,
  getNotificationsForRole, 
  getSearchableItemsForRole,
  NotificationItem,
  SearchableItem
} from '../utils/rbac';

function SimulationToggle() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<any>('/simulation/status')
      .then(res => setRunning(res.is_running))
      .catch(() => {});
  }, []);

  const toggleSimulation = async () => {
    setLoading(true);
    try {
      if (running) {
        await api.post('/simulation/stop');
        setRunning(false);
      } else {
        await api.post('/simulation/start');
        setRunning(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleSimulation}
      disabled={loading}
      className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold flex items-center space-x-1.5 border transition ${
        running
          ? 'bg-purple-950/80 text-purple-300 border-purple-800 shadow-md shadow-purple-950/50'
          : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
      }`}
      title={running ? 'Click to pause synthetic camera stream' : 'Click to start synthetic multi-camera stream'}
    >
      <span className={`w-2 h-2 rounded-full ${running ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'}`}></span>
      <span>{running ? 'SYNTHETIC STREAM ACTIVE' : 'START SIMULATION'}</span>
    </button>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Current Role & Configuration
  const currentRole = normalizeRole(user?.role);
  const roleConfig = ROLE_CONFIGS[currentRole];

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notifications State & Dropdown
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(getNotificationsForRole(user?.role));
  }, [user?.role]);

  // Officer Profile Modal State
  const [profileOpen, setProfileOpen] = useState(false);
  const profileModalRef = useRef<HTMLDivElement>(null);

  // Global Search State & Modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);

  const searchableItems = getSearchableItemsForRole(user?.role);
  const filteredSearchItems = searchQuery.trim() === ''
    ? searchableItems.slice(0, 6)
    : searchableItems.filter((item) => {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q));
      });

  // Multi-Entity Smart Search (Requirement 14: Vehicle Number, Camera ID, Road Name, Case ID, Officer, Date, Location)
  const smartEntities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const knownVehicles = [
      { plate: 'AP39AB1234', desc: 'Hyundai Creta SX (White) • Active Case #BEL-2026-0914', path: '/vehicles?plate=AP39AB1234' },
      { plate: 'AP31TX9901', desc: 'Honda City ZX (Black) • Stolen Vehicle Dossier', path: '/vehicles?plate=AP31TX9901' },
      { plate: 'TS09UB4432', desc: 'Mahindra Bolero • Speed Violator Flagged', path: '/vehicles?plate=TS09UB4432' },
      { plate: 'AP31DC0086', desc: 'Ashok Leyland Falcon Bus • Expired Commercial Permit', path: '/vehicles?plate=AP31DC0086' },
      { plate: 'MH12RN4590', desc: 'Toyota Fortuner • Suspicious Interstate Movement', path: '/vehicles?plate=MH12RN4590' },
      { plate: 'DL01AX7788', desc: 'Maruti Suzuki Dzire • Toll ANPR Detection', path: '/vehicles?plate=DL01AX7788' },
    ];

    const knownCameras = [
      { id: 'CAM-CTR-005', name: 'Siripuram Circle North ANPR', road: 'Siripuram Circle', path: '/cameras/CAM-CTR-005' },
      { id: 'CAM-HWY-002', name: 'NH16 South Highway Corridor', road: 'NH16 Highway', path: '/cameras/CAM-HWY-002' },
      { id: 'CAM-TOL-003', name: 'Aganampudi Toll Plaza', road: 'Aganampudi Toll', path: '/cameras/CAM-TOL-003' },
      { id: 'CAM-JGD-003', name: 'Jagadamba Junction Cinema Road', road: 'Jagadamba Junction', path: '/cameras/CAM-JGD-003' },
      { id: 'CAM-BCH-007', name: 'Beach Road Coastal Promenade', road: 'Beach Road', path: '/cameras/CAM-BCH-007' },
      { id: 'CAM-MVD-004', name: 'Madhurawada IT SEZ Cross', road: 'Madhurawada Main Rd', path: '/cameras/CAM-MVD-004' },
    ];

    const knownRoads = [
      { name: 'Siripuram Circle', desc: 'Core City Arterial Roundabout • 3 Live ANPR Nodes', path: '/live-map?road=Siripuram' },
      { name: 'NH16 National Highway Corridor', desc: 'Heavy Freight Expressway • 4 ANPR Speed Corridors', path: '/live-map?road=NH16' },
      { name: 'Beach Road Coastal Promenade', desc: 'Tourist & Coastal Security Zone • 5 PTZ Fixed Cameras', path: '/live-map?road=BeachRoad' },
      { name: 'Jagadamba Junction Cinema Road', desc: 'High Commercial Pedestrian Flow • Congestion Monitor', path: '/live-map?road=Jagadamba' },
      { name: 'MVP Double Road', desc: 'Urban Residential Arterial • Speed Sensors Active', path: '/live-map?road=MVP' },
      { name: 'Dwaraka Nagar Bus Station Road', desc: 'Transit Hub Transit Corridor • Heavy Traffic Flow', path: '/live-map?road=Dwaraka' },
    ];

    const knownCases = [
      { id: 'CAS-VSP-2026-0914', title: 'Operation Coastal Vigilance: Subject AP39AB1234', path: '/investigations/CAS-VSP-2026-0914' },
      { id: 'CAS-VSP-2026-0881', title: 'Stolen Honda City Interception: Subject AP31TX9901', path: '/investigations' },
      { id: 'CAS-VSP-2026-0772', title: 'Hit and Run Investigation: Siripuram Junction', path: '/investigations' },
      { id: 'CAS-VSP-2026-0650', title: 'Unregistered Commercial Fleet Interception', path: '/investigations' },
    ];

    const knownOfficers = [
      { name: 'Inspector R. K. Sharma', id: 'AP-POL-8492', role: 'Traffic Police Lead', dept: 'Visakhapatnam Traffic South', path: '/investigations' },
      { name: 'Sub-Inspector P. Rao', id: 'AP-POL-9104', role: 'Crime Investigator', dept: 'CID Intelligence Wing', path: '/investigations' },
      { name: 'DSP V. S. Reddy', id: 'AP-POL-4412', role: 'Command Center Superintendent', dept: 'City Police HQ', path: '/investigations' },
      { name: 'Dr. Ananya Sen', id: 'AP-STA-7719', role: 'Lead Traffic Analyst', dept: 'Smart City Mobility Division', path: '/analytics' },
    ];

    const knownDates = [
      { date: '11 Sep 2026', label: "Today's Telemetry (11 Sep 2026)", desc: 'View live vehicle detections and alerts logged today', path: '/vehicles?from=00:00&to=23:59' },
      { date: '10 Sep 2026', label: 'Yesterday (10 Sep 2026)', desc: 'Historical surveillance archive for 10 Sep 2026', path: '/reports?date=2026-09-10' },
      { date: 'Sep 2026', label: 'September 2026 Monthly Log', desc: 'Aggregated monthly traffic and violation dossier', path: '/reports' },
    ];

    const knownLocations = [
      { name: 'Siripuram Circle', zone: 'Zone 1 - Central Urban', latLng: '17.7215° N, 83.3162° E', path: '/live-map' },
      { name: 'RK Beach Coastal Promenade', zone: 'Zone 3 - Coastal Security', latLng: '17.7128° N, 83.3235° E', path: '/live-map' },
      { name: 'Jagadamba Junction', zone: 'Zone 1 - Commercial Hub', latLng: '17.7112° N, 83.3005° E', path: '/live-map' },
      { name: 'Aganampudi Toll Plaza', zone: 'Zone 4 - Industrial NH16', latLng: '17.6890° N, 83.1892° E', path: '/live-map' },
      { name: 'Gajuwaka Industrial Belt', zone: 'Zone 4 - South Industrial', latLng: '17.6914° N, 83.2185° E', path: '/live-map' },
      { name: 'MVP Colony Sector 3', zone: 'Zone 2 - North Residential', latLng: '17.7421° N, 83.3340° E', path: '/live-map' },
    ];

    return {
      vehicles: isRouteAllowed(user?.role, '/vehicles')
        ? knownVehicles.filter(v => v.plate.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q))
        : [],
      cameras: isRouteAllowed(user?.role, '/cameras')
        ? knownCameras.filter(c => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.road.toLowerCase().includes(q))
        : [],
      roads: isRouteAllowed(user?.role, '/live-map')
        ? knownRoads.filter(r => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q))
        : [],
      cases: isRouteAllowed(user?.role, '/investigations')
        ? knownCases.filter(cs => cs.id.toLowerCase().includes(q) || cs.title.toLowerCase().includes(q))
        : [],
      officers: knownOfficers.filter(o => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.dept.toLowerCase().includes(q) || o.role.toLowerCase().includes(q)),
      dates: knownDates.filter(d => d.date.toLowerCase().includes(q) || d.label.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q) || q.includes('2026') || q.includes('today') || q.includes('yesterday')),
      locations: isRouteAllowed(user?.role, '/live-map')
        ? knownLocations.filter(l => l.name.toLowerCase().includes(q) || l.zone.toLowerCase().includes(q))
        : [],
    };
  }, [searchQuery, user?.role]);

  // Close popups when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchModalRef.current && !searchModalRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (profileModalRef.current && !profileModalRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex selection:bg-cyan-500 selection:text-black">
      {/* Left Sidebar - Dynamically rendered based strictly on user role */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 ease-in-out bg-white/95 backdrop-blur-md border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-40`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/40">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Camera className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wider text-slate-900 uppercase">
                  City Vision
                </span>
                <span className="text-[10px] text-cyan-600 font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>VISAKHAPATNAM</span>
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Identity Tag */}
        {sidebarOpen && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/60">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Operational Role
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between mt-0.5">
              <span>{roleConfig.displayName}</span>
              <span className={`w-2 h-2 rounded-full ${
                currentRole === 'Traffic Police' ? 'bg-blue-500' :
                currentRole === 'Investigator' ? 'bg-rose-500' :
                currentRole === 'Traffic Analyst' ? 'bg-emerald-500' : 'bg-purple-500'
              }`}></span>
            </div>
          </div>
        )}

        {/* Dynamic Navigation Menu Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {sidebarOpen && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Authorized Modules
            </div>
          )}

          {roleConfig.menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-600 border border-cyan-500/30 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`
                }
                title={!sidebarOpen ? item.name : undefined}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className="w-4 h-4 flex-shrink-0 text-slate-600 group-hover:text-cyan-600" />
                  {sidebarOpen && <span className="truncate">{item.name}</span>}
                </div>

                {sidebarOpen && item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div 
                onClick={() => setProfileOpen(true)}
                className="flex items-center space-x-2.5 overflow-hidden p-1.5 rounded-xl hover:bg-slate-200/60 cursor-pointer transition group"
                title="View Officer Profile Dossier"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 group-hover:border-cyan-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-cyan-700 transition">
                  {user?.full_name?.charAt(0) || 'O'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-cyan-700 truncate transition">
                    {user?.full_name || 'Officer'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate font-mono">
                    {roleConfig.displayName}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                id="sidebar-logout-btn"
                className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition font-medium"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => setProfileOpen(true)}
                className="w-full flex items-center justify-center p-2 text-slate-600 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition"
                title="Officer Profile"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Enhanced Command Center Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between gap-4">
          {/* Left section: Officer info & Department */}
          <div className="flex items-center space-x-4 min-w-0">
            <div className="flex flex-col min-w-0">
              <div 
                onClick={() => setProfileOpen(true)}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition group"
                title="Click to view full Officer Dossier"
              >
                <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 truncate transition">
                  Officer: {user?.full_name || 'Ravi Kumar'}
                </span>
                <span className="text-slate-300 font-mono">•</span>
                <span className="text-[11px] text-slate-500 font-medium truncate hidden md:inline">
                  Department: {roleConfig.department}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono mt-0.5">
                <Building2 className="w-3 h-3 text-cyan-600" />
                <span>GVMC Smart City Command Center</span>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                <span className="capitalize text-slate-600 font-sans font-semibold">
                  {location.pathname.includes('trajectory') 
                    ? 'Vehicle Route Tracking' 
                    : (location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard')}
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Search, Live Clock, Notifications, Role Badge */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Role-Scoped Global Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              id="global-search-btn"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs text-slate-500 hover:text-slate-800 transition shadow-sm"
              title="Search authorized modules"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search modules...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white border border-slate-200 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Live Digital Clock */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-100/70 border border-slate-200 font-mono text-xs text-slate-700 font-semibold shadow-sm">
              <Clock className="w-3.5 h-3.5 text-cyan-600" />
              <span>{currentTime || '00:00:00'}</span>
            </div>

            {/* Simulation Stream Controller */}
            <div className="hidden xl:block">
              <SimulationToggle />
            </div>

            {/* Role-Filtered Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                id="header-notification-btn"
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <Bell className="w-4 h-4 text-cyan-600" />
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 font-bold">
                        {notifications.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-medium">
                      Filtered for {roleConfig.displayName}
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100/80">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate(n.targetUrl);
                          }}
                          className="pt-2 first:pt-0 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-cyan-600 transition">
                              {n.title}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 shrink-0">
                              {n.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {n.description}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No recent notifications for your role
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Distinct Role Badge & User Profile in Top-Right Corner */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div 
                onClick={() => setProfileOpen(true)}
                id="header-role-badge"
                className={`px-3 py-1 rounded-full border text-[11px] font-bold font-mono flex items-center space-x-1.5 shadow-sm cursor-pointer hover:opacity-90 transition ${roleConfig.badgeColor}`}
                title={`Role: ${roleConfig.displayName}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{roleConfig.displayName}</span>
              </div>

              <button
                onClick={() => setProfileOpen(true)}
                id="header-user-profile-btn"
                className="flex items-center space-x-1.5 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
                title="Officer Profile Dossier"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
                  {user?.full_name?.charAt(0) || 'O'}
                </div>
                <span className="text-xs font-bold text-slate-800 hidden md:inline truncate max-w-[120px]">
                  {user?.full_name || 'Officer'}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Enhanced Smart Search Modal (Multi-Entity) */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50 backdrop-blur-sm p-4">
            <div 
              ref={searchModalRef}
              className="max-w-xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="p-4 border-b border-slate-200 flex items-center space-x-3 bg-slate-50/50">
                <Search className="w-5 h-5 text-cyan-600 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Smart Search: Vehicle plate, camera ID, road, case ID, officer..."
                  className="w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  autoFocus
                />
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white border border-slate-200 rounded text-slate-400">
                  ESC
                </kbd>
              </div>

              <div className="p-3 max-h-96 overflow-y-auto space-y-3">
                {/* 1. Matching Vehicles (Vehicle Number) */}
                {smartEntities && smartEntities.vehicles.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <Car className="w-3 h-3 text-cyan-600" />
                      <span>Vehicles &amp; Number Plates ({smartEntities.vehicles.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.vehicles.map((v, i) => (
                        <div
                          key={i}
                          onClick={() => handleSearchSelect(v.path)}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="px-2 py-0.5 rounded border border-slate-800 bg-white font-mono font-black text-xs text-slate-900">
                              {v.plate}
                            </div>
                            <span className="text-[11px] text-slate-600">{v.desc}</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 font-mono">View &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Matching Cameras (Camera ID) */}
                {smartEntities && smartEntities.cameras.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <Camera className="w-3 h-3 text-cyan-600" />
                      <span>Surveillance Cameras ({smartEntities.cameras.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.cameras.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => handleSearchSelect(c.path)}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-900">{c.id}</span>
                            <span className="text-[11px] text-slate-600 ml-2">{c.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{c.road}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Matching Road Names */}
                {smartEntities && smartEntities.roads.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <Route className="w-3 h-3 text-cyan-600" />
                      <span>Road Networks &amp; Corridors ({smartEntities.roads.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.roads.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => handleSearchSelect(r.path)}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900">{r.name}</span>
                            <span className="text-[11px] text-slate-500 ml-2">{r.desc}</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 font-mono">Map &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Matching Cases (Case ID) */}
                {smartEntities && smartEntities.cases.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <FolderKanban className="w-3 h-3 text-cyan-600" />
                      <span>Investigation Case IDs ({smartEntities.cases.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.cases.map((cs, i) => (
                        <div
                          key={i}
                          onClick={() => handleSearchSelect(cs.path)}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-900">{cs.id}</span>
                            <span className="text-[11px] text-slate-600 ml-2">{cs.title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 font-mono">Open &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Matching Officers */}
                {smartEntities && smartEntities.officers.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <User className="w-3 h-3 text-cyan-600" />
                      <span>Duty Officers &amp; Investigators ({smartEntities.officers.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.officers.map((o, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setProfileOpen(true);
                            setSearchOpen(false);
                          }}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900">{o.name}</span>
                            <span className="text-[10px] font-mono text-cyan-700 ml-2">[{o.id}]</span>
                            <span className="text-[11px] text-slate-500 ml-2 block sm:inline">{o.role} • {o.dept}</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 font-mono">Profile &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Matching Dates */}
                {smartEntities && smartEntities.dates.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <Calendar className="w-3 h-3 text-cyan-600" />
                      <span>Date &amp; Surveillance Logs ({smartEntities.dates.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.dates.map((d, i) => (
                        <div
                          key={i}
                          onClick={() => handleSearchSelect(d.path)}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-900">{d.label}</span>
                            <span className="text-[11px] text-slate-500 ml-2">{d.desc}</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 font-mono">Filter &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Matching Locations */}
                {smartEntities && smartEntities.locations.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1.5">
                      <MapPin className="w-3 h-3 text-cyan-600" />
                      <span>City Locations &amp; Landmarks ({smartEntities.locations.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {smartEntities.locations.map((loc, i) => (
                        <div
                          key={i}
                          onClick={() => handleSearchSelect(loc.path)}
                          className="p-2 rounded-xl hover:bg-cyan-50/70 border border-slate-100 hover:border-cyan-200 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900">{loc.name}</span>
                            <span className="text-[11px] text-slate-500 ml-2">{loc.zone} • {loc.latLng}</span>
                          </div>
                          <span className="text-[10px] font-bold text-cyan-700 font-mono">View GIS &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Accessible Modules */}
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Authorized System Modules ({filteredSearchItems.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {filteredSearchItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchSelect(item.path)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-cyan-700">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.path}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-cyan-100 group-hover:text-cyan-800">
                          {item.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>Multi-Entity Smart Search Active</span>
                <span>Select to navigate</span>
              </div>
            </div>
          </div>
        )}

        {/* OFFICER PROFILE MODAL (Requirement 15) */}
        {profileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div 
              ref={profileModalRef}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-cyan-600/20">
                    {user?.full_name?.charAt(0) || 'O'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-black text-slate-900 uppercase">
                        {user?.full_name || 'Ravi Kumar'}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ACTIVE SESSION
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Smart City Surveillance Command Center Dossier
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setProfileOpen(false)}
                  className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Body with 6 Required Fields */}
              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block font-mono">Officer Name</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{user?.full_name || 'Ravi Kumar'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block font-mono">Role / Designation</span>
                    <span className="font-bold text-cyan-700 mt-0.5 block">{roleConfig.displayName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block font-mono">Employee ID</span>
                    <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                      {currentRole === 'Investigator' ? 'CID-AP-8842' : currentRole === 'Traffic Police' ? 'VSP-TRF-1029' : currentRole === 'Traffic Analyst' ? 'VMRDA-ANL-331' : 'GVMC-ADM-001'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block font-mono">Assigned Shift</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">Alpha (06:00 – 14:00 IST)</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block font-mono">Department &amp; Wing</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{roleConfig.department}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block font-mono">Last Authenticated Login</span>
                    <span className="font-mono text-slate-700 mt-0.5 block">
                      Today at 07:15:22 AM IST • Terminal IP: 10.24.12.8 (ICCC Console #04)
                    </span>
                  </div>
                </div>

                {/* Clearance & Legal Security Standard */}
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Security Clearance: LEVEL-3 LAW ENFORCEMENT</strong>
                    <p className="text-blue-800 mt-0.5 leading-snug">
                      Authorized to access high-definition camera telemetry, ANPR watchlist tracking, and departmental criminal case dossiers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-100 text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Account</span>
                </button>

                <button
                  onClick={() => setProfileOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
