import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Map, 
  Car, 
  Bell, 
  Camera, 
  Route, 
  Film, 
  FolderKanban, 
  ShieldAlert, 
  BarChart3, 
  GitFork, 
  Flame, 
  FileText, 
  Users, 
  Settings, 
  ScanLine 
} from 'lucide-react';
import React from 'react';

export type AppRole = 'Traffic Police' | 'Investigator' | 'Traffic Analyst' | 'Administrator';

export function normalizeRole(role?: string | null): AppRole {
  if (!role) return 'Traffic Police';
  const clean = role.trim().toLowerCase();
  
  if (clean.includes('admin')) return 'Administrator';
  if (clean.includes('investigat')) return 'Investigator';
  if (clean.includes('analyst') || clean.includes('authority') || clean.includes('municipal')) return 'Traffic Analyst';
  if (clean.includes('police') || clean.includes('operator')) return 'Traffic Police';
  
  return 'Traffic Police';
}

export interface NavMenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

export interface RoleConfig {
  displayName: AppRole;
  department: string;
  badgeColor: string;
  allowedRoutes: string[];
  menuItems: NavMenuItem[];
}

export const ROLE_CONFIGS: Record<AppRole, RoleConfig> = {
  'Traffic Police': {
    displayName: 'Traffic Police',
    department: 'Visakhapatnam Traffic Police',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    allowedRoutes: [
      '/dashboard',
      '/live-map',
      '/vehicles',
      '/alerts',
      '/cameras',
      '/403',
    ],
    menuItems: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Live City GIS Map', path: '/live-map', icon: Map },
      { name: 'Vehicle Search', path: '/vehicles', icon: Car },
      { name: 'Active Alerts', path: '/alerts', icon: Bell, badge: 'LIVE' },
      { name: 'Camera View', path: '/cameras', icon: Camera },
    ]
  },
  'Investigator': {
    displayName: 'Investigator',
    department: 'CID Andhra Pradesh — Special Crime Wing',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    allowedRoutes: [
      '/dashboard',
      '/vehicles',
      '/trajectory',
      '/video-ingestion',
      '/video-tracking',
      '/investigations',
      '/watchlist',
      '/403',
    ],
    menuItems: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Vehicle Search', path: '/vehicles', icon: Car },
      { name: 'Vehicle Route Tracking', path: '/trajectory', icon: Route },
      { name: 'Video Processing', path: '/video-ingestion', icon: Film, badge: 'NEW' },
      { name: 'Investigation Cases', path: '/investigations', icon: FolderKanban },
      { name: 'Watchlist', path: '/watchlist', icon: ShieldAlert },
    ]
  },
  'Traffic Analyst': {
    displayName: 'Traffic Analyst',
    department: 'VMRDA Urban Planning & Mobility Dept',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    allowedRoutes: [
      '/dashboard',
      '/analytics',
      '/traffic-flow',
      '/congestion',
      '/reports',
      '/mobility-reports',
      '/traffic-reports',
      '/403',
    ],
    menuItems: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Traffic Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Congestion Heatmap', path: '/congestion', icon: Flame },
      { name: 'Origin Destination Flow', path: '/traffic-flow', icon: GitFork },
      { name: 'Reports', path: '/reports', icon: FileText },
    ]
  },
  'Administrator': {
    displayName: 'Administrator',
    department: 'Smart City Command & Control Center (GVMC/BEL)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    allowedRoutes: [
      '/dashboard',
      '/live-map',
      '/cameras',
      '/anpr',
      '/video-ingestion',
      '/video-tracking',
      '/vehicles',
      '/trajectory',
      '/analytics',
      '/traffic-flow',
      '/congestion',
      '/alerts',
      '/watchlist',
      '/investigations',
      '/reports',
      '/mobility-reports',
      '/traffic-reports',
      '/users',
      '/settings',
      '/403',
    ],
    menuItems: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Live GIS Map', path: '/live-map', icon: Map },
      { name: 'Camera Network', path: '/cameras', icon: Camera },
      { name: 'ANPR / OCR Lab', path: '/anpr', icon: ScanLine },
      { name: 'Video Ingestion', path: '/video-ingestion', icon: Film, badge: 'NEW' },
      { name: 'Vehicle Search', path: '/vehicles', icon: Car },
      { name: 'Vehicle Route Tracking', path: '/trajectory', icon: Route },
      { name: 'City Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Origin-Destination', path: '/traffic-flow', icon: GitFork },
      { name: 'Congestion Heatmap', path: '/congestion', icon: Flame },
      { name: 'Active Alerts', path: '/alerts', icon: Bell, badge: 'LIVE' },
      { name: 'Watchlist', path: '/watchlist', icon: ShieldAlert },
      { name: 'Investigation', path: '/investigations', icon: FolderKanban },
      { name: 'Reports', path: '/reports', icon: FileText },
      { name: 'User Management', path: '/users', icon: Users },
      { name: 'System Settings', path: '/settings', icon: Settings },
    ]
  }
};

