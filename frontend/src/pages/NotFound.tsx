import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">404 — Page Not Found</h1>
        <p className="text-xs text-slate-500 mt-1">The requested operational route does not exist in City Vision.</p>
      </div>
      <Link
        to="/dashboard"
        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition"
      >
        <Home className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  );
}
