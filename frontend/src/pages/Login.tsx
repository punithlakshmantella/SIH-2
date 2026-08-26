import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ShieldCheck, Lock, User, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { UserRole } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Please enter username/email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.post<any>('/auth/login', {
        username_or_email: usernameOrEmail,
        password: password,
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

      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickRoles = [
    {
      role: 'Traffic Police',
      email: 'police@cityvision.bel.in',
      pwd: 'police123',
      color: 'from-blue-600 to-cyan-600',
      badge: 'VSP-TP-104'
    },
    {
      role: 'Authorized Investigator',
      email: 'investigator@cityvision.bel.in',
      pwd: 'investigator123',
      color: 'from-rose-600 to-red-600',
      badge: 'CID-AP-89'
    },
    {
      role: 'Control Room Operator',
      email: 'operator@cityvision.bel.in',
      pwd: 'operator123',
      color: 'from-cyan-600 to-teal-600',
      badge: 'VSP-CR-02'
    },
    {
      role: 'Traffic Analyst',
      email: 'analyst@cityvision.bel.in',
      pwd: 'analyst123',
      color: 'from-emerald-600 to-green-600',
      badge: 'VMRDA-AN-12'
    },
    {
      role: 'Smart City Authority',
      email: 'authority@cityvision.bel.in',
      pwd: 'authority123',
      color: 'from-amber-600 to-orange-600',
      badge: 'GVMC-DIR-01'
    },
    {
      role: 'System Administrator',
      email: 'admin@cityvision.bel.in',
      pwd: 'admin123',
      color: 'from-purple-600 to-indigo-600',
      badge: 'BEL-ADM-01'
    },
  ];

  const handleQuickLogin = (email: string, pwd: string) => {
    setUsernameOrEmail(email);
    setPassword(pwd);
    // Submit
    setTimeout(() => {
      setLoading(true);
      setError(null);
      api.post<any>('/auth/login', {
        username_or_email: email,
        password: pwd,
      }).then((data) => {
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
        navigate(from, { replace: true });
      }).catch((err) => {
        setError(err.message || 'Login failed');
      }).finally(() => {
        setLoading(false);
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        {/* Left column: Branding & Mission */}
        <div className="md:col-span-6 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Camera className="w-7 h-7 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                CITY VISION
              </h1>
              <span className="text-xs text-cyan-400 font-mono">SIH26127 • Bharat Electronics Limited</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-100">
              City-Wide Vehicle Intelligence & Trajectory Reconstruction
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time video surveillance, generic Indian ANPR/OCR, spatio-temporal vehicle re-identification, and corridor analytics for Visakhapatnam.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>One-Click Role Switcher (Seeded Demo Accounts)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {quickRoles.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickLogin(r.email, r.pwd)}
                  className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 text-left transition flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-400 transition truncate">
                      {r.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">{r.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Login Card */}
        <div className="md:col-span-6">
          <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Sign in to Command Center</h3>
              <p className="text-xs text-slate-400 mt-1">Authenticate with your department credentials</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Username or Email</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. police@cityvision.bel.in"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center text-[10px] text-slate-500 font-mono">
              Protected by JWT & RBAC Access Layer • Visakhapatnam City
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
