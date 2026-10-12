import { apiFetch, getWebSocketUrl } from '../config/api';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Worker,
  Job,
  PushNotification,
  SystemSettings,
  AppStateData,
  JobStatus,
  WorkerStatus,
  ConnectedUser,
  UserActivityEvent,
  FleetVehicle,
  VehicleStatus,
} from '../types';
import { INITIAL_STATE, TODAY_STR, DEFAULT_DROPDOWN_CONFIG, getSystemTodayStr, INITIAL_VEHICLES } from '../data/initialData';
import { playNotificationChime } from '../utils/audioAlert';
import { createFullDatabaseZip } from '../utils/fileImporter';
import { getJobStatusTransitionUpdates } from '../utils/timeWindowUtils';
import { getDisplayJobStatus } from '../utils/statusUtils';
import {
  LocalStorageStats,
  getLocalStorageMetrics,
  loadLocalAppState,
  saveLocalAppState,
  enqueueOfflineMutation,
  syncOfflineOutbox,
} from '../utils/localStorageManager';
import {
  googleDriveService,
  GoogleDriveUser,
  GoogleDriveBackupMetadata,
} from '../services/googleDriveService';

interface AppContextType {
  workers: Worker[];
  jobs: Job[];
  notifications: PushNotification[];
  settings: SystemSettings;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dateScope: 'selected' | 'all';
  setDateScope: (scope: 'selected' | 'all') => void;
  todayDate: string;
  goToToday: () => void;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  activeView: 'dashboard' | 'jobs' | 'workers' | 'settings' | 'calendar' | 'history';
  setActiveView: (view: 'dashboard' | 'jobs' | 'workers' | 'settings' | 'calendar' | 'history') => void;
  activeSettingsTab: 'overview' | 'system' | 'columns' | 'personnel' | 'accounts' | 'dropdowns' | 'tools' | 'vehicles' | 'broadcast' | 'storage' | 'google_workspace';
  setActiveSettingsTab: (tab: 'overview' | 'system' | 'columns' | 'personnel' | 'accounts' | 'dropdowns' | 'tools' | 'vehicles' | 'broadcast' | 'storage' | 'google_workspace') => void;
  openSettingsTab: (tab: 'overview' | 'system' | 'columns' | 'personnel' | 'accounts' | 'dropdowns' | 'tools' | 'vehicles' | 'broadcast' | 'storage' | 'google_workspace') => void;
  currentRole: 'manager' | 'engineer' | 'driver';
  setAuthData: (data: any) => void;
  setCurrentRole: (role: 'manager' | 'engineer' | 'driver') => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  logout: () => void;
  isConnected: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  activeToast: PushNotification | null;
  dismissToast: () => void;
  exportScheduleCSV: () => void;
  exportZipArchive: () => Promise<void>;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  importData: (payload: {
    jobs?: Job[];
    workers?: Worker[];
    settings?: any;
    mode: 'merge' | 'replace';
    fileName?: string;
  }) => Promise<boolean>;

  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncAllData: (showToastNotification?: boolean) => Promise<boolean>;
  localStorageStats: LocalStorageStats;
  syncOfflineQueue: () => Promise<{ success: number; failed: number }>;
  clearLocalCache: () => void;

  isGoogleDriveConnected: boolean;
  googleDriveUser: GoogleDriveUser | null;
  connectGoogleDrive: () => Promise<{ success: boolean; user?: GoogleDriveUser; error?: string }>;
  disconnectGoogleDrive: () => void;
  backupToGoogleDrive: (customName?: string) => Promise<{ success: boolean; file?: any; error?: string }>;
  listGoogleDriveBackups: () => Promise<GoogleDriveBackupMetadata[]>;
  restoreFromGoogleDrive: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  deleteGoogleDriveFile: (fileId: string) => Promise<boolean>;
  exportJobsToGoogleSheet: () => Promise<{ success: boolean; webViewLink?: string; error?: string }>;
  autoDriveBackup: boolean;
  setAutoDriveBackup: (enabled: boolean) => void;
  lastDriveBackupTime: string | null;

  connectedUsers: ConnectedUser[];
  currentUser: ConnectedUser;
  updateCurrentUserName: (name: string) => void;
  updateCurrentUserRole: (role: 'manager' | 'engineer' | 'driver') => void;
  recentActivities: UserActivityEvent[];
  focusedJobId: string | null;
  setFocusedJobId: (jobId: string | null) => void;
  isTeamActivityOpen: boolean;
  setIsTeamActivityOpen: (open: boolean) => void;

  isAddJobOpen: boolean;
  setIsAddJobOpen: (open: boolean) => void;
  isAddWorkerOpen: boolean;
  setIsAddWorkerOpen: (open: boolean) => void;
  editingWorker: Worker | null;
  setEditingWorker: (worker: Worker | null) => void;
  editingJob: Job | null;
  setEditingJob: (job: Job | null) => void;
  interactingJob: Job | null;
  setInteractingJob: (job: Job | null) => void;

