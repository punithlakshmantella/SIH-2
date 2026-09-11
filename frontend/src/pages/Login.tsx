import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Camera, 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Building2, 
  HelpCircle,
  X,
  Check,
  Shield,
  Search,
  BarChart3,
  KeyRound
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { UserRole } from '../types';

const ROLE_PROFILES = [
  {
    role: 'Traffic Police',
    username: 'police_vizag',
    alias: 'police',
    password: 'police123',
    badge: 'VSP-TP-104',
    department: 'Traffic South Command',
    icon: ShieldCheck,
    color: 'border-blue-200 bg-blue-50/50 text-blue-900 hover:bg-blue-100/60',
    activeColor: 'border-blue-600 bg-blue-100/90 text-blue-950 ring-2 ring-blue-500/30 shadow-sm'
  },
  {
    role: 'Investigator',
    username: 'investigator_cid',
    alias: 'investigator',
    password: 'investigator123',
    badge: 'CID-AP-89',
    department: 'CID Cyber & Crime Wing',
    icon: Search,
    color: 'border-purple-200 bg-purple-50/50 text-purple-900 hover:bg-purple-100/60',
    activeColor: 'border-purple-600 bg-purple-100/90 text-purple-950 ring-2 ring-purple-500/30 shadow-sm'
  },
  {
    role: 'Traffic Analyst',
    username: 'analyst_urban',
    alias: 'analyst',
    password: 'analyst123',
    badge: 'VMRDA-AN-12',
    department: 'Smart City Mobility',
    icon: BarChart3,
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-100/60',
    activeColor: 'border-emerald-600 bg-emerald-100/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-sm'
  },
  {
    role: 'Administrator',
    username: 'admin',
    alias: 'admin',
    password: 'admin123',
    badge: 'BEL-ADM-01',
    department: 'Command Center HQ',
    icon: KeyRound,
    color: 'border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100/60',
    activeColor: 'border-amber-600 bg-amber-100/90 text-amber-950 ring-2 ring-amber-500/30 shadow-sm'
  }
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<string>('Traffic Police');
  const [usernameOrEmail, setUsernameOrEmail] = useState('police_vizag');
  const [password, setPassword] = useState('police123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const executeLogin = async (uname: string, pwd: string) => {
    if (!uname.trim() || !pwd) {
      setError('Please enter your username or official email, and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.post<any>('/auth/login', {
        username_or_email: uname.trim(),
        password: pwd,
      });

      login(data.access_token, {
        id: data.user_id,
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        role: data.role as UserRole,
        badge_number: data.badge_number,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // Navigate directly to authenticated user dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (p: typeof ROLE_PROFILES[0]) => {
    setSelectedRole(p.role);
    setUsernameOrEmail(p.username);
    setPassword(p.password);
    setError(null);
  };

  const handleDoubleClickRole = (p: typeof ROLE_PROFILES[0]) => {
    setSelectedRole(p.role);
    setUsernameOrEmail(p.username);
    setPassword(p.password);
    setError(null);
    executeLogin(p.username, p.password);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeLogin(usernameOrEmail, password);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Official Top Government Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 border-b border-slate-200/80 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 tracking-tight block">
              GOVERNMENT OF ANDHRA PRADESH • GVMC
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Visakhapatnam Integrated Command & Control Center (ICCC)
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SECURE NETWORK • SIH26127</span>
        </div>
      </header>

      {/* Main Authentication Grid */}
      <main className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center my-auto py-8 z-10">
        {/* Left Column: Official Command Center Identity */}
        <div className="md:col-span-6 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Camera className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700">
                CITY VISION
              </h1>
              <span className="text-xs text-slate-500 font-mono font-bold tracking-wide">
                Bharat Electronics Limited • Smart Surveillance
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              City-Wide Vehicle Intelligence & Command Portal
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Official command portal for authorized traffic enforcement officers, cybercrime investigators, urban transport analysts, and city administration.
            </p>
          </div>

          {/* Official Law Enforcement Notice */}
          <div className="p-4 rounded-xl bg-white/90 border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-700">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="uppercase tracking-wider font-mono text-[11px]">
                Restricted System — Authorized Personnel Only
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              This is an official Government and Law Enforcement computer system. Access is strictly limited to authorized department personnel. All logins, queries, and vehicle telemetry lookups are cryptographically signed, timestamped, and audited under the Information Technology Act, 2000.
            </p>
          </div>

          {/* Department Helpdesk Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Need credentials or account assistance?</span>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-cyan-700 hover:text-cyan-800 font-semibold flex items-center space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Helpdesk Support</span>
            </button>
          </div>
        </div>

        {/* Right Column: Real Sign In Form */}
        <div className="md:col-span-6">
          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xl backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sign In</h3>
              <p className="text-xs text-slate-500 mt-1">Select an official role terminal below or enter your credentials</p>
            </div>

            {/* Quick-Select Role Presets for All 4 Roles (Double-click to Login) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Official Role Terminals
                </span>
                <span className="text-[10px] text-cyan-700 font-mono font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse"></span>
                  <span>Double-Click to Sign In</span>
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {ROLE_PROFILES.map((p) => {
                  const isSelected = selectedRole === p.role;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.role}
                      type="button"
                      onClick={() => handleSelectRole(p)}
                      onDoubleClick={() => handleDoubleClickRole(p)}
                      title={`${p.role}: Click to fill credentials, Double-click to Sign In immediately`}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-150 relative flex flex-col justify-between group cursor-pointer hover:shadow-md ${
                        isSelected ? p.activeColor : p.color
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-1.5">
                          <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <span className="text-xs font-bold truncate">{p.role}</span>
                        </div>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                        ) : (
                          <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-500">
                        <span className="truncate">{p.username}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-white/90 border border-slate-200">
                          {p.badge}
                        </span>
                      </div>

                      <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-slate-400 group-hover:text-cyan-700 font-mono">
                        <span>Double-click ⚡</span>
                        <span className="font-bold">Log In &rarr;</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username or Official Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    id="username-input"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. police_vizag or officer@cityvision.bel.in"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-[11px] text-cyan-600 hover:text-cyan-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <span>Remember this terminal</span>
                </label>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center text-[10px] text-slate-400 font-mono">
              Secured with 256-bit TLS & Role-Based Access Control (RBAC)
            </div>
          </div>
        </div>
      </main>

      {/* Official Footer */}
      <footer className="max-w-6xl w-full mx-auto py-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 z-10">
        <span>© 2026 Bharat Electronics Limited (BEL) & GVMC Smart City Division. All Rights Reserved.</span>
        <span className="font-mono text-[10px]">Visakhapatnam Command Center Node • Version 2.4.0-PROD</span>
      </footer>

      {/* Helpdesk & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-600" />
                <h4 className="text-sm font-bold text-slate-900">Official Access & Helpdesk</h4>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Access to the City Vision Command Center is strictly provisioned by department administrators across 4 operational roles:
              </p>

              <div className="space-y-2">
                {ROLE_PROFILES.map((p) => (
                  <div key={p.role} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{p.role}</div>
                      <div className="text-[10px] text-slate-500">{p.department} • Badge: {p.badge}</div>
                    </div>
                    <div className="text-right font-mono text-[10px]">
                      <div className="text-slate-800 font-bold">User: {p.username}</div>
                      <div className="text-slate-500">Pass: {p.password}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Central IT & Dispatch Desk:</div>
                <div className="text-slate-800">Phone: <b>0891-2564821 / Ext. 104</b></div>
                <div className="text-slate-800">Email: <b>helpdesk@cityvision.bel.in</b></div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
