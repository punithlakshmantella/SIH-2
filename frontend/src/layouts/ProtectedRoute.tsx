import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuthStore, hasRole } from '../store/authStore';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(user, allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/50">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold text-slate-100">403 — Access Denied (RBAC Protected)</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current role <span className="text-cyan-400 font-semibold font-mono">[{user?.role}]</span> does not have authorization to access this operational module.
          </p>
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-left text-[11px] text-slate-400 space-y-1 mt-3">
            <span className="font-semibold text-slate-300">Authorized Roles for this route:</span>
            <ul className="list-disc list-inside text-rose-400/90 font-mono">
              {allowedRoles.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
        <div className="flex items-center space-x-3 pt-2">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
