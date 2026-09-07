import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { 
  Camera as CameraIcon, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Search,
  Route as RouteIcon,
  Compass,
  Bell,
  ShieldAlert,
  Flame,
  Car,
  TrendingUp,
  ExternalLink,
  Clock,
  X,
  Gauge
} from 'lucide-react';
import { api } from '../services/api';
import { 
  Camera, 
  Zone, 
  Road, 
  Alert, 
  MajorFlow, 
  CongestionData, 
  DashboardStats, 
  VehicleSummary, 
  TrajectoryResponse
} from '../types';

export default function LiveMap() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlVehicle = searchParams.get('vehicle') || searchParams.get('plate');

  // Map & Layer Group References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const trafficLayerRef = useRef<L.LayerGroup | null>(null);
  const congestionLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerRef = useRef<L.LayerGroup | null>(null);
  const alertLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility Controls (Defaults: Cameras, Traffic, Congestion, Alerts, Routes: ON; Vehicles: OFF)
  const [layers, setLayers] = useState({
    cameras: true,
    traffic: true,
    congestion: true,
    vehicles: false,
    alerts: true,
    routes: true,
  });

  // Filter States
  const [selectedZone, setSelectedZone] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'warning' | 'offline'>('all');
  const [trafficFilter, setTrafficFilter] = useState<'all' | 'low' | 'moderate' | 'high' | 'severe'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [timeRange, setTimeRange] = useState<'live' | '15m' | '1h' | 'today' | 'custom'>('live');

  // Loaded Data
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [odFlows, setOdFlows] = useState<MajorFlow[]>([]);
  const [congestion, setCongestion] = useState<CongestionData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Vehicle Search & Inspection States
  const [plateInput, setPlateInput] = useState(urlVehicle || '');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummary | null>(null);
  const [vehicleTrajectory, setVehicleTrajectory] = useState<TrajectoryResponse | null>(null);

  // Active Drawer Inspection Target
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<MajorFlow | null>(null);
  const [drawerType, setDrawerType] = useState<'camera' | 'vehicle' | 'alert' | 'flow' | null>(null);

  // 1. Initial Data Fetch
  const loadAllMapData = async () => {
    setLoading(true);
    try {
      const [camsData, zonesData, roadsData, alertsData, odData, congData, statsData] = await Promise.all([
        api.get<Camera[]>('/cameras').catch(() => []),
        api.get<Zone[]>('/zones').catch(() => []),
        api.get<Road[]>('/roads').catch(() => []),
        api.get<Alert[]>('/alerts?limit=30').catch(() => []),
        api.get<MajorFlow[]>('/analytics/origin-destination').catch(() => []),
        api.get<CongestionData>('/analytics/congestion').catch(() => null),
        api.get<DashboardStats>('/dashboard/stats').catch(() => null)
      ]);

      setCameras(camsData);
      setZones(zonesData);
      setRoads(roadsData);
      setAlerts(alertsData);
      setOdFlows(odData);
      setCongestion(congData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load comprehensive map telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMapData();
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.7250, 83.2750],
      zoom: 12,
      zoomControl: true,
    });

    // Dark-themed Voyager Carto tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    // Initialize Dedicated Layer Groups
    cameraLayerRef.current = L.layerGroup().addTo(map);
    trafficLayerRef.current = L.layerGroup().addTo(map);
    congestionLayerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    trajectoryLayerRef.current = L.layerGroup().addTo(map);
    alertLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle Layer Helper
  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // 3. Render Camera Layer
  useEffect(() => {
    if (!cameraLayerRef.current) return;
    cameraLayerRef.current.clearLayers();

    if (!layers.cameras) return;

    const filtered = cameras.filter(cam => {
      const matchZone = selectedZone === 'all' || cam.zone_id === selectedZone;
      const matchStatus = statusFilter === 'all' || cam.status === statusFilter;
      return matchZone && matchStatus;
    });

    filtered.forEach(cam => {
      const isOnline = cam.status === 'online';
      const isWarning = cam.status === 'warning';
      const color = isOnline ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
      const glow = isOnline ? 'rgba(16, 185, 129, 0.4)' : isWarning ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';

      const customIcon = L.divIcon({
        className: 'cam-marker-pin',
        html: `
          <div style="
            background-color: #0f172a;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid ${color};
            box-shadow: 0 0 10px ${glow};
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 200px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="font-family: monospace; color: #0284c7; font-size: 13px;">${cam.id}</strong>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; background: ${color}22; color: ${color};">
              ${cam.status}
            </span>
          </div>
          <strong style="display: block; margin-bottom: 2px; color: #0f172a;">${cam.name}</strong>
          <span style="color: #64748b; font-size: 11px;">${cam.road_name || 'Corridor'} • ${cam.zone_name || 'Zone'}</span>
          
          <div style="margin-top: 8px; padding: 6px; background: #f8fafc; border-radius: 6px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Stream FPS:</span> <b>${cam.fps}</b>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Network Latency:</span> <b>${cam.latency_ms} ms</b>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>OCR Accuracy:</span> <b style="color: #0284c7;">${cam.ocr_accuracy}%</b>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Vehicles/min:</span> <b>${cam.vehicles_per_min} vpm</b>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Direction:</span> <b>${cam.direction}bound</b>
            </div>
          </div>

          <div style="margin-top: 8px;">
            <a href="/cameras/${cam.id}" style="display: block; text-align: center; background: #0284c7; color: #ffffff; padding: 4px 6px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 600;">
              VIEW CAMERA DETAILS →
            </a>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedCamera(cam);
        setDrawerType('camera');
      });

      marker.addTo(cameraLayerRef.current!);
    });
  }, [cameras, selectedZone, statusFilter, layers.cameras]);

  // 4. Render Traffic Layer (Corridor lines connecting cameras on the same road)
  useEffect(() => {
    if (!trafficLayerRef.current) return;
    trafficLayerRef.current.clearLayers();

    if (!layers.traffic) return;

    const roadCamsMap: { [roadId: number]: Camera[] } = {};
    cameras.forEach(cam => {
      if (cam.road_id) {
        if (!roadCamsMap[cam.road_id]) roadCamsMap[cam.road_id] = [];
        roadCamsMap[cam.road_id].push(cam);
      }
    });

    roads.forEach(road => {
      const roadCams = roadCamsMap[road.id] || [];
      if (roadCams.length >= 2) {
        const coords: [number, number][] = roadCams.map(c => [c.latitude, c.longitude]);
        
        const isCongested = road.is_congested;
        const speedKmh = isCongested ? Math.round(road.speed_limit_kmh * 0.38) : Math.round(road.speed_limit_kmh * 0.85);
        const volumePerHour = isCongested ? 3420 : 1850;
        const level = isCongested ? 'SEVERE' : speedKmh < 35 ? 'HIGH' : speedKmh < 50 ? 'MODERATE' : 'LOW';

        if (trafficFilter !== 'all' && level.toLowerCase() !== trafficFilter.toLowerCase()) {
          return;
        }

        const color = level === 'LOW' ? '#10b981' : level === 'MODERATE' ? '#f59e0b' : level === 'HIGH' ? '#f97316' : '#ef4444';

        const polyline = L.polyline(coords, {
          color: color,
          weight: 5,
          opacity: 0.85,
          dashArray: isCongested ? '6, 6' : undefined
        });

        polyline.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 190px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              <strong style="color: #0f172a;">${road.name}</strong>
              <span style="font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: ${color}22; color: ${color};">
                ${level}
              </span>
            </div>
            <div style="font-size: 11px; color: #475569;">
              <div>Type: <b>${road.road_type.toUpperCase()}</b></div>
              <div>Traffic Volume: <b>${volumePerHour.toLocaleString()} vehicles/hr</b></div>
              <div>Average Speed: <b style="color: ${color};">${speedKmh} km/h</b> (Limit ${road.speed_limit_kmh} km/h)</div>
              <div>Length: <b>${road.length_km} km</b></div>
            </div>
          </div>
        `);

        polyline.addTo(trafficLayerRef.current!);
      }
    });
  }, [roads, cameras, layers.traffic, trafficFilter]);

  // 5. Render Congestion Layer (Pulsing hotspots & corridors)
  useEffect(() => {
    if (!congestionLayerRef.current) return;
    congestionLayerRef.current.clearLayers();

    if (!layers.congestion || !congestion) return;

    congestion.heatmap_points.forEach(pt => {
      if (pt.severity === 'high' || pt.severity === 'severe') {
        const circle = L.circleMarker([pt.latitude, pt.longitude], {
          radius: 18,
          fillColor: pt.severity === 'severe' ? '#ef4444' : '#f97316',
          fillOpacity: 0.35,
          color: pt.severity === 'severe' ? '#dc2626' : '#ea580c',
          weight: 2
        });

        circle.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 190px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              <strong style="color: #ef4444;">CONGESTION HOTSPOT</strong>
              <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; background: #fef2f2; color: #ef4444;">
                ${pt.severity}
              </span>
            </div>
            <div style="font-size: 11px; color: #475569;">
              <div>Corridor: <b>${pt.road_name}</b></div>
              <div>Sensor: <b>${pt.camera_name} (${pt.camera_id})</b></div>
              <div>Density: <b>${Math.round(pt.intensity * 100)}%</b></div>
            </div>
            <div style="margin-top: 8px;">
              <a href="/congestion" style="display: block; text-align: center; background: #ea580c; color: #ffffff; padding: 4px 6px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 600;">
                VIEW CONGESTION ANALYTICS →
              </a>
            </div>
          </div>
        `);

        circle.addTo(congestionLayerRef.current!);
      }
    });

    if (congestion.affected_corridors && congestion.affected_corridors.length > 0) {
      congestion.affected_corridors.forEach(corr => {
        const cams = cameras.filter(c => c.road_id === corr.road_id);
        if (cams.length >= 2) {
          const coords: [number, number][] = cams.map(c => [c.latitude, c.longitude]);
          const line = L.polyline(coords, {
            color: '#ef4444',
            weight: 8,
            opacity: 0.6,
            lineCap: 'round'
          });
          line.addTo(congestionLayerRef.current!);
        }
      });
    }
  }, [congestion, cameras, layers.congestion]);

  // 6. Render Alert Layer
  useEffect(() => {
    if (!alertLayerRef.current) return;
    alertLayerRef.current.clearLayers();

    if (!layers.alerts) return;

    const filteredAlerts = alerts.filter(a => {
      if (alertFilter === 'all') return true;
      if (alertFilter === 'critical') return a.severity === 'critical';
      if (alertFilter === 'high') return a.severity === 'high' || a.severity === 'critical';
      if (alertFilter === 'medium') return a.severity === 'medium';
      return a.severity === 'low';
    });

    filteredAlerts.forEach(alert => {
      const cam = cameras.find(c => c.id === alert.camera_id);
      if (!cam) return;

      const isWatchlist = alert.alert_type === 'watchlist_match';
      const isAnomaly = alert.alert_type.includes('anomaly') || alert.alert_type.includes('impossible');
      const isFailure = alert.alert_type.includes('failure');
      const markerColor = isWatchlist ? '#e11d48' : isAnomaly ? '#d97706' : isFailure ? '#dc2626' : '#f97316';

      const alertIcon = L.divIcon({
        className: 'alert-pin-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 12px ${markerColor}aa;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
          ">
            ${isWatchlist ? '🚨' : isAnomaly ? '⚠️' : '🔴'}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: alertIcon });

      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 210px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="color: ${markerColor};">${alert.title}</strong>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; background: ${markerColor}22; color: ${markerColor};">
              ${alert.severity}
            </span>
          </div>

          <div style="font-size: 11px; color: #475569;">
            ${alert.vehicle_plate ? `<div>Vehicle: <b style="font-family: monospace; color: #0284c7;">${alert.vehicle_plate}</b></div>` : ''}
            <div>Camera: <b>${alert.camera_name || alert.camera_id}</b></div>
            <div>Time: <b>${new Date(alert.timestamp).toLocaleTimeString()}</b></div>
            <div>Confidence: <b>${Math.round(alert.confidence * 100)}%</b></div>
            <div style="color: #64748b; margin-top: 4px; font-style: italic;">${alert.description || ''}</div>
          </div>

          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
            ${alert.vehicle_plate ? `
              <a href="/vehicles/${alert.vehicle_plate}" style="text-align: center; background: #0284c7; color: #ffffff; padding: 3px 6px; border-radius: 5px; font-size: 11px; text-decoration: none; font-weight: 600;">
                VIEW VEHICLE PROFILE →
              </a>
              <a href="/trajectory?plate=${alert.vehicle_plate}" style="text-align: center; background: #0f172a; color: #ffffff; padding: 3px 6px; border-radius: 5px; font-size: 11px; text-decoration: none; font-weight: 600;">
                VIEW TRAJECTORY →
              </a>
            ` : ''}
            <a href="/alerts" style="text-align: center; background: #475569; color: #ffffff; padding: 3px 6px; border-radius: 5px; font-size: 11px; text-decoration: none; font-weight: 600;">
              VIEW IN ALERTS MODULE →
            </a>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedAlert(alert);
        setDrawerType('alert');
      });

      marker.addTo(alertLayerRef.current!);
    });
  }, [alerts, cameras, layers.alerts, alertFilter]);

  // 7. Render Routes / Major OD Traffic Flow Layer
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (!layers.routes || !odFlows) return;

    odFlows.forEach((flow, index) => {
      const oCam = cameras.find(c => c.id === flow.origin_camera_id);
      const dCam = cameras.find(c => c.id === flow.dest_camera_id);

      if (oCam && dCam) {
        const coords: [number, number][] = [
          [oCam.latitude, oCam.longitude],
          [dCam.latitude, dCam.longitude]
        ];

        const weight = Math.min(Math.max(Math.round(flow.vehicle_count / 1500), 3), 7);
        const polyline = L.polyline(coords, {
          color: '#38bdf8',
          weight: weight,
          opacity: 0.75,
          dashArray: '8, 8'
        });

        polyline.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 200px;">
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              <strong style="color: #0284c7; font-size: 13px;">MAJOR TRAFFIC CORRIDOR #${index + 1}</strong>
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
              ${flow.origin_name} → ${flow.dest_name}
            </div>
            <div style="font-size: 11px; color: #475569;">
              <div>Volume: <b style="color: #0284c7;">${flow.vehicle_count.toLocaleString()} vehicles</b></div>
              <div>Average Velocity: <b>${flow.avg_speed_kmh} km/h</b></div>
              <div>Estimated Transit Time: <b>${Math.round(flow.avg_travel_time_sec / 60)} mins</b></div>
            </div>
            <div style="margin-top: 8px;">
              <a href="/traffic-flow" style="display: block; text-align: center; background: #0284c7; color: #ffffff; padding: 4px 6px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 600;">
                OPEN OD ANALYTICS →
              </a>
            </div>
          </div>
        `);

        polyline.on('click', () => {
          setSelectedFlow(flow);
          setDrawerType('flow');
        });

        polyline.addTo(routeLayerRef.current!);
      }
    });
  }, [odFlows, cameras, layers.routes]);

  // 8. Search Vehicle and Reconstruct Trajectory on Map
  const handleSearchVehicle = async (plateToSearch: string) => {
    const cleanPlate = plateToSearch.trim().toUpperCase();
    if (!cleanPlate) return;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const vehicleData = await api.get<VehicleSummary>(`/vehicles/${encodeURIComponent(cleanPlate)}`);
      setSelectedVehicle(vehicleData);

      const trajData = await api.get<TrajectoryResponse>(`/vehicles/${encodeURIComponent(cleanPlate)}/trajectory`);
      setVehicleTrajectory(trajData);
      setDrawerType('vehicle');

      if (trajectoryLayerRef.current && vehicleLayerRef.current && trajData.points && trajData.points.length > 0) {
        trajectoryLayerRef.current.clearLayers();
        vehicleLayerRef.current.clearLayers();

        const latLngs: [number, number][] = trajData.points.map(p => [p.latitude, p.longitude]);

        const trajPolyline = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.9,
        }).addTo(trajectoryLayerRef.current);

        trajData.points.forEach((pt, idx) => {
          const isLatest = idx === trajData.points.length - 1;
          const isImpossible = pt.is_impossible_transition;

          const ptIcon = L.divIcon({
            className: 'traj-pt-marker',
            html: `
              <div style="
                background-color: ${isLatest ? '#06b6d4' : isImpossible ? '#ef4444' : '#0f172a'};
                color: #ffffff;
                width: ${isLatest ? '28px' : '22px'};
                height: ${isLatest ? '28px' : '22px'};
                border-radius: 50%;
                border: 2px solid ${isImpossible ? '#ef4444' : '#38bdf8'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                box-shadow: 0 0 10px ${isLatest ? '#06b6d4' : 'rgba(0,0,0,0.5)'};
              ">
                ${isLatest ? '🚗' : idx + 1}
              </div>
            `,
            iconSize: [isLatest ? 28 : 22, isLatest ? 28 : 22],
            iconAnchor: [isLatest ? 14 : 11, isLatest ? 14 : 11]
          });

          const marker = L.marker([pt.latitude, pt.longitude], { icon: ptIcon });

          marker.bindPopup(`
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 200px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">
                <strong style="color: #0284c7; font-family: monospace;">POINT #${idx + 1}</strong>
                <span style="font-size: 10px; color: #64748b;">${new Date(pt.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style="font-weight: 700; color: #0f172a;">${pt.camera_name}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${pt.zone_name} • ${pt.road_name || 'Corridor'}</div>
              <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 4px;">
                <div>Speed: <b>${pt.speed_kmh} km/h</b></div>
                <div>OCR Read: <b style="font-family: monospace;">${pt.raw_plate_read || trajData.primary_plate}</b> (${Math.round((pt.ocr_confidence || 0.95) * 100)}%)</div>
                <div>Direction: <b>${pt.direction}</b></div>
                ${pt.is_low_confidence ? '<div style="color: #d97706; font-weight: 600;">* Possible vehicle match (Re-ID)</div>' : ''}
              </div>
            </div>
          `);

          marker.addTo(trajectoryLayerRef.current!);
        });

        mapInstanceRef.current?.fitBounds(trajPolyline.getBounds(), { padding: [50, 50] });
      }

      setSearchParams({ vehicle: cleanPlate });
    } catch (err: any) {
      setSearchError(err.message || `No telemetry found for vehicle '${cleanPlate}'`);
      setSelectedVehicle(null);
      setVehicleTrajectory(null);
      trajectoryLayerRef.current?.clearLayers();
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (urlVehicle) {
      handleSearchVehicle(urlVehicle);
    }
  }, [urlVehicle]);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-3">
      {/* 1. TOP COMMAND BAR: STATUS & REFRESH */}
      <div className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        {/* Title & Badge */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 text-cyan-600 flex items-center justify-center border border-cyan-700/80 shadow-md">
            <Compass className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center space-x-1.5">
                <span>CITY VISION</span>
                <span className="text-cyan-600 font-mono">—</span>
                <span className="text-cyan-600">CITY-WIDE GIS INTELLIGENCE MAP</span>
              </h1>
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold">
                DEMO / SYNTHETIC DATA
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5 font-mono">
              <span className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                <span>{cameras.filter(c => c.status === 'online').length} / {cameras.length} Online</span>
              </span>
              <span>•</span>
              <span>{stats?.vehicles_detected_today.toLocaleString() || '1,642'} Detections</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{alerts.length} Active Alerts</span>
              <span>•</span>
              <span className="text-orange-400 font-semibold">{roads.filter(r => r.is_congested).length} / {roads.length} Congested</span>
              <span>•</span>
              <span className="text-emerald-300">{stats?.avg_speed_kmh || 49.3} km/h Avg</span>
            </div>
          </div>
        </div>

        {/* Global Vehicle Search & Controls */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchVehicle(plateInput);
            }}
            className="relative flex items-center"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vehicle plate (e.g. AP39AB1234)..."
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value)}
              className="w-56 sm:w-64 pl-8 pr-16 py-1.5 bg-slate-50 border border-slate-300/80 rounded-xl text-xs text-slate-800 placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={searchLoading || !plateInput.trim()}
              className="absolute right-1 px-2 py-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] uppercase transition disabled:opacity-50"
            >
              {searchLoading ? '...' : 'Track'}
            </button>
          </form>

          {/* Time Filter Selector */}
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5 text-[10px] font-mono">
            {(['live', '15m', '1h', 'today'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2 py-1 rounded-lg uppercase transition ${
                  timeRange === t ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'live' ? '● LIVE' : t}
              </button>
            ))}
          </div>

          <button
            onClick={loadAllMapData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 border border-slate-300 transition"
            title="Refresh map telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. LAYER CONTROL & FILTER STRIP */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        {/* Layer Toggles */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="font-bold text-slate-500 uppercase tracking-wider font-mono text-[10px] mr-1 flex items-center space-x-1">
            <Layers className="w-3 h-3 text-cyan-600" />
            <span>MAP LAYERS:</span>
          </span>

          {[
            { key: 'cameras', label: 'Cameras', count: cameras.length, color: 'text-emerald-400' },
            { key: 'traffic', label: 'Traffic', count: roads.length, color: 'text-amber-400' },
            { key: 'congestion', label: 'Congestion', count: roads.filter(r => r.is_congested).length, color: 'text-orange-400' },
            { key: 'alerts', label: 'Alerts', count: alerts.length, color: 'text-rose-400' },
            { key: 'routes', label: 'Routes', count: odFlows.length, color: 'text-cyan-600' },
            { key: 'vehicles', label: 'Vehicles', count: selectedVehicle ? 1 : 0, color: 'text-purple-400' }
          ].map(layer => {
            const active = layers[layer.key as keyof typeof layers];
            return (
              <button
                key={layer.key}
                onClick={() => toggleLayer(layer.key as keyof typeof layers)}
                className={`px-2.5 py-1 rounded-xl font-mono text-[11px] flex items-center space-x-1.5 border transition ${
                  active 
                    ? 'bg-slate-100 border-cyan-600/60 text-slate-900 shadow-sm' 
                    : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                <span className="font-semibold">{layer.label}</span>
                <span className={`text-[10px] ${active ? layer.color : 'text-slate-600'}`}>({layer.count})</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Zone & Status Filters */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Zones ({zones.length})</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Cameras</option>
            <option value="online">Online Only</option>
            <option value="warning">Warning Only</option>
            <option value="offline">Offline Only</option>
          </select>
        </div>
      </div>

      {searchError && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{searchError}</span>
          </div>
          <button onClick={() => setSearchError(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. MAIN INTERACTIVE MAP & SIDE DRAWER */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 relative">
        {/* Map Canvas Area */}
        <div className={`rounded-2xl overflow-hidden border border-slate-200 relative z-0 shadow-2xl transition-all ${
          drawerType ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'
        }`}>
          <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

          {/* DYNAMIC MAP LEGEND HUD */}
          <div className="absolute bottom-4 left-4 bg-slate-50/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 text-[11px] space-y-2 z-[1000] shadow-2xl max-w-sm">
            <span className="font-black text-slate-700 block text-[10px] uppercase font-mono tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>MAP LEGEND</span>
              <span className="text-cyan-600 font-normal">Active Layers</span>
            </span>

            <div className="space-y-1.5">
              {layers.cameras && (
                <div className="flex items-center space-x-3 text-slate-700">
                  <span className="font-mono text-[10px] text-slate-500 uppercase w-14">Cameras:</span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Online</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Warning</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>Offline</span></span>
                </div>
              )}

              {layers.traffic && (
                <div className="flex items-center space-x-3 text-slate-700 border-t border-slate-200/60 pt-1">
                  <span className="font-mono text-[10px] text-slate-500 uppercase w-14">Traffic:</span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Low</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Moderate</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span>High</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>Severe</span></span>
                </div>
              )}

              {layers.alerts && (
                <div className="flex items-center space-x-3 text-slate-700 border-t border-slate-200/60 pt-1">
                  <span className="font-mono text-[10px] text-slate-500 uppercase w-14">Alerts:</span>
                  <span className="flex items-center space-x-1"><span>🚨</span><span>Watchlist</span></span>
                  <span className="flex items-center space-x-1"><span>⚠️</span><span>Anomaly</span></span>
                  <span className="flex items-center space-x-1"><span>🔴</span><span>Offline</span></span>
                </div>
              )}

              {layers.routes && (
                <div className="flex items-center space-x-3 text-slate-700 border-t border-slate-200/60 pt-1">
                  <span className="font-mono text-[10px] text-slate-500 uppercase w-14">Routes:</span>
                  <span className="text-cyan-600 font-mono">━━━➔</span>
                  <span>Major OD Movement</span>
                </div>
              )}

              {vehicleTrajectory && (
                <div className="flex items-center space-x-3 text-slate-700 border-t border-slate-200/60 pt-1">
                  <span className="font-mono text-[10px] text-slate-500 uppercase w-14">Target:</span>
                  <span className="text-cyan-600 font-bold font-mono">🚗 {vehicleTrajectory.primary_plate}</span>
                  <span className="text-[10px] text-cyan-600">({vehicleTrajectory.points.length} nodes)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT TELEMETRY DRAWER */}
        {drawerType && (
          <div className="lg:col-span-4 xl:col-span-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto space-y-4 shadow-2xl">
            {/* 1. CAMERA TELEMETRY DRAWER */}
            {drawerType === 'camera' && selectedCamera && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-600">{selectedCamera.id}</span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedCamera.name}</h3>
                  </div>
                  <button onClick={() => setDrawerType(null)} className="text-slate-500 hover:text-slate-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedCamera.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      selectedCamera.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {selectedCamera.status}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Corridor / Zone:</span>
                    <span className="font-semibold">{selectedCamera.road_name || 'Corridor'} • {selectedCamera.zone_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Direction:</span>
                    <span className="font-mono">{selectedCamera.direction}bound</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Stream FPS:</span>
                    <span className="font-mono">{selectedCamera.fps} FPS</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Latency:</span>
                    <span className="font-mono">{selectedCamera.latency_ms} ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">OCR Accuracy:</span>
                    <span className="font-mono font-bold text-cyan-600">{selectedCamera.ocr_accuracy}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Throughput:</span>
                    <span className="font-mono">{selectedCamera.vehicles_per_min} vehicles/min</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/cameras/${selectedCamera.id}`}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <span>VIEW SENSOR TELEMETRY</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* 2. SELECTED VEHICLE & TRAJECTORY DRAWER */}
            {drawerType === 'vehicle' && selectedVehicle && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-600">VEHICLE INTELLIGENCE</span>
                    <h3 className="text-lg font-black text-slate-900 font-mono">{selectedVehicle.primary_plate}</h3>
                  </div>
                  <button onClick={() => setDrawerType(null)} className="text-slate-500 hover:text-slate-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Vehicle Type:</span>
                    <span className="font-bold capitalize">{selectedVehicle.color} {selectedVehicle.vehicle_type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">First Seen:</span>
                    <span className="font-mono">{selectedVehicle.first_seen_at ? new Date(selectedVehicle.first_seen_at).toLocaleTimeString() : '08:21'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Last Seen:</span>
                    <span className="font-mono">{selectedVehicle.last_seen_at ? new Date(selectedVehicle.last_seen_at).toLocaleTimeString() : '15:24'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Cameras Visited:</span>
                    <span className="font-mono font-bold text-cyan-600">{selectedVehicle.cameras_visited_count} nodes</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Total Distance:</span>
                    <span className="font-mono">{selectedVehicle.total_distance_km} km</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Avg Corridor Speed:</span>
                    <span className="font-mono">{selectedVehicle.avg_speed_kmh} km/h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Re-ID Match Confidence:</span>
                    <span className="font-mono font-bold text-emerald-400">91.2% Probabilistic</span>
                  </div>
                </div>

                {/* Trajectory Step Timeline */}
                {vehicleTrajectory && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
                      Detection Sequence ({vehicleTrajectory.points.length})
                    </span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {vehicleTrajectory.points.map((pt, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-50/70 border border-slate-200 text-[11px] flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{pt.camera_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{new Date(pt.timestamp).toLocaleTimeString()} • {pt.speed_kmh} km/h</div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-600 border border-cyan-800">
                            #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50/60 border border-slate-200 text-[10px] text-slate-500 font-mono leading-relaxed">
                      ℹ️ Last known detection within available camera network. Probabilistic Re-ID candidate verification active.
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Link
                    to={`/vehicles/${selectedVehicle.primary_plate}`}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <span>VIEW VEHICLE PROFILE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/trajectory?plate=${selectedVehicle.primary_plate}`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-xs font-bold border border-slate-300 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>FULL TRAJECTORY VIEW</span>
                    <RouteIcon className="w-3.5 h-3.5 text-cyan-600" />
                  </Link>
                </div>
              </div>
            )}

            {/* 3. ALERT DRAWER */}
            {drawerType === 'alert' && selectedAlert && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-rose-400">INCIDENT DISPATCH</span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedAlert.title}</h3>
                  </div>
                  <button onClick={() => setDrawerType(null)} className="text-slate-500 hover:text-slate-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Alert Type:</span>
                    <span className="font-mono font-bold uppercase text-rose-400">{selectedAlert.alert_type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Severity:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950 text-rose-400 border border-rose-800">
                      {selectedAlert.severity}
                    </span>
                  </div>
                  {selectedAlert.vehicle_plate && (
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Target Vehicle:</span>
                      <span className="font-mono font-bold text-cyan-600">{selectedAlert.vehicle_plate}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Sensor Node:</span>
                    <span>{selectedAlert.camera_name || selectedAlert.camera_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="font-mono">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Confidence:</span>
                    <span className="font-mono font-bold text-emerald-400">{Math.round(selectedAlert.confidence * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-2 italic">
                    {selectedAlert.description || ''}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {selectedAlert.vehicle_plate && (
                    <button
                      onClick={() => handleSearchVehicle(selectedAlert.vehicle_plate!)}
                      className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <span>TRACK ON MAP</span>
                      <Car className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Link
                    to="/alerts"
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-xs font-bold border border-slate-300 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>VIEW IN ALERTS CENTER</span>
                    <Bell className="w-3.5 h-3.5 text-rose-400" />
                  </Link>
                </div>
              </div>
            )}

            {/* 4. MAJOR FLOW DRAWER */}
            {drawerType === 'flow' && selectedFlow && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-600">OD TRAFFIC VECTOR</span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedFlow.origin_name} → {selectedFlow.dest_name}</h3>
                  </div>
                  <button onClick={() => setDrawerType(null)} className="text-slate-500 hover:text-slate-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Volume Count:</span>
                    <span className="font-mono font-bold text-cyan-600">{selectedFlow.vehicle_count.toLocaleString()} vehicles</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Average Velocity:</span>
                    <span className="font-mono">{selectedFlow.avg_speed_kmh} km/h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Transit Duration:</span>
                    <span className="font-mono">{Math.round(selectedFlow.avg_travel_time_sec / 60)} mins</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/traffic-flow"
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <span>EXPLORE MOBILITY MATRIX</span>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
              Visakhapatnam Metropolitan GIS • EPSG:4326 WGS84
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
