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
            {/* Overview */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live-map" element={<LiveMap />} />

            {/* Cameras & ANPR */}
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/cameras/:id" element={<CameraDetail />} />
            <Route path="/anpr" element={<ANPRModule />} />
            <Route path="/video-ingestion" element={<VideoIngestion />} />
            <Route path="/video-tracking" element={<VideoIngestion />} />

            {/* Vehicle Intelligence */}
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/vehicles/:id" element={<VehicleProfile />} />
            <Route path="/trajectory" element={<TrajectoryView />} />

            {/* Traffic Analytics */}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/traffic-flow" element={<TrafficFlow />} />
            <Route path="/congestion" element={<Congestion />} />

            {/* Alerts & Watchlist */}
            <Route path="/alerts" element={<Alerts />} />
            
            {/* RBAC Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["Traffic Police", "Authorized Investigator", "System Administrator"]} />}>
              <Route path="/watchlist" element={<Watchlist />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["Authorized Investigator", "Traffic Police", "System Administrator"]} />}>
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/investigations/:id" element={<InvestigationDetail />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["Traffic Police", "Authorized Investigator", "Traffic Analyst", "Municipal/Smart City Authority", "Control Room Operator", "System Administrator"]} />}>
              <Route path="/reports" element={<Reports />} />
              <Route path="/mobility-reports" element={<Reports />} />
              <Route path="/traffic-reports" element={<Reports />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["System Administrator"]} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>

            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