  addJob: (jobData: Partial<Job>) => Promise<void>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  updateJobStatus: (id: string, status: JobStatus, notes?: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  addJobNote: (jobId: string, content: string) => Promise<void>;
  reassignJob: (jobId: string, engineerId: string, driverId: string) => Promise<void>;
  addWorker: (workerData: Partial<Worker>) => Promise<void>;
  updateWorker: (id: string, updates: Partial<Worker>) => Promise<void>;
  batchUpdateWorkers: (updatedWorkers: Worker[]) => Promise<void>;
  assignWorkerAccount: (id: string, accountData: { username?: string; password?: string; accountActive?: boolean }) => Promise<void>;
  batchAssignWorkerAccounts: (accounts: { id: string; username?: string; password?: string; accountActive?: boolean }[]) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  adminToken: string | null;

  vehicles: FleetVehicle[];
  addVehicle: (vehicleData: Partial<FleetVehicle>) => Promise<void>;
  updateVehicle: (id: string, updates: Partial<FleetVehicle>) => Promise<void>;
  updateVehicleStatus: (id: string, status: VehicleStatus, notes?: string, locationName?: string) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  assignVehicleDriver: (vehicleId: string, driverId?: string) => Promise<void>;

  broadcastDailyRouteUpdate: () => Promise<void>;
  sendBroadcastNotification: (title: string, body: string, type?: PushNotification['type']) => Promise<void>;
  toggleToolReturn: (toolId: string, jobId?: string, isReturned?: boolean) => Promise<void>;
  updateSettings: (
    updates: Partial<SystemSettings>,
    cascadeOptions?: {
      cascadeRename?: { category: string; oldVal: string; newVal: string }[];
      cascadeDelete?: { category: string; val: string }[];
      updatedWorkers?: Worker[];
    }
  ) => Promise<void>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  resetToSeedData: () => Promise<void>;
  clearServerData: () => Promise<void>;
  requestBrowserNotifications: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USER_COLORS = ['#107c41', '#2563eb', '#7c3aed', '#d97706', '#059669', '#dc2626'];

const DEFAULT_SEED_WORKER_IDS = new Set(['w-eng-1', 'w-eng-2', 'w-eng-3', 'w-eng-4', 'w-eng-5', 'w-eng-6', 'w-eng-7', 'w-eng-8', 'w-eng-9', 'w-eng-10', 'w-drv-1', 'w-drv-2', 'w-drv-3', 'w-drv-4']);
const DEFAULT_SEED_JOB_IDS = new Set(['job-101', 'job-102', 'job-103', 'job-104', 'job-105', 'job-106', 'job-107', 'job-108', 'job-109', 'job-110', 'job-111', 'job-112', 'job-113', 'job-114', 'job-115']);
const DEFAULT_SEED_NOTIF_IDS = new Set(['notif-1', 'notif-2', 'notif-3', 'notif-4', 'notif-5']);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workers, setWorkers] = useState<Worker[]>(() => {
    const cached = loadLocalAppState().workers;
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    return INITIAL_STATE.workers || [];
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const cached = loadLocalAppState().jobs;
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    return INITIAL_STATE.jobs || [];
  });

  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() => {
    const cached = loadLocalAppState().vehicles;
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    return INITIAL_STATE.vehicles || INITIAL_VEHICLES;
  });

  const [notifications, setNotifications] = useState<PushNotification[]>(() => {
    const cached = loadLocalAppState().notifications;
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    return INITIAL_STATE.notifications || [];
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const cached = loadLocalAppState().settings;
    if (cached && typeof cached === 'object' && cached.companyName) {
      return {
        ...INITIAL_STATE.settings,
        ...cached,
        jobListColumns: (cached.jobListColumns || INITIAL_STATE.settings.jobListColumns || []).filter((c) => c.id !== 'stop'),
        dropdownConfig: cached.dropdownConfig || INITIAL_STATE.settings.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
      };
    }
    return {
      ...INITIAL_STATE.settings,
      jobListColumns: (INITIAL_STATE.settings.jobListColumns || []).filter((c) => c.id !== 'stop'),
      dropdownConfig: INITIAL_STATE.settings.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
    };
  });

  const [localStorageStats, setLocalStorageStats] = useState<LocalStorageStats>(() => getLocalStorageMetrics());

  useEffect(() => {
    saveLocalAppState({
      workers,
      jobs,
      vehicles,
      settings,
      notifications,
    });
    setLocalStorageStats(getLocalStorageMetrics());
  }, [workers, jobs, vehicles, settings, notifications]);

  const syncOfflineQueue = useCallback(async () => {
    const res = await syncOfflineOutbox();
    setLocalStorageStats(getLocalStorageMetrics());
    return res;
  }, []);

  const clearLocalCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        setWorkers(INITIAL_STATE.workers);
        setJobs(INITIAL_STATE.jobs);
        setVehicles(INITIAL_STATE.vehicles || INITIAL_VEHICLES);
        setSettings(INITIAL_STATE.settings);
        setNotifications([]);
        setLocalStorageStats(getLocalStorageMetrics());
      } catch (e) {}
    }
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(() => getSystemTodayStr());
  const [dateScope, setDateScope] = useState<'selected' | 'all'>('selected');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(true);
  const goToToday = () => setSelectedDate(getSystemTodayStr());
  const [activeView, setActiveView] = useState<'dashboard' | 'jobs' | 'workers' | 'settings' | 'calendar' | 'history'>('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'overview' | 'system' | 'columns' | 'personnel' | 'accounts' | 'dropdowns' | 'tools' | 'vehicles' | 'broadcast' | 'storage' | 'google_workspace'
  >('overview');

  const openSettingsTab = (tab: 'overview' | 'system' | 'columns' | 'personnel' | 'accounts' | 'dropdowns' | 'tools' | 'vehicles' | 'broadcast' | 'storage' | 'google_workspace') => {
    setActiveSettingsTab(tab);
    setActiveView('settings');
  };
  const [currentRole, setCurrentRole] = useState<'manager' | 'engineer' | 'driver'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const sessionRaw = localStorage.getItem('fieldops_session');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          if (parsed.role) return parsed.role;
        }
      } catch (e) {}
    }
    return 'manager';
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<PushNotification | null>(null);

  interface HistorySnapshot {
    jobs: Job[];
    workers: Worker[];
    vehicles: FleetVehicle[];
    settings: SystemSettings;
    notifications: PushNotification[];
  }

  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const isApplyingHistoryRef = useRef(false);

  const recordSnapshot = useCallback(() => {
    if (isApplyingHistoryRef.current) return;
    setUndoStack((prev) => {
      const next = [
        ...prev,
        {
          jobs: JSON.parse(JSON.stringify(jobs)),
          workers: JSON.parse(JSON.stringify(workers)),
          vehicles: JSON.parse(JSON.stringify(vehicles)),
          settings: JSON.parse(JSON.stringify(settings)),
          notifications: JSON.parse(JSON.stringify(notifications)),
        },
      ];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setRedoStack([]);
  }, [jobs, workers, vehicles, settings, notifications]);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    isApplyingHistoryRef.current = true;
    setRedoStack((prev) => [
      ...prev,
      {
        jobs: JSON.parse(JSON.stringify(jobs)),
        workers: JSON.parse(JSON.stringify(workers)),
        vehicles: JSON.parse(JSON.stringify(vehicles)),
        settings: JSON.parse(JSON.stringify(settings)),
        notifications: JSON.parse(JSON.stringify(notifications)),
      },
    ]);
    setUndoStack(newUndoStack);

    setJobs(previous.jobs);
    setWorkers(previous.workers);
    if (previous.vehicles) setVehicles(previous.vehicles);
    if (previous.settings) setSettings(previous.settings);
    if (previous.notifications) setNotifications(previous.notifications);

    saveLocalAppState({
      jobs: previous.jobs,
      workers: previous.workers,
      vehicles: previous.vehicles || [],
      settings: previous.settings || settings,
      notifications: previous.notifications || notifications,
    });

    try {
      await apiFetch('/api/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: previous.jobs,
          workers: previous.workers,
          vehicles: previous.vehicles,
          settings: previous.settings,
        }),
      });
    } catch (e) {
      
    }

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 120);
  }, [undoStack, jobs, workers, vehicles, settings, notifications]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    isApplyingHistoryRef.current = true;
    setUndoStack((prev) => [
      ...prev,
      {
        jobs: JSON.parse(JSON.stringify(jobs)),
        workers: JSON.parse(JSON.stringify(workers)),
        vehicles: JSON.parse(JSON.stringify(vehicles)),
        settings: JSON.parse(JSON.stringify(settings)),
        notifications: JSON.parse(JSON.stringify(notifications)),
      },
    ]);
    setRedoStack(newRedoStack);

    setJobs(next.jobs);
    setWorkers(next.workers);
    if (next.vehicles) setVehicles(next.vehicles);
    if (next.settings) setSettings(next.settings);
    if (next.notifications) setNotifications(next.notifications);

    saveLocalAppState({
      jobs: next.jobs,
      workers: next.workers,
      vehicles: next.vehicles || [],
      settings: next.settings || settings,
      notifications: next.notifications || notifications,
    });

    try {
      await apiFetch('/api/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: next.jobs,
          workers: next.workers,
          vehicles: next.vehicles,
          settings: next.settings,
        }),
      });
    } catch (e) {
      
    }

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 120);
  }, [redoStack, jobs, workers, vehicles, settings, notifications]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('fieldops_session');
      return !!session;
    }
    return true;
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('fieldops_admin_token');
    return null;
  });

  const setAuthData = useCallback((data: any) => {
    setCurrentRole(data.role);
    const displayName = data.workerData?.name || data.username || 'Field User';
    setCurrentUser((prev) => ({
      ...prev,
      id: data.workerData?.id || prev.id,
      name: displayName,
      role: data.role
    }));
    if (data.adminToken) {
      setAdminToken(data.adminToken);
      if (typeof window !== 'undefined') localStorage.setItem('fieldops_admin_token', data.adminToken);
    }
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fieldops_session', JSON.stringify({
        role: data.role,
        username: displayName,
        workerData: data.workerData
      }));
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fieldops_session');
      localStorage.removeItem('fieldops_admin_token');
    }
    setAdminToken(null);
    setIsAuthenticated(false);
    setCurrentRole('manager');
    setCurrentUser((prev) => ({
      ...prev,
      name: 'Dispatch Manager',
      role: 'manager'
    }));
  }, []);

  const [currentUser, setCurrentUser] = useState<ConnectedUser>(() => {
    const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    if (typeof window !== 'undefined') {
      try {
        const sessionRaw = localStorage.getItem('fieldops_session');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          return {
            id: parsed.workerData?.id || `usr-${Date.now().toString(36)}`,
            name: parsed.username || parsed.workerData?.name || 'Dispatch Manager',
            role: parsed.role || 'manager',
            color: randomColor,
            activeView: 'dashboard',
            focusJobId: null,
            lastActive: new Date().toISOString(),
          };
        }
      } catch (e) {}
    }
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('fieldops_username') : null;
    return {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: savedName || 'Dispatch Manager',
      role: 'manager',
      color: randomColor,
      activeView: 'dashboard',
      focusJobId: null,
      lastActive: new Date().toISOString(),
    };
  });
  const [recentActivities, setRecentActivities] = useState<UserActivityEvent[]>([]);
  const [focusedJobId, setFocusedJobIdState] = useState<string | null>(null);
  const [isTeamActivityOpen, setIsTeamActivityOpen] = useState(false);

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [interactingJob, setInteractingJob] = useState<Job | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const setFocusedJobId = useCallback((jobId: string | null) => {
    setFocusedJobIdState(jobId);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'USER_FOCUS_JOB',
          payload: { jobId },
        })
      );
    }
  }, []);

  const updateCurrentUserName = (name: string) => {
    const trimmed = name.trim() || 'Field User';
    if (typeof window !== 'undefined') {
      localStorage.setItem('fieldops_username', trimmed);
    }
    const updated = { ...currentUser, name: trimmed };
    setCurrentUser(updated);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'USER_IDENTIFY',
          payload: updated,
        })
      );
    }
  };

  const updateCurrentUserRole = (role: 'manager' | 'engineer' | 'driver') => {
    setCurrentRole(role);
    const updated = { ...currentUser, role };
    setCurrentUser(updated);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'USER_IDENTIFY',
          payload: updated,
        })
      );
    }
  };

  const showPushToast = useCallback((notif: PushNotification) => {

    if (currentRole !== 'manager') {
      if (!settings.workerNotificationsEnabled) {
        return;
      }
    }

    setActiveToast(notif);
    if (settings.soundAlerts) {
      playNotificationChime();
    }

    setTimeout(() => {
      setActiveToast((prev) => (prev?.id === notif.id ? null : prev));
    }, 3000);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.body,
          icon: '/favicon.ico',
        });
      } catch (err) {
      }
    }
  }, [settings.soundAlerts, currentRole]);

  const dismissToast = () => setActiveToast(null);

  const exportScheduleCSV = () => {
    const dayJobs = jobs
      .filter((j) => j.scheduledDate === selectedDate)
      .sort((a, b) => (a.timeWindow?.start || '').localeCompare(b.timeWindow?.start || '') || a.code.localeCompare(b.code));
    const headers = ['Job Code', 'Time Window', 'Title', 'Client', 'Site Location', 'Address', 'Zone', 'Specialists', 'Drivers / Vehicles', 'Priority', 'Status', 'Notes'];

    const rows = dayJobs.map((j) => {
      const specIds = Array.from(new Set([...(j.specialistIds || []), ...(j.engineerId ? [j.engineerId] : [])]));
      const specNames = specIds.map(id => workers.find(w => w.id === id)?.name).filter(Boolean).join('; ') || 'Unassigned';

      const drvIds = Array.from(new Set([...(j.driverIds || []), ...(j.driverId ? [j.driverId] : [])]));
      const drvDetails = drvIds.map(id => {
        const d = workers.find(w => w.id === id);
        return d ? `${d.name} (${d.vehicleInfo?.plate || 'Van'})` : null;
      }).filter(Boolean).join('; ') || (j.transitMode === 'public_transport' ? 'Public Transit' : 'Unassigned');

      const displayStatus = getDisplayJobStatus(j.status, settings.dropdownConfig?.jobStatuses);

      return [
        `"${j.code}"`,
        `"${j.timeWindow.start} - ${j.timeWindow.end}"`,
        `"${j.title.replace(/"/g, '""')}"`,
        `"${j.clientName.replace(/"/g, '""')}"`,
        `"${j.siteLocation.name.replace(/"/g, '""')}"`,
        `"${j.siteLocation.address.replace(/"/g, '""')}"`,
        `"${(j.siteLocation.zone || '').replace(/"/g, '""')}"`,
        `"${specNames.replace(/"/g, '""')}"`,
        `"${drvDetails.replace(/"/g, '""')}"`,
        `"${j.priority}"`,
        `"${displayStatus}"`,
        `"${(j.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Route_Schedule_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportZipArchive = async () => {
    try {
      const blob = await createFullDatabaseZip(jobs, workers, settings, selectedDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FieldOps_Backup_${selectedDate}_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export ZIP archive:', err);
    }
  };

  const importData = async (payload: {
    jobs?: Job[];
    workers?: Worker[];
    settings?: any;
    mode: 'merge' | 'replace';
    fileName?: string;
  }): Promise<boolean> => {
    recordSnapshot();
    try {
      const res = await apiFetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await fetchState();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('API import failed, applying client-side fallback:', err);
      if (payload.mode === 'replace') {
        if (payload.jobs) setJobs(payload.jobs);
        if (payload.workers) setWorkers(payload.workers);
        if (payload.settings) setSettings((prev) => ({ ...prev, ...payload.settings }));
      } else {
        if (payload.jobs) {
          setJobs((prev) => {
            const next = [...prev];
            payload.jobs!.forEach((j) => {
              const idx = next.findIndex((x) => x.id === j.id || x.code === j.code);
              if (idx >= 0) next[idx] = { ...next[idx], ...j };
              else next.push(j);
            });
            return next;
          });
        }
        if (payload.workers) {
          setWorkers((prev) => {
            const next = [...prev];
            payload.workers!.forEach((w) => {
              const idx = next.findIndex((x) => x.id === w.id || (w.email && x.email === w.email));
              if (idx >= 0) next[idx] = { ...next[idx], ...w };
              else next.push(w);
            });
            return next;
          });
        }
        if (payload.settings) {
          setSettings((prev) => ({ ...prev, ...payload.settings }));
        }
      }
      return true;
    }
  };

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const localVersionRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('fieldops_realtime_sync');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_REFRESH') {
            fetchState(false);
          }
        };
        return () => {
          channel.close();
        };
      } catch (e) {}
    }
  }, []);

  const fetchState = async (updateSyncTime = true) => {
    try {
      const res = await apiFetch('/api/state');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkers(json.data.workers || []);
          setJobs(json.data.jobs || []);
          if (json.data.vehicles) {
            setVehicles(json.data.vehicles);
          }
          if (json.data.notifications) {
            setNotifications(dedupeNotifications(json.data.notifications));
          }
          setSettings({
            ...json.data.settings,
            dropdownConfig: json.data.settings?.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
          });
          if (json.version) {
            localVersionRef.current = json.version;
          }
          if (updateSyncTime) {
            setLastSyncedAt(new Date());
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch initial state from server; using client state:', e);
    }
  };

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const showPushToastRef = useRef(showPushToast);
  showPushToastRef.current = showPushToast;

  const dedupeActivities = (activities: UserActivityEvent[]): UserActivityEvent[] => {
    const seen = new Set<string>();
    const result: UserActivityEvent[] = [];
    for (const a of activities) {
      if (a && a.id && !seen.has(a.id)) {
        seen.add(a.id);
        result.push(a);
      }
    }
    return result;
  };

  const dedupeUsers = (userList: ConnectedUser[]): ConnectedUser[] => {
    const userMap = new Map<string, ConnectedUser>();
    for (const u of userList) {
      if (u && u.id) {
        const existing = userMap.get(u.id);
        if (!existing || new Date(u.lastActive || 0).getTime() >= new Date(existing.lastActive || 0).getTime()) {
          userMap.set(u.id, u);
        }
      }
    }
    return Array.from(userMap.values());
  };

  const dedupeNotifications = (notifs: PushNotification[]): PushNotification[] => {
    const seen = new Set<string>();
    const result: PushNotification[] = [];
    for (const n of notifs) {
      if (n && n.id && !seen.has(n.id)) {
        seen.add(n.id);
        result.push(n);
      }
    }
    return result;
  };

  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);

        ws.send(
          JSON.stringify({
            type: 'USER_IDENTIFY',
            payload: currentUserRef.current,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          if (!event.data || typeof event.data !== 'string') return;
          const data = JSON.parse(event.data);
          if (!data || typeof data !== 'object') return;

          if (data.version) {
            localVersionRef.current = data.version;
          }

          if (data.type === 'STATE_INIT' || data.type === 'STATE_UPDATE') {
            const payload: AppStateData = data.payload;
            if (payload) {
              setWorkers(payload.workers || []);
              setJobs(payload.jobs || []);
              if (payload.vehicles) {
                setVehicles(payload.vehicles);
              }
              if (payload.notifications) {
                setNotifications(dedupeNotifications(payload.notifications));
              }
              setSettings({
                ...payload.settings,
                dropdownConfig: payload.settings?.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
              });
              if (payload.connectedUsers) {
                setConnectedUsers(dedupeUsers(payload.connectedUsers));
              }
              if (payload.recentActivities) {
                setRecentActivities(dedupeActivities(payload.recentActivities));
              }
              setLastSyncedAt(new Date());
            }
          } else if (data.type === 'USERS_ONLINE') {
            if (Array.isArray(data.payload)) {
              setConnectedUsers(dedupeUsers(data.payload));
            }
          } else if (data.type === 'ACTIVITY') {
            const act: UserActivityEvent = data.payload;
            if (act && act.id) {
              setRecentActivities((prev) => [act, ...prev.filter((a) => a.id !== act.id)].slice(0, 50));
            }
          } else if (data.type === 'NOTIFICATION') {
            const notif: PushNotification = data.payload;
            if (notif && notif.id) {
              setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
              showPushToastRef.current(notif);
            }
          }
        } catch (err) {
          console.warn('Recovered from incomplete or invalid WS message, refreshing state via REST:', err);
          fetchState(false);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);

        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
        ws.close();
      };
    } catch (e) {
      console.warn('WebSocket connection error, will retry:', e);
      setIsConnected(false);
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  }, []);

  const syncAllData = useCallback(
    async (showToastNotification = true): Promise<boolean> => {
      setIsSyncing(true);
      try {

        await syncOfflineQueue();

        const res = await apiFetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'pull' }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setWorkers(json.data.workers || []);
            setJobs(json.data.jobs || []);
            if (json.data.vehicles) {
              setVehicles(json.data.vehicles);
            }
            if (json.data.notifications) {
              setNotifications(dedupeNotifications(json.data.notifications));
            }
            setSettings({
              ...json.data.settings,
              dropdownConfig: json.data.settings?.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
            });
            if (json.version) {
              localVersionRef.current = json.version;
            }
            setLastSyncedAt(new Date());

            try {
              broadcastChannelRef.current?.postMessage({ type: 'SYNC_REFRESH' });
            } catch (e) {}

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
            } else {
              connectWebSocket();
            }

            if (showToastNotification) {
              showPushToastRef.current({
                id: `sync-${Date.now()}`,
                title: 'Data Synchronized',
                body: `All jobs (${json.data.jobs?.length || 0}), workers (${json.data.workers?.length || 0}), and fleet vehicles are live-synchronized across all connected users.`,
                timestamp: new Date().toISOString(),
                type: 'system',
                read: false,
                targetAudience: 'manager_only',
              });
            }
            return true;
          }
        }
        return false;
      } catch (err) {
        console.warn('Sync failed, trying direct state fetch:', err);
        await fetchState(true);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [connectWebSocket, syncOfflineQueue]
  );

  useEffect(() => {
    fetchState(true);
    connectWebSocket();

    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchState(true);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
        } else {
          connectWebSocket();
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    const syncInterval = setInterval(async () => {
      try {
        const res = await apiFetch('/api/sync/status');
        if (res.ok) {
          const status = await res.json();
          if (status.success && status.version && status.version !== localVersionRef.current) {
            fetchState(true);
          }
        }
      } catch (err) {}
    }, 5000);

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 12000);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(syncInterval);
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState<boolean>(() => googleDriveService.isConnected());
  const [googleDriveUser, setGoogleDriveUser] = useState<GoogleDriveUser | null>(() => googleDriveService.getStoredUser());
  const [autoDriveBackup, setAutoDriveBackupState] = useState<boolean>(() => googleDriveService.getAutoBackupEnabled());
  const [lastDriveBackupTime, setLastDriveBackupTime] = useState<string | null>(() => googleDriveService.getLastBackupTime());

  const setAutoDriveBackup = useCallback((enabled: boolean) => {
    googleDriveService.setAutoBackupEnabled(enabled);
    setAutoDriveBackupState(enabled);
  }, []);

  const connectGoogleDrive = useCallback(async (): Promise<{ success: boolean; user?: GoogleDriveUser; error?: string }> => {
    try {
      const res = await googleDriveService.authorize();
      if (res.success) {
        setIsGoogleDriveConnected(true);
        if (res.user) setGoogleDriveUser(res.user);
        showPushToastRef.current({
          id: `gdrive-connect-${Date.now()}`,
          title: 'Google Drive Connected',
          body: `Worksynch is now linked to Google Workspace storage (${res.user?.email || 'Google Account'}). Cloud storage folder created in Google Drive.`,
          timestamp: new Date().toISOString(),
          type: 'system',
          read: false,
          targetAudience: 'manager_only',
        });
      }
      return res;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to authorize Google Drive' };
    }
  }, []);

  const disconnectGoogleDrive = useCallback(() => {
    googleDriveService.signOut();
    setIsGoogleDriveConnected(false);
    setGoogleDriveUser(null);
    showPushToastRef.current({
      id: `gdrive-disconnect-${Date.now()}`,
      title: 'Google Drive Disconnected',
      body: 'Google Workspace cloud storage has been disconnected from this session.',
      timestamp: new Date().toISOString(),
      type: 'system',
      read: false,
      targetAudience: 'manager_only',
    });
  }, []);

  const backupToGoogleDrive = useCallback(
    async (customName?: string): Promise<{ success: boolean; file?: any; error?: string }> => {
      const statePayload = {
        workers,
        jobs,
        vehicles,
        settings,
        notifications,
        savedAt: new Date().toISOString(),
      };

      const res = await googleDriveService.uploadBackup(statePayload, customName);
      if (res.success) {
        const timeStr = new Date().toISOString();
        setLastDriveBackupTime(timeStr);
        showPushToastRef.current({
          id: `gdrive-backup-${Date.now()}`,
          title: 'Google Drive Backup Complete',
          body: `Successfully archived ${jobs.length} jobs, ${workers.length} workers, and ${vehicles.length} fleet vehicles to your Google Drive "Worksynch FieldOps Storage" folder.`,
          timestamp: timeStr,
          type: 'system',
          read: false,
          targetAudience: 'manager_only',
        });
      }
      return res;
    },
    [workers, jobs, vehicles, settings, notifications]
  );

  const listGoogleDriveBackups = useCallback(async (): Promise<GoogleDriveBackupMetadata[]> => {
    return await googleDriveService.listBackups();
  }, []);

  const restoreFromGoogleDrive = useCallback(
    async (fileId: string): Promise<{ success: boolean; error?: string }> => {
      const res = await googleDriveService.downloadBackupData(fileId);
      if (res.success && res.data) {
        const ok = await importData({
          jobs: res.data.jobs,
          workers: res.data.workers,
          settings: res.data.settings,
          mode: 'replace',
          fileName: 'Google Drive Cloud Backup',
        });

        if (ok) {
          if (res.data.vehicles) {
            setVehicles(res.data.vehicles);
          }
          showPushToastRef.current({
            id: `gdrive-restore-${Date.now()}`,
            title: 'Restored from Google Drive',
            body: 'System data successfully restored from selected Google Drive backup.',
            timestamp: new Date().toISOString(),
            type: 'system',
            read: false,
            targetAudience: 'manager_only',
          });
          return { success: true };
        }
        return { success: false, error: 'Could not apply imported data to state.' };
      }
      return { success: false, error: res.error || 'Failed to download backup from Google Drive.' };
    },
    [importData]
  );

  const deleteGoogleDriveFile = useCallback(async (fileId: string): Promise<boolean> => {
    return await googleDriveService.deleteFile(fileId);
  }, []);

  const exportJobsToGoogleSheet = useCallback(async (): Promise<{ success: boolean; webViewLink?: string; error?: string }> => {
    return await googleDriveService.exportJobsToGoogleSheet(jobs);
  }, [jobs]);

  const requestBrowserNotifications = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const computeUpdatedSettingsWithTools = (currentSettings: SystemSettings, currentJobs: Job[]): SystemSettings => {
    if (!currentSettings.tools || !Array.isArray(currentSettings.tools)) return currentSettings;
    const updatedTools = currentSettings.tools.map(tool => {
      let activeAssignedTotal = 0;
      const assignments: { id: string; assigned: string; signedBy: string; date: string; isReturned?: boolean }[] = [];
      currentJobs.forEach(job => {
        if (job.assignedTools && Array.isArray(job.assignedTools)) {
          job.assignedTools.forEach(at => {
            if (at.toolId === tool.id || (at.toolName && tool.name && at.toolName.trim().toLowerCase() === tool.name.trim().toLowerCase())) {
              const qty = Number(at.quantity || 1);
              const isRet = Boolean(at.isReturned);
              if (!isRet) {
                activeAssignedTotal += qty;
              }
              let signer = (at.signedBy || '').trim();
              if (!signer) {
                const pIds = [
                  ...(job.specialistIds || []),
                  ...(job.engineerId ? [job.engineerId] : []),
                  ...(job.driverIds || []),
                  ...(job.driverId ? [job.driverId] : []),
                ];
                const w = workers.find(worker => pIds.includes(worker.id));
                if (w) signer = w.name;
              }

              assignments.push({
                id: job.id,
                assigned: String(qty),
                signedBy: signer,
                date: at.date || job.scheduledDate,
                isReturned: isRet,
              });
            }
          });
        }
      });

      const totalEntered = Number(tool.quantity || 0);

      if (assignments.length > 0) {
        const remainingTotal = Math.max(0, totalEntered - activeAssignedTotal);
        const allReturned = assignments.every(a => a.isReturned);
        return {
          ...tool,
          assigned: String(activeAssignedTotal),
          remaining: String(remainingTotal),
          isReturned: allReturned,
          assignments,
        };
      } else {
        const isRet = Boolean(tool.isReturned);
        const activeAssigned = isRet ? 0 : Number(tool.assigned || 0);
        return {
          ...tool,
          assigned: String(activeAssigned),
          remaining: String(Math.max(0, totalEntered - activeAssigned)),
          isReturned: isRet,
          assignments,
        };
      }
    });
    return {
      ...currentSettings,
      tools: updatedTools,
    };
  };

  const addJob = async (jobData: Partial<Job>) => {
    recordSnapshot();
    try {
      const res = await apiFetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          const newNotif: PushNotification = {
            id: `notif-${Date.now()}`,
            title: `Job Created: ${result.data.code}`,
            body: `Scheduled at ${result.data.siteLocation?.name || 'Site'}.`,
            timestamp: new Date().toISOString(),
            type: 'job_status',
            read: false,
            targetAudience: 'manager_only',
          };
          showPushToast(newNotif);
        }
      }
    } catch (e) {

      const fallbackJob: Job = {
        id: `job-${Date.now()}`,
        code: jobData.code || `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
        title: jobData.title || 'Field Job',
        clientName: jobData.clientName || 'Client',
        siteLocation: jobData.siteLocation || {
          name: 'Site',
          address: 'Address',
          zone: 'Metro',
          lat: 37.7749,
          lng: -122.4194,
        },
        scheduledDate: jobData.scheduledDate || selectedDate,
        timeWindow: jobData.timeWindow || { start: '09:00 AM', end: '11:00 AM' },
        engineerId: jobData.engineerId || workers.find(w => w.role !== 'driver')?.id || '',
        specialistIds: jobData.specialistIds || (jobData.engineerId ? [jobData.engineerId] : []),
        driverId: jobData.driverId || '',
        driverIds: jobData.driverIds || (jobData.driverId ? [jobData.driverId] : []),
        priority: jobData.priority || 'normal',
        status: jobData.status || 'scheduled',
        estimatedDurationHours: jobData.estimatedDurationHours || 2.5,
        notes: jobData.notes || '',
        routeNotes: jobData.routeNotes || '',
        customFields: jobData.customFields || {},
        assignedTools: jobData.assignedTools || [],
      };
      enqueueOfflineMutation({
        type: 'ADD_JOB',
        endpoint: '/api/jobs',
        method: 'POST',
        payload: fallbackJob,
      });
      setJobs((prev) => {
        const newJobs = [...prev, fallbackJob];
        setSettings(curr => computeUpdatedSettingsWithTools(curr, newJobs));
        return newJobs;
      });
    }
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    recordSnapshot();
    try {
      await apiFetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {

      enqueueOfflineMutation({
        type: 'UPDATE_JOB',
        endpoint: `/api/jobs/${id}`,
        method: 'PUT',
        payload: updates,
      });
    }
    setJobs((prev) => {
      const newJobs = prev.map((j) => (j.id === id ? { ...j, ...updates } : j));
      setSettings(curr => computeUpdatedSettingsWithTools(curr, newJobs));
      return newJobs;
    });
  };

  const updateJobStatus = async (id: string, status: JobStatus, notes?: string) => {
    recordSnapshot();
    let appliedUpdates: Partial<Job> = { status };
    let engineerToSync: string | undefined;
    let driverToSync: string | undefined;

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          engineerToSync = (j as any).assignedEngineerId || j.engineerId;
          driverToSync = (j as any).assignedDriverId || j.driverId;

          const transition = getJobStatusTransitionUpdates(j, status);
          appliedUpdates = {
            ...transition,
            notes: notes !== undefined ? notes : j.notes,
          };
          return {
            ...j,
            ...appliedUpdates,
          };
        }
        return j;
      })
    );

    const statusLower = (status || '').toLowerCase();
    let workerStatus: 'en_route' | 'on_site' | 'available' | null = null;
    if (statusLower.includes('route') || statusLower.includes('transit') || statusLower.includes('dispatch')) {
      workerStatus = 'en_route';
    } else if (statusLower.includes('site') || statusLower.includes('progress') || statusLower.includes('work')) {
      workerStatus = 'on_site';
    } else if (statusLower.includes('completed') || statusLower.includes('done') || statusLower.includes('cancel')) {
      workerStatus = 'available';
    }

    if (workerStatus && (engineerToSync || driverToSync)) {
      setWorkers((prev) => prev.map(w => {
        if ((w.id === engineerToSync || w.id === driverToSync) && w.status !== 'on_leave' && w.status !== 'off_duty') {
          return { ...w, status: workerStatus };
        }
        return w;
      }));
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_JOB_STATUS',
          payload: {
            jobId: id,
            status,
            notes,
            appliedUpdates,
            updatedBy: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
          },
        })
      );
    } else {
      await updateJob(id, appliedUpdates);
    }
  };

  const addJobNote = async (jobId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    recordSnapshot();

    const optimisticNote = {
      id: `note-opt-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            interactionNotes: [...(j.interactionNotes || []), optimisticNote],
          };
        }
        return j;
      })
    );

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'USER_ADD_JOB_NOTE',
          payload: {
            jobId,
            content: trimmed,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
          },
        })
      );
    } else {
      try {
        await apiFetch(`/api/jobs/${jobId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: trimmed,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
          }),
        });
      } catch (e) {
        console.warn('Failed to post job note:', e);
      }
    }
  };

  const reassignJob = async (jobId: string, engineerId: string, driverId: string) => {
    recordSnapshot();
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, engineerId, driverId } : j))
    );

    try {
      await apiFetch(`/api/jobs/${jobId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineerId,
          driverId,
          updatedBy: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        }),
      });
    } catch (e) {
      console.warn('Failed to reassign job:', e);
    }
  };

  const deleteJob = async (id: string) => {
    recordSnapshot();
    setJobs((prev) => {
      const newJobs = prev.filter((j) => j.id !== id);
      setSettings((curr) => computeUpdatedSettingsWithTools(curr, newJobs));
      return newJobs;
    });
    try {
      await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
    } catch (e) {
      enqueueOfflineMutation({
        type: 'DELETE_JOB',
        endpoint: `/api/jobs/${id}`,
        method: 'DELETE',
        payload: null,
      });
    }
  };

  const toggleToolReturn = async (toolId: string, jobId?: string, isReturned?: boolean) => {
    recordSnapshot();
    const targetReturned = isReturned !== undefined ? isReturned : true;

    setJobs((prevJobs) => {
      const newJobs = prevJobs.map((j) => {
        if (jobId && j.id !== jobId) return j;
        if (!j.assignedTools || !Array.isArray(j.assignedTools)) return j;

        let modified = false;
        const newAssignedTools = j.assignedTools.map((at) => {
          if (!toolId || at.toolId === toolId || (at.toolName && toolId && at.toolName.trim().toLowerCase() === toolId.trim().toLowerCase())) {
            modified = true;
            return { ...at, isReturned: targetReturned };
          }
          return at;
        });

        return modified ? { ...j, assignedTools: newAssignedTools } : j;
      });

      setSettings((currSettings) => {
        let updated = computeUpdatedSettingsWithTools(currSettings, newJobs);
        if (!jobId && toolId && updated.tools) {
          updated = {
            ...updated,
            tools: updated.tools.map((t) => {
              if (t.id === toolId || (t.name && toolId && t.name.trim().toLowerCase() === toolId.trim().toLowerCase())) {
                const total = Number(t.quantity || 0);
                const assigned = targetReturned ? 0 : Number(t.assigned || 0);
                return {
                  ...t,
                  isReturned: targetReturned,
                  assigned: String(assigned),
                  remaining: String(Math.max(0, total - assigned)),
                };
              }
              return t;
            }),
          };
        }
        return updated;
      });

      return newJobs;
    });

    try {
      await apiFetch('/api/tools/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, jobId, isReturned: targetReturned }),
      });
    } catch (e) {
    }
  };

  const addWorker = async (workerData: Partial<Worker>) => {
    recordSnapshot();
    try {
      const res = await apiFetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerData),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          const roleLabel =
            result.data.role === 'driver'
              ? 'Driver'
              : result.data.role === 'welder'
              ? 'Welder Specialist'
              : result.data.role === 'plumber'
              ? 'Plumbing Specialist'
              : 'Field Engineer';
          const newNotif: PushNotification = {
            id: `notif-${Date.now()}`,
            title: `Worker Added: ${result.data.name}`,
            body: `${roleLabel} ready for dispatch.`,
            timestamp: new Date().toISOString(),
            type: 'worker_status',
            read: false,
            targetAudience: 'manager_only',
          };
          showPushToast(newNotif);
        }
      }
    } catch (e) {
      const fallbackWorker: Worker = {
        id: `w-${Date.now()}`,
        name: workerData.name || 'New Worker',
        role: workerData.role || 'engineer',
        email: workerData.email || 'worker@fieldops.io',
        phone: workerData.phone || '+1 (555) 000-0000',
        status: workerData.status || 'available',
        specializations: workerData.specializations || [],
        skills: workerData.skills || ['General Specialist'],
        avatarUrl: workerData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        rating: 5.0,
        ...workerData,
      };
      setWorkers((prev) => [...prev, fallbackWorker]);
    }
  };

  const updateWorker = async (id: string, updates: Partial<Worker>) => {
    recordSnapshot();
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const { password: _p, passwordHash: _h, hasPassword: _f, ...rest } = updates as any;
        return { ...w, ...rest, hasPassword: _p ? true : (w as any).hasPassword };
      })
    );
    try {
      const res = await apiFetch(`/api/workers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          changedBy: currentUser?.name || 'Dispatch Manager',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkers((prev) => prev.map((w) => (w.id === id ? json.data : w)));
        }
      }
    } catch (e) {
      console.warn('Could not update worker on server:', e);
    }
  };

  const batchUpdateWorkers = async (updatedWorkers: Worker[]) => {
    recordSnapshot();
    setWorkers((prev) => {
      const map = new Map(updatedWorkers.map((w) => [w.id, w]));
      return prev.map((w) => (map.has(w.id) ? map.get(w.id)! : w));
    });

    try {
      await apiFetch('/api/workers/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workers: updatedWorkers }),
      });
    } catch (e) {
      console.warn('Batch update worker profiles error:', e);
    }
  };

  const assignWorkerAccount = async (
    id: string,
    accountData: { username?: string; password?: string; accountActive?: boolean }
  ) => {
    recordSnapshot();
    const { password: _pw, ...optimisticRest } = accountData as any;
    setWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...optimisticRest, hasPassword: _pw ? true : (w as any).hasPassword } : w))
    );

    try {
      const res = await apiFetch(`/api/admin/workers/${id}/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          ...accountData,
          changedBy: currentUser?.name || 'Dispatch Manager',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkers((prev) => prev.map((w) => (w.id === id ? json.data : w)));
        }
      }
    } catch (e) {
      console.warn('Could not assign worker account credentials:', e);
    }
  };

  const batchAssignWorkerAccounts = async (
    accounts: { id: string; username?: string; password?: string; accountActive?: boolean }[]
  ) => {
    recordSnapshot();
    setWorkers((prev) => {
      const map = new Map(accounts.map((a) => [a.id, a]));
      return prev.map((w) => {
        if (!map.has(w.id)) return w;
        const { password: _p, ...rest } = map.get(w.id) as any;
        return { ...w, ...rest, hasPassword: _p ? true : (w as any).hasPassword };
      });
    });

    try {
      await apiFetch('/api/admin/workers/batch-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          accounts,
          changedBy: currentUser?.name || 'Dispatch Manager',
        }),
      });
    } catch (e) {
      console.warn('Batch assign worker accounts error:', e);
    }
  };

  const deleteWorker = async (id: string) => {
    recordSnapshot();
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    try {
      await apiFetch(`/api/workers/${id}`, { method: 'DELETE' });
    } catch (e) {
      enqueueOfflineMutation({
        type: 'UPDATE_WORKER',
        endpoint: `/api/workers/${id}`,
        method: 'DELETE',
        payload: null,
      });
    }
  };

  const addVehicle = async (vehicleData: Partial<FleetVehicle>) => {
    recordSnapshot();
    try {
      const res = await apiFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vehicleData, changedBy: currentUser?.name || 'Dispatch Manager' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setVehicles((prev) => [...prev, json.data]);
          if (json.data.assignedDriverId) {
            updateWorker(json.data.assignedDriverId, {
              vehicleInfo: {
                model: json.data.model,
                plate: json.data.plate,
                capacity: json.data.capacity || 4,
              },
            });
          }
        }
      }
    } catch (e) {
      const newV: FleetVehicle = {
        id: `veh-${Date.now()}`,
        name: vehicleData.name || 'Utility Van',
        model: vehicleData.model || 'Ford Transit 350 AWD',
        plate: vehicleData.plate || 'FL-999-XX',
        capacity: vehicleData.capacity || 4,
        status: vehicleData.status || 'available',
        assignedDriverId: vehicleData.assignedDriverId,
        locationName: vehicleData.locationName || 'Central Depot',
      };
      setVehicles((prev) => [...prev, newV]);
      if (newV.assignedDriverId) {
        updateWorker(newV.assignedDriverId, {
          vehicleInfo: {
            model: newV.model,
            plate: newV.plate,
            capacity: newV.capacity || 4,
          },
        });
      }
    }
  };

  const updateVehicle = async (id: string, updates: Partial<FleetVehicle>) => {
    recordSnapshot();
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    try {
      const res = await apiFetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, changedBy: currentUser?.name || 'Dispatch Manager' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setVehicles((prev) => prev.map((v) => (v.id === id ? json.data : v)));
        }
      }
    } catch (e) {
      console.warn('Could not update vehicle on server:', e);
    }
  };

  const updateVehicleStatus = async (id: string, status: VehicleStatus, notes?: string, locationName?: string) => {
    recordSnapshot();
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, status, ...(notes !== undefined ? { notes } : {}), ...(locationName !== undefined ? { locationName } : {}) } : v)));
    try {
      const res = await apiFetch(`/api/vehicles/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, locationName, changedBy: currentUser?.name || 'Dispatch Manager' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setVehicles((prev) => prev.map((v) => (v.id === id ? json.data : v)));
        }
      }
    } catch (e) {
      console.warn('Could not update vehicle status:', e);
    }
  };

  const deleteVehicle = async (id: string) => {
    recordSnapshot();
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    try {
      await apiFetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Could not delete vehicle:', e);
    }
  };

  const assignVehicleDriver = async (vehicleId: string, driverId?: string) => {
    await updateVehicle(vehicleId, { assignedDriverId: driverId });
    if (driverId) {
      const targetVehicle = vehicles.find((v) => v.id === vehicleId);
      if (targetVehicle) {
        await updateWorker(driverId, {
          vehicleInfo: {
            model: targetVehicle.model,
            plate: targetVehicle.plate,
            capacity: targetVehicle.capacity || 4,
          },
        });
      }
    }
  };

  const broadcastDailyRouteUpdate = async () => {
    try {
      const res = await apiFetch('/api/notify/daily-route', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          showPushToast(json.data);
        }
      }
    } catch (e) {

      const onSite = workers.filter((w) => w.status === 'on_site').map((w) => w.name).join(', ') || 'None';
      const avail = workers.filter((w) => w.status === 'available').map((w) => w.name).join(', ') || 'None';
      const notif: PushNotification = {
        id: `notif-daily-${Date.now()}`,
        title: 'Daily Route Update Broadcasted',
        body: `On Site: ${onSite}. Available: ${avail}. Daily route synchronized to mobile units.`,
        timestamp: new Date().toISOString(),
        type: 'route_update',
        read: false,
        targetAudience: 'manager_only',
      };
      setNotifications((prev) => [notif, ...prev]);
      showPushToast(notif);
    }
  };

  const sendBroadcastNotification = async (title: string, body: string, type: PushNotification['type'] = 'urgent_alert') => {
    try {
      const res = await apiFetch('/api/notify/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, type }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          showPushToast(json.data);
        }
      }
    } catch (e) {
      const notif: PushNotification = {
        id: `notif-${Date.now()}`,
        title,
        body,
        timestamp: new Date().toISOString(),
        type,
        read: false,
        targetAudience: 'manager_only',
      };
      setNotifications((prev) => [notif, ...prev]);
      showPushToast(notif);
    }
  };

  const updateSettings = async (
    updates: Partial<SystemSettings>,
    cascadeOptions?: {
      cascadeRename?: { category: string; oldVal: string; newVal: string }[];
      cascadeDelete?: { category: string; val: string }[];
      updatedWorkers?: Worker[];
    }
  ) => {
    recordSnapshot();
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    if (cascadeOptions?.updatedWorkers) {
      setWorkers(cascadeOptions.updatedWorkers);
    } else if (cascadeOptions?.cascadeRename || cascadeOptions?.cascadeDelete) {
      setWorkers((prev) => {
        return prev.map((w) => {
          let worker = { ...w };

          if (cascadeOptions.cascadeRename) {
            cascadeOptions.cascadeRename.forEach(({ category, oldVal, newVal }) => {
              if (category === 'roles' && worker.roleTitle === oldVal) {
                worker.roleTitle = newVal;
              } else if (category === 'specializations' && Array.isArray(worker.specializations)) {
                if (worker.specializations.includes(oldVal)) {
                  worker.specializations = worker.specializations.map((s) => (s === oldVal ? newVal : s));
                }
              } else if (category === 'skills' && Array.isArray(worker.skills)) {
                if (worker.skills.includes(oldVal)) {
                  worker.skills = worker.skills.map((s) => (s === oldVal ? newVal : s));
                }
              } else if (category === 'vehicleTypes' && worker.vehicleInfo && worker.vehicleInfo.model === oldVal) {
                worker.vehicleInfo = { ...worker.vehicleInfo, model: newVal };
              } else if (category === 'zones' && worker.locationName && worker.locationName.includes(oldVal)) {
                worker.locationName = worker.locationName.replace(oldVal, newVal);
              }
            });
          }

          if (cascadeOptions.cascadeDelete) {
            cascadeOptions.cascadeDelete.forEach(({ category, val }) => {
              if (category === 'roles' && worker.roleTitle === val) {
                worker.roleTitle = undefined;
              } else if (category === 'specializations' && Array.isArray(worker.specializations)) {
                worker.specializations = worker.specializations.filter((s) => s !== val);
              } else if (category === 'skills' && Array.isArray(worker.skills)) {
                worker.skills = worker.skills.filter((s) => s !== val);
              } else if (category === 'vehicleTypes' && worker.vehicleInfo && worker.vehicleInfo.model === val) {
                worker.vehicleInfo = undefined;
              }
            });
          }

          return worker;
        });
      });
    }

    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          ...(cascadeOptions || {}),
        }),
      });
    } catch (e) {
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const resetToSeedData = async () => {
    recordSnapshot();
    try {
      const res = await apiFetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setWorkers(json.data.workers);
          setJobs(json.data.jobs);
          setNotifications(json.data.notifications);
          setSettings({
            ...json.data.settings,
            dropdownConfig: json.data.settings?.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
          });
        }
      }
    } catch (e) {
      setWorkers(INITIAL_STATE.workers);
      setJobs(INITIAL_STATE.jobs);
      setNotifications(INITIAL_STATE.notifications);
      setSettings(INITIAL_STATE.settings);
    }
  };

  const clearServerData = async () => {
    recordSnapshot();
    try {
      const res = await apiFetch('/api/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setWorkers(json.data.workers || []);
          setJobs(json.data.jobs || []);
          setNotifications(json.data.notifications || []);
          setSettings({
            ...json.data.settings,
            dropdownConfig: json.data.settings?.dropdownConfig || DEFAULT_DROPDOWN_CONFIG,
          });
        }
      }
    } catch (e) {
      setWorkers([]);
      setJobs([]);
      setNotifications([]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        workers,
        jobs,
        notifications,
        settings,
        selectedDate,
        setSelectedDate,
        dateScope,
        setDateScope,
        todayDate: getSystemTodayStr(),
        goToToday,
        isCalendarOpen,
        setIsCalendarOpen,
        activeView,
        setActiveView,
        activeSettingsTab,
        setActiveSettingsTab,
        openSettingsTab,
        currentRole,
        setAuthData,
        setCurrentRole,
        isAuthenticated,
        setIsAuthenticated,
        logout,
        isConnected,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undo,
        redo,
        activeToast,
        dismissToast,
        exportScheduleCSV,
        exportZipArchive,
        isImportModalOpen,
        setIsImportModalOpen,
        importData,
        connectedUsers,
        currentUser,
        updateCurrentUserName,
        updateCurrentUserRole,
        recentActivities,
        focusedJobId,
        setFocusedJobId,
        isTeamActivityOpen,
        setIsTeamActivityOpen,
        isAddJobOpen,
        setIsAddJobOpen,
        isAddWorkerOpen,
        setIsAddWorkerOpen,
        editingWorker,
        setEditingWorker,
        editingJob,
        setEditingJob,
        interactingJob,
        setInteractingJob,
        addJob,
        updateJob,
        updateJobStatus,
        deleteJob,
        addJobNote,
        reassignJob,
        addWorker,
        updateWorker,
        batchUpdateWorkers,
        assignWorkerAccount,
        batchAssignWorkerAccounts,
        deleteWorker,
        adminToken,
        vehicles,
        addVehicle,
        updateVehicle,
        updateVehicleStatus,
        deleteVehicle,
        assignVehicleDriver,
        broadcastDailyRouteUpdate,
        sendBroadcastNotification,
        toggleToolReturn,
        updateSettings,
        markNotificationRead,
        clearAllNotifications,
        resetToSeedData,
        clearServerData,
        requestBrowserNotifications,
        localStorageStats,
        syncOfflineQueue,
        clearLocalCache,
        isSyncing,
        lastSyncedAt,
        syncAllData,
        isGoogleDriveConnected,
        googleDriveUser,
        connectGoogleDrive,
        disconnectGoogleDrive,
        backupToGoogleDrive,
        listGoogleDriveBackups,
        restoreFromGoogleDrive,
        deleteGoogleDriveFile,
        exportJobsToGoogleSheet,
        autoDriveBackup,
        setAutoDriveBackup,
        lastDriveBackupTime,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