export function isRouteAllowed(roleStr: string | undefined | null, pathname: string): boolean {
  const role = normalizeRole(roleStr);
  if (role === 'Administrator') return true;

  const config = ROLE_CONFIGS[role];
  if (!config) return false;

  // Base path matching (handling subroutes like /vehicles/123 or /investigations/CAS-01)
  const normalizedPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
  if (normalizedPath === '/' || normalizedPath === '/dashboard' || normalizedPath === '/403') return true;

  return config.allowedRoutes.some((allowed) => {
    if (allowed === normalizedPath) return true;
    if (normalizedPath.startsWith(allowed + '/')) return true;
    return false;
  });
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'alert' | 'camera' | 'emergency' | 'watchlist' | 'case' | 'vehicle' | 'congestion' | 'report' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetUrl: string;
  forRoles: AppRole[];
}

export const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Speed Incident Sighted',
    description: 'Vehicle TS09UB4432 recorded at 98 km/h on Beach Road (speed limit 50 km/h)',
    time: '2 mins ago',
    type: 'alert',
    severity: 'high',
    targetUrl: '/alerts',
    forRoles: ['Traffic Police', 'Administrator']
  },
  {
    id: 'notif-2',
    title: 'Camera Node Warning',
    description: 'RTSP latency elevated on CAM-GAJ-019 (Gajuwaka Industrial)',
    time: '8 mins ago',
    type: 'camera',
    severity: 'medium',
    targetUrl: '/cameras',
    forRoles: ['Traffic Police', 'Administrator']
  },
  {
    id: 'notif-3',
    title: 'Emergency Corridor Cleared',
    description: 'Ambulance green corridor triggered from NAD Junction to KGH',
    time: '14 mins ago',
    type: 'emergency',
    severity: 'critical',
    targetUrl: '/live-map',
    forRoles: ['Traffic Police', 'Administrator']
  },
  {
    id: 'notif-4',
    title: 'Watchlist Hit — AP39AB1234',
    description: 'Flagged vehicle detected at Siripuram Circle North ANPR node',
    time: '4 mins ago',
    type: 'watchlist',
    severity: 'critical',
    targetUrl: '/watchlist',
    forRoles: ['Investigator', 'Administrator']
  },
  {
    id: 'notif-5',
    title: 'Case Evidence Tagged',
    description: 'Vehicle route tracking confirmed 5 camera hits for Case #BEL-2026-0914',
    time: '19 mins ago',
    type: 'case',
    severity: 'medium',
    targetUrl: '/investigations',
    forRoles: ['Investigator', 'Administrator']
  },
  {
    id: 'notif-6',
    title: 'Suspect Plate Match (Degraded OCR)',
    description: 'Probabilistic Re-ID matched AP39A?1234 at Aganampudi Toll Plaza Gate 04',
    time: '25 mins ago',
    type: 'vehicle',
    severity: 'high',
    targetUrl: '/trajectory',
    forRoles: ['Investigator', 'Administrator']
  },
  {
    id: 'notif-7',
    title: 'Severe Congestion Spike',
    description: 'BRTS Expressway Corridor density reached 88% (High peak delay)',
    time: '10 mins ago',
    type: 'congestion',
    severity: 'high',
    targetUrl: '/congestion',
    forRoles: ['Traffic Analyst', 'Administrator']
  },
  {
    id: 'notif-8',
    title: 'Monthly Mobility Report Ready',
    description: 'Automated Visakhapatnam corridor volume & peak metrics compiled',
    time: '1 hr ago',
    type: 'report',
    severity: 'low',
    targetUrl: '/reports',
    forRoles: ['Traffic Analyst', 'Administrator']
  },
  {
    id: 'notif-9',
    title: 'System Health & Model Inference',
    description: 'YOLOv8 + Generic OCR model running at 30 FPS across 20 active corridors',
    time: '35 mins ago',
    type: 'system',
    severity: 'low',
    targetUrl: '/settings',
    forRoles: ['Administrator']
  }
];

