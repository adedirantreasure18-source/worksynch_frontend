import { apiFetch } from '../config/api';


import { Worker, Job, FleetVehicle, SystemSettings, PushNotification } from '../types';

export interface LocalStorageStats {
  usedBytes: number;
  formattedSize: string;
  itemCount: number;
  lastSyncTime: string | null;
  outboxPendingCount: number;
  isQuotaAvailable: boolean;
}

export interface OfflineMutation {
  id: string;
  timestamp: string;
  type: 'ADD_JOB' | 'UPDATE_JOB' | 'DELETE_JOB' | 'UPDATE_WORKER' | 'UPDATE_SETTINGS' | 'UPDATE_VEHICLE';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  retryCount: number;
}

const STORAGE_KEYS = {
  WORKERS: 'fieldops_local_workers_v2',
  JOBS: 'fieldops_local_jobs_v2',
  VEHICLES: 'fieldops_local_vehicles_v2',
  SETTINGS: 'fieldops_local_settings_v2',
  NOTIFICATIONS: 'fieldops_local_notifications_v2',
  OUTBOX: 'fieldops_offline_outbox_v2',
  LAST_SYNC: 'fieldops_last_sync_timestamp',
  STORAGE_VERSION: 'fieldops_storage_version',
};

const CURRENT_VERSION = '2.1.0';

export function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[LocalStorage] Failed to parse key "${key}":`, err);
    return fallback;
  }
}

export function safeSetItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      console.error('[LocalStorage] Storage quota exceeded. Pruning cache...');
      pruneOldCache();
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryErr) {
        console.error('[LocalStorage] Write failed even after cache pruning:', retryErr);
        return false;
      }
    }
    console.error(`[LocalStorage] Error writing key "${key}":`, err);
    return false;
  }
}

function pruneOldCache(): void {
  try {
    const notifs = safeGetItem<PushNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    if (notifs.length > 20) {
      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, notifs.slice(0, 20));
    }
  } catch (e) {}
}

export function getLocalStorageMetrics(): LocalStorageStats {
  if (typeof window === 'undefined') {
    return {
      usedBytes: 0,
      formattedSize: '0 KB',
      itemCount: 0,
      lastSyncTime: null,
      outboxPendingCount: 0,
      isQuotaAvailable: true,
    };
  }

  let totalBytes = 0;
  let count = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        totalBytes += (key.length + val.length) * 2;
        count++;
      }
    }
  } catch (e) {}

  const outbox = safeGetItem<OfflineMutation[]>(STORAGE_KEYS.OUTBOX, []);
  const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

  const formatted = totalBytes < 1024
    ? `${totalBytes} B`
    : totalBytes < 1024 * 1024
    ? `${(totalBytes / 1024).toFixed(1)} KB`
    : `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;

  return {
    usedBytes: totalBytes,
    formattedSize: formatted,
    itemCount: count,
    lastSyncTime: lastSync,
    outboxPendingCount: outbox.length,
    isQuotaAvailable: totalBytes < 4.5 * 1024 * 1024, // LocalStorage limit ~5MB
  };
}

export function enqueueOfflineMutation(mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retryCount'>): void {
  const outbox = safeGetItem<OfflineMutation[]>(STORAGE_KEYS.OUTBOX, []);
  const newEntry: OfflineMutation = {
    ...mutation,
    id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  outbox.push(newEntry);
  safeSetItem(STORAGE_KEYS.OUTBOX, outbox);
}

export function getOfflineOutbox(): OfflineMutation[] {
  return safeGetItem<OfflineMutation[]>(STORAGE_KEYS.OUTBOX, []);
}

export function clearOfflineOutbox(): void {
  safeSetItem(STORAGE_KEYS.OUTBOX, []);
}

export async function syncOfflineOutbox(): Promise<{ success: number; failed: number }> {
  const outbox = getOfflineOutbox();
  if (outbox.length === 0) return { success: 0, failed: 0 };

  const remaining: OfflineMutation[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of outbox) {
    try {
      const res = await apiFetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });

      if (res.ok) {
        successCount++;
      } else {
        item.retryCount++;
        if (item.retryCount < 5) {
          remaining.push(item);
        }
        failCount++;
      }
    } catch (err) {
      item.retryCount++;
      if (item.retryCount < 5) {
        remaining.push(item);
      }
      failCount++;
    }
  }

  safeSetItem(STORAGE_KEYS.OUTBOX, remaining);
  if (successCount > 0) {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  return { success: successCount, failed: failCount };
}

export function saveLocalAppState(data: {
  workers?: Worker[];
  jobs?: Job[];
  vehicles?: FleetVehicle[];
  settings?: SystemSettings;
  notifications?: PushNotification[];
}): void {
  if (data.workers) safeSetItem(STORAGE_KEYS.WORKERS, data.workers);
  if (data.jobs) safeSetItem(STORAGE_KEYS.JOBS, data.jobs);
  if (data.vehicles) safeSetItem(STORAGE_KEYS.VEHICLES, data.vehicles);
  if (data.settings) safeSetItem(STORAGE_KEYS.SETTINGS, data.settings);
  if (data.notifications) safeSetItem(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, CURRENT_VERSION);
}

export function loadLocalAppState(): {
  workers: Worker[] | null;
  jobs: Job[] | null;
  vehicles: FleetVehicle[] | null;
  settings: SystemSettings | null;
  notifications: PushNotification[] | null;
} {
  return {
    workers: safeGetItem<Worker[] | null>(STORAGE_KEYS.WORKERS, null),
    jobs: safeGetItem<Job[] | null>(STORAGE_KEYS.JOBS, null),
    vehicles: safeGetItem<FleetVehicle[] | null>(STORAGE_KEYS.VEHICLES, null),
    settings: safeGetItem<SystemSettings | null>(STORAGE_KEYS.SETTINGS, null),
    notifications: safeGetItem<PushNotification[] | null>(STORAGE_KEYS.NOTIFICATIONS, null),
  };
}

export { STORAGE_KEYS };
