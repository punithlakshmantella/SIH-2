import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Camera, 
  ScanLine, 
  Car, 
  Route, 
  BarChart3, 
  GitFork, 
  Flame, 
  Bell, 
  ShieldAlert, 
  FolderKanban, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Radio, 
  Menu, 
  X,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { api } from '../services/api';

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
          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
      }`}
      title={running ? 'Click to pause synthetic camera stream' : 'Click to start synthetic multi-camera stream'}
    >
      <span className={`w-2 h-2 rounded-full ${running ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'}`}></span>
      <span>{running ? 'SYNTHETIC STREAM ACTIVE' : 'START SIMULATION'}</span>
    </button>
  );
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  requiredRoles?: UserRole[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections: NavSection[] = [
    {
      title: "Core Surveillance",
      items: [
        { name: "Executive Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Live City GIS Map", path: "/live-map", icon: Map },
        { name: "Camera Network", path: "/cameras", icon: Camera },
        { name: "ANPR / OCR Lab", path: "/anpr", icon: ScanLine },
      ]
    },
    {
      title: "Vehicle Intelligence",
      items: [
        { name: "Vehicle Search & DB", path: "/vehicles", icon: Car },
        { name: "Trajectory Reconstruction", path: "/trajectory", icon: Route },
      ]
    },
    {
      title: "Traffic Analytics",
      items: [
        { name: "City Traffic Analytics", path: "/analytics", icon: BarChart3 },
        { name: "Origin-Destination (OD)", path: "/traffic-flow", icon: GitFork },
        { name: "Congestion Heatmap", path: "/congestion", icon: Flame },
      ]
    },
    {
      title: "Operations & Enforcement",
      items: [
        { name: "Active Alerts", path: "/alerts", icon: Bell, badge: "LIVE" },
        { 
          name: "Watchlist Management", 
          path: "/watchlist", 
          icon: ShieldAlert,
          requiredRoles: ["Traffic Police", "Authorized Investigator", "System Administrator"]
        },
        { 
          name: "Investigations & Cases", 
          path: "/investigations", 
          icon: FolderKanban,
          requiredRoles: ["Authorized Investigator", "Traffic Police", "System Administrator"]
        },
      ]
    },
    {
      title: "Administration",
      items: [
        { name: "Reports & Export", path: "/reports", icon: FileText },
        { 
          name: "User & Role Control", 
          path: "/users", 
          icon: Users,
          requiredRoles: ["System Administrator"]
        },
        { name: "System Settings", path: "/settings", icon: Settings },
      ]
    }
  ];

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case "System Administrator": return "bg-purple-950/80 text-purple-300 border-purple-800";
      case "Traffic Police": return "bg-blue-950/80 text-blue-300 border-blue-800";
      case "Authorized Investigator": return "bg-rose-950/80 text-rose-300 border-rose-800";
      case "Control Room Operator": return "bg-cyan-950/80 text-cyan-300 border-cyan-800";
      case "Traffic Analyst": return "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      case "Municipal/Smart City Authority": return "bg-amber-950/80 text-amber-300 border-amber-800";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-cyan-500 selection:text-black">
      {/* Left Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 ease-in-out bg-slate-900/90 backdrop-blur-md border-r border-slate-800 flex flex-col fixed inset-y-0 left-0 z-40`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Camera className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wider text-slate-100 uppercase">
                  City Vision
                </span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>VISAKHAPATNAM</span>
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {sidebarOpen && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isUnauthorized = item.requiredRoles && user && user.role !== "System Administrator" && !item.requiredRoles.includes(user.role);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      } ${isUnauthorized ? 'opacity-50' : ''}`
                    }
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {sidebarOpen && <span className="truncate">{item.name}</span>}
                    </div>

                    {sidebarOpen && item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-cyan-400">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {user?.full_name || 'Officer'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    {user?.role || 'Guest'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Operational Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>GVMC Smart City Command Center</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-200 capitalize">
                {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live City Simulation Stream Controller */}
            <SimulationToggle />

            {/* Mandatory Demo Data Watermark Banner */}
            <div className="px-3 py-1 rounded-full bg-amber-950/50 border border-amber-800/80 text-[11px] font-mono text-amber-300 flex items-center space-x-1.5 shadow-sm">
              <Radio className="w-3 h-3 text-amber-400 animate-ping" />
              <span className="font-bold">DEMO / SYNTHETIC STREAM</span>
            </div>

            {/* Current Role Badge */}
            <div className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center space-x-1.5 ${getRoleBadgeColor(user?.role)}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{user?.role || 'Guest'}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
