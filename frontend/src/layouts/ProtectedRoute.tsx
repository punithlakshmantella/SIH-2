import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isRouteAllowed, normalizeRole } from '../utils/rbac';
import AccessDenied from '../pages/AccessDenied';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Check explicit allowedRoles prop if supplied
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = normalizeRole(user?.role);
    const isAllowedByProp = currentRole === 'Administrator' || allowedRoles.some(
      (r) => normalizeRole(r) === currentRole || r.toLowerCase() === user?.role.toLowerCase()
    );

    if (!isAllowedByProp) {
      return <Navigate to="/403" state={{ attemptedPath: location.pathname }} replace />;
    }
  }

  // 2. Check path against centralized RBAC matrix
  const isAllowedPath = isRouteAllowed(user?.role, location.pathname);
  if (!isAllowedPath) {
    return <Navigate to="/403" state={{ attemptedPath: location.pathname }} replace />;
  }

  return <Outlet />;
}
