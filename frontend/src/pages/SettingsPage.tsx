import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Database, 
  Radio, 
  MapPin, 
  Cpu, 
  Gauge, 
  Camera, 
  Bell, 
  FileCheck, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Layers, 
  Activity, 
  Clock, 
  Globe, 
  GitFork, 
  Lock, 
  Eye, 
  Check, 
  X,
  History,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form editable states
  const [latitude, setLatitude] = useState<number>(17.6868);
  const [longitude, setLongitude] = useState<number>(83.2185);
  const [defaultZoom, setDefaultZoom] = useState<number>(12);
  const [defaultGrid, setDefaultGrid] = useState<string>("Adaptive 500m Hexagonal Grid");

  const [ocrThreshold, setOcrThreshold] = useState<number>(85.0);
  const [plateValThreshold, setPlateValThreshold] = useState<number>(90.0);
  const [reidThreshold, setReidThreshold] = useState<number>(85.0);
  const [trajectoryValEnabled, setTrajectoryValEnabled] = useState<boolean>(true);

  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(140.0);

  const [minFps, setMinFps] = useState<number>(20);
  const [maxLatency, setMaxLatency] = useState<number>(200);
  const [maxPacketLoss, setMaxPacketLoss] = useState<number>(5.0);
  const [minUptime, setMinUptime] = useState<number>(95.0);
  const [minOcrAcc, setMinOcrAcc] = useState<number>(85.0);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(30);

  const [watchlistEnabled, setWatchlistEnabled] = useState<boolean>(true);
  const [overspeedEnabled, setOverspeedEnabled] = useState<boolean>(true);
  const [wrongDirEnabled, setWrongDirEnabled] = useState<boolean>(true);
  const [suspiciousTrajEnabled, setSuspiciousTrajEnabled] = useState<boolean>(true);
  const [impossibleTravelEnabled, setImpossibleTravelEnabled] = useState<boolean>(true);
  const [minAlertConfidence, setMinAlertConfidence] = useState<number>(85.0);

  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [updateReason, setUpdateReason] = useState<string>('');

  const isSystemAdmin = user && user.role === 'System Administrator';

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/system-config');
      const cfg = res.config;
      setConfig(cfg);

      // Sync form fields
      if (cfg.gis_configuration) {
        setLatitude(cfg.gis_configuration.map_center_latitude);
        setLongitude(cfg.gis_configuration.map_center_longitude);
        setDefaultZoom(cfg.gis_configuration.default_zoom);
        setDefaultGrid(cfg.gis_configuration.default_grid);
      }
      if (cfg.anpr_ocr_pipeline) {
        setOcrThreshold(cfg.anpr_ocr_pipeline.ocr_confidence_threshold);
        setPlateValThreshold(cfg.anpr_ocr_pipeline.plate_validation_threshold);
      }
      if (cfg.reid_engine) {
        setReidThreshold(cfg.reid_engine.reid_confidence_threshold);
        setTrajectoryValEnabled(cfg.reid_engine.trajectory_validation_enabled);
      }
      if (cfg.speed_validation) {
        setMaxSpeedKmh(cfg.speed_validation.max_physical_speed_kmh);
      }
      if (cfg.camera_telemetry) {
        setMinFps(cfg.camera_telemetry.min_stream_fps);
        setMaxLatency(cfg.camera_telemetry.max_network_latency_ms);
        setMaxPacketLoss(cfg.camera_telemetry.max_packet_loss_pct);
        setMinUptime(cfg.camera_telemetry.min_camera_uptime_pct);
        setMinOcrAcc(cfg.camera_telemetry.min_ocr_accuracy_pct);
        setHeartbeatInterval(cfg.camera_telemetry.heartbeat_interval_seconds);
      }
      if (cfg.detection_alerts) {
        setWatchlistEnabled(cfg.detection_alerts.watchlist_match_enabled);
        setOverspeedEnabled(cfg.detection_alerts.overspeed_detection_enabled);
        setWrongDirEnabled(cfg.detection_alerts.wrong_direction_detection_enabled);
        setSuspiciousTrajEnabled(cfg.detection_alerts.suspicious_trajectory_detection_enabled);
        setImpossibleTravelEnabled(cfg.detection_alerts.impossible_travel_detection_enabled);
        setMinAlertConfidence(cfg.detection_alerts.min_alert_confidence_pct);
      }
      if (cfg.data_governance) {
        setRetentionDays(cfg.data_governance.data_retention_days);
      }

      // Load audit logs
      const auditRes = await api.get<any[]>('/system-config/audit-history');
      setAuditLogs(auditRes || []);
    } catch (err: any) {
      console.error('Failed to load system config', err);
      setError(err.message || 'Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSystemAdmin) return;
    setSaving(true);
    setError(null);

    // Coordinate validation
    if (latitude < -90 || latitude > 90) {
      setError('Latitude must be between -90 and 90 degrees.');
      setSaving(false);
      return;
    }
    if (longitude < -180 || longitude > 180) {
      setError('Longitude must be between -180 and 180 degrees.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        map_center_latitude: latitude,
        map_center_longitude: longitude,
        default_zoom: defaultZoom,
        default_grid: defaultGrid,
        ocr_confidence_threshold: ocrThreshold,
        plate_validation_threshold: plateValThreshold,
        reid_confidence_threshold: reidThreshold,
        trajectory_validation_enabled: trajectoryValEnabled,
        max_physical_speed_kmh: maxSpeedKmh,
        min_stream_fps: minFps,
        max_network_latency_ms: maxLatency,
        max_packet_loss_pct: maxPacketLoss,
        min_camera_uptime_pct: minUptime,
        min_ocr_accuracy_pct: minOcrAcc,
        heartbeat_interval_seconds: heartbeatInterval,
        watchlist_match_enabled: watchlistEnabled,
        overspeed_detection_enabled: overspeedEnabled,
        wrong_direction_detection_enabled: wrongDirEnabled,
        suspicious_trajectory_detection_enabled: suspiciousTrajEnabled,
        impossible_travel_detection_enabled: impossibleTravelEnabled,
        min_alert_confidence_pct: minAlertConfidence,
        data_retention_days: retentionDays,
        reason: updateReason.trim() || 'Municipal system parameter recalibration'
      };

      const res = await api.put<any>('/system-config', payload);
      setConfig(res.config);
      setToastMessage('System configuration saved and audited successfully.');
      setUpdateReason('');
      setTimeout(() => setToastMessage(null), 3500);
      fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration updates');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-xs font-mono text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
        <span>Loading system environment &amp; node configuration...</span>
      </div>
    );
  }

  const env = config?.system_environment || {};
  const anpr = config?.anpr_ocr_pipeline || {};
  const reid = config?.reid_engine || {};
  const speed = config?.speed_validation || {};
  const cam = config?.camera_telemetry || {};
  const alerts = config?.detection_alerts || {};
  const gov = config?.data_governance || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-white border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-mono animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-600" />
            <span>System Environment &amp; Node Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform telemetry parameters, Visakhapatnam GIS grid parameters, and engine configs
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-700">{env.environment || 'Production Simulation'}</span>
          </div>

          <button
            onClick={fetchConfig}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs transition"
            title="Reload Config from API"
          >
            <RefreshCw className="w-4 h-4 text-cyan-600" />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center space-x-2 font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORM WRAPPER */}
      <form onSubmit={handleSaveConfig} className="space-y-6">

        {/* 2. SYSTEM ENVIRONMENT & TARGET METROPOLITAN CITY */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                System Environment &amp; Target Metropolitan Area
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              {env.active_status || 'ACTIVE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Target Metropolitan City</span>
              <span className="font-bold text-cyan-600 text-sm mt-0.5 block">{env.city_display || 'Visakhapatnam, Andhra Pradesh'}</span>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Environment Tier</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{env.environment || 'Production Simulation'}</span>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Region / State</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{env.region || 'Andhra Pradesh'}</span>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Country / Jurisdiction</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{env.country || 'India'} (MoRTH / HSRP)</span>
            </div>
          </div>
        </div>

        {/* 3. GIS CONFIGURATION */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                GIS Grid &amp; Geodetic Reference Parameters
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">CRS: WGS 84 / EPSG:4326</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-500 mb-1">Map Center Latitude (° N) [-90 to 90] *</label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={latitude}
                disabled={!isSystemAdmin}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Map Center Longitude (° E) [-180 to 180] *</label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={longitude}
                disabled={!isSystemAdmin}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Default Map Zoom Level [5 - 19]</label>
              <input
                type="number"
                min="5"
                max="19"
                value={defaultZoom}
                disabled={!isSystemAdmin}
                onChange={(e) => setDefaultZoom(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Default GIS Grid Structure</label>
              <input
                type="text"
                value={defaultGrid}
                disabled={!isSystemAdmin}
                onChange={(e) => setDefaultGrid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Coordinate Reference System</label>
              <input
                type="text"
                value="WGS 84 / EPSG:4326"
                disabled
                className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-3 py-2 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Active Coverage Area</label>
              <input
                type="text"
                value="Visakhapatnam Metropolitan Region"
                disabled
                className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-3 py-2 text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* 4. ANPR / OCR PIPELINE */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                ANPR / OCR Pipeline Architecture &amp; Calibration
              </h2>
            </div>
            <span className="text-[10px] text-cyan-600 font-mono">HSRP Regex Engine</span>
          </div>

          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono">
            <span className="text-slate-500 block text-[11px] mb-1">Active Engine Pipeline:</span>
            <span className="font-bold text-slate-800">{anpr.pipeline_name}</span>
          </div>

          {/* Pipeline Stages Diagram */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">
              Execution Flow (Sequential Stages):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              {anpr.stages?.map((st: any) => (
                <div key={st.step} className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200 space-y-0.5">
                  <div className="flex items-center space-x-1.5 text-cyan-600 font-bold text-[11px]">
                    <span>0{st.step}.</span>
                    <span className="truncate">{st.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans truncate">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-2">
            <div>
              <label className="block text-slate-500 mb-1">OCR Confidence Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={ocrThreshold}
                disabled={!isSystemAdmin}
                onChange={(e) => setOcrThreshold(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Plate Validation Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={plateValThreshold}
                disabled={!isSystemAdmin}
                onChange={(e) => setPlateValThreshold(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Image Enhancement Filter</label>
              <input
                type="text"
                value={anpr.image_enhancement || 'CLAHE'}
                disabled
                className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-3 py-2 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Target Plate Standard</label>
              <input
                type="text"
                value={anpr.plate_format || 'Indian HSRP Format'}
                disabled
                className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-3 py-2 text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* 5. RE-ID ENGINE & SPATIO-TEMPORAL CONTINUITY */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <GitFork className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Multi-Modal Vehicle Re-ID Engine
              </h2>
            </div>
            <span className="text-[10px] text-purple-300 font-mono">{reid.engine_mode}</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-sans bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
            {reid.explanation}
          </p>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-2">
              Active Multi-Modal Input Signals:
            </span>
            <div className="flex flex-wrap gap-2">
              {reid.input_signals?.map((sig: string, idx: number) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-50 text-cyan-600 border border-cyan-900/60 text-xs font-mono">
                  • {sig}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-2">
            <div>
              <label className="block text-slate-500 mb-1">Re-ID Confidence Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={reidThreshold}
                disabled={!isSystemAdmin}
                onChange={(e) => setReidThreshold(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div>
                <span className="font-bold text-slate-800 block">Spatio-Temporal Trajectory Validation</span>
                <span className="text-[10px] text-slate-500">Flags impossible speeds between camera checkpoints</span>
              </div>
              <input
                type="checkbox"
                checked={trajectoryValEnabled}
                disabled={!isSystemAdmin}
                onChange={(e) => setTrajectoryValEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded focus:ring-0 bg-white border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* 6. PHYSICAL SPEED VALIDATION THRESHOLD */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Maximum Physical Speed Validation Threshold
              </h2>
            </div>
            <span className="text-[10px] text-rose-400 font-mono font-bold">PHYSICS VALIDATOR</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="sm:col-span-1">
              <label className="block text-slate-500 mb-1">Max Physical Speed Threshold (km/h) *</label>
              <input
                type="number"
                min="20"
                max="300"
                step="1.0"
                value={maxSpeedKmh}
                disabled={!isSystemAdmin}
                onChange={(e) => setMaxSpeedKmh(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-rose-400 font-bold text-sm focus:outline-none focus:border-rose-500 disabled:opacity-60"
                required
              />
            </div>

            <div className="sm:col-span-2 p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-rose-300 block font-mono">Validation Purpose:</span>
              <p className="text-slate-500 text-[11px] leading-relaxed font-sans">
                {speed.explanation}
              </p>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-1">
              Granularity Support:
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {speed.granularity_support?.map((g: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 text-[11px]">
                  ✓ {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 7. CAMERA TELEMETRY PARAMETERS */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Camera Sensor Telemetry &amp; Quality Thresholds
              </h2>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono">
              <span className="text-emerald-400">Healthy</span>
              <span className="text-amber-400">Warning</span>
              <span className="text-rose-400">Critical</span>
              <span className="text-slate-500">Offline</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div>
              <label className="block text-slate-500 mb-1">Min FPS</label>
              <input
                type="number"
                min="1"
                max="120"
                value={minFps}
                disabled={!isSystemAdmin}
                onChange={(e) => setMinFps(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Max Latency (ms)</label>
              <input
                type="number"
                min="10"
                max="5000"
                value={maxLatency}
                disabled={!isSystemAdmin}
                onChange={(e) => setMaxLatency(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Max Loss (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={maxPacketLoss}
                disabled={!isSystemAdmin}
                onChange={(e) => setMaxPacketLoss(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Min Uptime (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={minUptime}
                disabled={!isSystemAdmin}
                onChange={(e) => setMinUptime(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Min OCR Acc (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={minOcrAcc}
                disabled={!isSystemAdmin}
                onChange={(e) => setMinOcrAcc(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Heartbeat (sec)</label>
              <input
                type="number"
                min="5"
                max="600"
                value={heartbeatInterval}
                disabled={!isSystemAdmin}
                onChange={(e) => setHeartbeatInterval(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* 8. DETECTION & ALERT PARAMETERS */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Detection &amp; Alert Trigger Parameters
              </h2>
            </div>
            <span className="text-[10px] text-amber-300 font-mono">Min Conf: {minAlertConfidence}%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-slate-700">Watchlist Hotlist Match</span>
              <input
                type="checkbox"
                checked={watchlistEnabled}
                disabled={!isSystemAdmin}
                onChange={(e) => setWatchlistEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded bg-white border-slate-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-slate-700">Overspeeding Detection</span>
              <input
                type="checkbox"
                checked={overspeedEnabled}
                disabled={!isSystemAdmin}
                onChange={(e) => setOverspeedEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded bg-white border-slate-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-slate-700">Wrong Direction Violation</span>
              <input
                type="checkbox"
                checked={wrongDirEnabled}
                disabled={!isSystemAdmin}
                onChange={(e) => setWrongDirEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded bg-white border-slate-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-slate-700">Suspicious Route Anomaly</span>
              <input
                type="checkbox"
                checked={suspiciousTrajEnabled}
                disabled={!isSystemAdmin}
                onChange={(e) => setSuspiciousTrajEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded bg-white border-slate-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-200">
              <span className="text-slate-700">Impossible Travel Hop Detection</span>
              <input
                type="checkbox"
                checked={impossibleTravelEnabled}
                disabled={!isSystemAdmin}
                onChange={(e) => setImpossibleTravelEnabled(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded bg-white border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Minimum Alert Confidence (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={minAlertConfidence}
                disabled={!isSystemAdmin}
                onChange={(e) => setMinAlertConfidence(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* 9. DATA GOVERNANCE & AUDIT CONFIGURATION */}
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Data Governance, Retention &amp; Audit Trail Policy
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Timezone: Asia/Kolkata (IST)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Audit Logging</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Config Change Logging</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">CSV Export Logging</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Data Retention</span>
              <span className="text-cyan-600 font-bold">{retentionDays} Days</span>
            </div>
          </div>
        </div>

        {/* 10. SAVE ACTION CONTROLS (SYSTEM ADMIN ONLY) */}
        {isSystemAdmin ? (
          <div className="p-6 rounded-2xl bg-white/90 border border-slate-200 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-mono text-slate-500 mb-1">
                  Reason for System Configuration Modification (Recorded in Audit Trail) *
                </label>
                <input
                  type="text"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  placeholder="e.g. Visakhapatnam corridor GIS recalibration and OCR threshold tune..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold transition shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 self-end disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Applying Updates…' : 'Apply Configuration'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/50 border border-slate-200 text-xs font-mono text-slate-500 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Read-Only Mode: Only System Administrators have permission to modify operational node configurations.</span>
          </div>
        )}

      </form>

      {/* 11. AUDIT HISTORY LOG */}
      {auditLogs && auditLogs.length > 0 && (
        <div className="p-6 rounded-2xl bg-white/70 border border-slate-200 space-y-3 font-mono text-xs shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Configuration Modification Audit History
              </h2>
            </div>
            <span className="text-[10px] text-slate-500">Immutable Audit Records</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <div>
                  <strong className="text-cyan-600 uppercase">{log.action}</strong> by {log.user_name} ({log.role})
                  {log.details?.reason && <span className="text-slate-500 ml-2">— Reason: "{log.details.reason}"</span>}
                </div>
                <span className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