export function getNotificationsForRole(roleStr?: string | null): NotificationItem[] {
  const role = normalizeRole(roleStr);
  return SAMPLE_NOTIFICATIONS.filter((n) => n.forRoles.includes(role));
}

export interface SearchableItem {
  name: string;
  path: string;
  category: string;
  keywords: string[];
}

export const ALL_SEARCHABLE_ITEMS: SearchableItem[] = [
  { name: 'Dashboard', path: '/dashboard', category: 'General', keywords: ['home', 'overview', 'kpi', 'status'] },
  { name: 'Live City GIS Map', path: '/live-map', category: 'Traffic Operations', keywords: ['gis', 'map', 'cameras', 'gps', 'spatial'] },
  { name: 'Vehicle Search', path: '/vehicles', category: 'Intelligence', keywords: ['plate', 'car', 'number', 'lookup', 'vehicle'] },
  { name: 'Active Alerts', path: '/alerts', category: 'Traffic Operations', keywords: ['incidents', 'speeding', 'violations', 'alarms'] },
  { name: 'Camera View', path: '/cameras', category: 'Surveillance', keywords: ['cctv', 'stream', 'feeds', 'sensors'] },
  { name: 'Camera Network', path: '/cameras', category: 'Surveillance', keywords: ['cctv', 'stream', 'feeds', 'sensors', 'network'] },
  { name: 'ANPR / OCR Lab', path: '/anpr', category: 'Diagnostics', keywords: ['ocr', 'plate recognition', 'algorithm', 'model'] },
  { name: 'Video Ingestion', path: '/video-ingestion', category: 'Investigation', keywords: ['upload', 'mp4', 'cctv footage', 'tracking'] },
  { name: 'Vehicle Route Tracking', path: '/trajectory', category: 'Investigation', keywords: ['route', 'tracking', 'reid', 'path', 'corridor', 'history', 'trajectory'] },
  { name: 'Investigation Cases', path: '/investigations', category: 'Investigation', keywords: ['cases', 'dossier', 'cid', 'evidence'] },
  { name: 'Watchlist Management', path: '/watchlist', category: 'Investigation', keywords: ['stolen', 'suspect', 'blacklist', 'hotlist'] },
  { name: 'City Traffic Analytics', path: '/analytics', category: 'Analytics', keywords: ['volume', 'speed', 'trends', 'charts'] },
  { name: 'Origin-Destination Flow', path: '/traffic-flow', category: 'Analytics', keywords: ['od', 'flow', 'movement', 'corridor'] },
  { name: 'Congestion Heatmap', path: '/congestion', category: 'Analytics', keywords: ['heat', 'jam', 'delay', 'chokepoints'] },
  { name: 'Mobility & Traffic Reports', path: '/reports', category: 'Analytics', keywords: ['export', 'csv', 'pdf', 'monthly', 'audit'] },
  { name: 'User & Role Control', path: '/users', category: 'Administration', keywords: ['accounts', 'rbac', 'officers', 'permissions'] },
  { name: 'System Settings', path: '/settings', category: 'Administration', keywords: ['config', 'api', 'thresholds', 'weights'] }
];

export function getSearchableItemsForRole(roleStr?: string | null): SearchableItem[] {
  const role = normalizeRole(roleStr);
  const config = ROLE_CONFIGS[role];
  if (!config) return [];

  return ALL_SEARCHABLE_ITEMS.filter((item) => {
    return isRouteAllowed(role, item.path);
  });
}
