import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { normalizeRole, ROLE_CONFIGS } from '../utils/rbac';

export default function AccessDenied() {
  const { user } = useAuthStore();
  const location = useLocation();
  const currentRole = normalizeRole(user?.role);
  const roleConfig = ROLE_CONFIGS[currentRole];

  const attemptedPath = (location.state as any)?.attemptedPath || location.pathname;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white/90 border border-slate-200 shadow-xl backdrop-blur-md space-y-6">
        {/* Shield Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-mono font-bold">
            <Lock className="w-3 h-3" />
            <span>403 FORBIDDEN</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Access Denied
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your role does not have authorization to access this operational module or command center view.
          </p>
        </div>

        {/* Role & Context Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Active Officer:</span>
            <span className="font-semibold text-slate-800">{user?.full_name || 'Authorized Officer'}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Assigned Role:</span>
            <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] border ${roleConfig.badgeColor}`}>
              {roleConfig.displayName}
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Department:</span>
            <span className="text-slate-700 font-medium truncate max-w-[200px] text-right">{roleConfig.department}</span>
          </div>
          {attemptedPath && (
            <div className="flex justify-between items-center text-[11px] border-t border-slate-200/80 pt-1.5 font-mono">
              <span className="text-slate-500">Attempted Route:</span>
              <span className="text-rose-500 font-bold">{attemptedPath}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
