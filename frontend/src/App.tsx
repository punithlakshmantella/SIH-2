import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Cameras from './pages/Cameras';
import CameraDetail from './pages/CameraDetail';
import ANPRModule from './pages/ANPRModule';
import VideoIngestion from './pages/VideoIngestion';
import Vehicles from './pages/Vehicles';
import VehicleProfile from './pages/VehicleProfile';
import TrajectoryView from './pages/TrajectoryView';
import Analytics from './pages/Analytics';
import TrafficFlow from './pages/TrafficFlow';
import Congestion from './pages/Congestion';
import Alerts from './pages/Alerts';
import Watchlist from './pages/Watchlist';
import Investigations from './pages/Investigations';
import InvestigationDetail from './pages/InvestigationDetail';
import Reports from './pages/Reports';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import AccessDenied from './pages/AccessDenied';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Authenticated Workspace */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Overview & Landing */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/403" element={<AccessDenied />} />

            {/* Core Surveillance: Traffic Police, Administrator */}
            <Route element={<ProtectedRoute allowedRoles={['Traffic Police', 'Administrator']} />}>
              <Route path="/live-map" element={<LiveMap />} />
              <Route path="/cameras" element={<Cameras />} />
              <Route path="/cameras/:id" element={<CameraDetail />} />
              <Route path="/alerts" element={<Alerts />} />
            </Route>

            {/* Vehicle Intelligence: Traffic Police, Investigator, Administrator */}
            <Route element={<ProtectedRoute allowedRoles={['Traffic Police', 'Investigator', 'Administrator']} />}>
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/vehicles/:id" element={<VehicleProfile />} />
            </Route>

            {/* Deep Investigation: Investigator, Administrator */}
            <Route element={<ProtectedRoute allowedRoles={['Investigator', 'Administrator']} />}>
              <Route path="/trajectory" element={<TrajectoryView />} />
              <Route path="/video-ingestion" element={<VideoIngestion />} />
              <Route path="/video-tracking" element={<VideoIngestion />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/investigations/:id" element={<InvestigationDetail />} />
            </Route>

            {/* Traffic Planning & Analytics: Traffic Analyst, Administrator */}
            <Route element={<ProtectedRoute allowedRoles={['Traffic Analyst', 'Administrator']} />}>
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/traffic-flow" element={<TrafficFlow />} />
              <Route path="/congestion" element={<Congestion />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/mobility-reports" element={<Reports />} />
              <Route path="/traffic-reports" element={<Reports />} />
            </Route>

            {/* Diagnostics & Lab: Administrator */}
            <Route element={<ProtectedRoute allowedRoles={['Administrator']} />}>
              <Route path="/anpr" element={<ANPRModule />} />
            </Route>

            {/* System Administration: Administrator */}
            <Route element={<ProtectedRoute allowedRoles={['Administrator']} />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
