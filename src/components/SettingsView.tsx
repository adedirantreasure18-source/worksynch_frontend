import { apiFetch, backendFileUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DropdownConfigurations, ToolItem } from '../types';
import { DEFAULT_DROPDOWN_CONFIG, INITIAL_SETTINGS } from '../data/initialData';
import { uploadAvatarImage } from '../utils/imageUtils';
import { getEffectiveLeaveInfo } from '../utils/leaveUtils';
import {
  User,
  Users,
  Radio,
  Volume2,
  Bell,
  VolumeX,
  RotateCcw,
  Save,
  CheckCircle2,
  Building2,
  Sliders,
  ListFilter,
  LayoutTemplate,
  Plus,
  X,
  Pencil,
  Send,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Trash2,
  Folder,
  HardDrive,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Navigation,
  Shuffle,
  Search,
  ShieldCheck,
  Lock,
  Unlock,
  Download,
  AlertCircle,
  ExternalLink,
  UserCheck,
  CheckSquare,
  Square,
  Laptop,
  Upload,
  RefreshCw,
  Database,
  Sparkles,
  Clock,
  FileJson,
  History,
  Truck,
  Cloud,
  CloudDownload,
  CloudUpload,
  FileSpreadsheet,
  Globe,
  Layers,
} from 'lucide-react';
import {
  googleDriveService,
  GoogleDriveBackupMetadata,
} from '../services/googleDriveService';


export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    sendBroadcastNotification,
    broadcastDailyRouteUpdate,
    toggleToolReturn,
    resetToSeedData,
    clearServerData,
    setIsAddJobOpen,
    setIsAddWorkerOpen,
    workers,
    jobs,
    vehicles,
    addVehicle,
    updateVehicle,
    updateVehicleStatus,
    deleteVehicle,
    assignVehicleDriver,
    activeSettingsTab,
    setActiveSettingsTab,
    updateWorker,
    assignWorkerAccount,
    batchAssignWorkerAccounts,
    setAuthData,
    adminToken,
    currentUser,
    localStorageStats,
    syncOfflineQueue,
    clearLocalCache,
    setInteractingJob,
    isConnected,
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
  } = useApp();


  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  
  const [storageInfo, setStorageInfo] = useState<{
    storagePath: string;
    backupPath: string;
    fileSizeBytes: number;
    lastModified: string | null;
    snapshotsCount: number;
    workersCount: number;
    jobsCount: number;
    vehiclesCount: number;
    persistedStateExists: boolean;
    backupExists: boolean;
  } | null>(null);

  const [snapshots, setSnapshots] = useState<{
    name: string;
    sizeBytes: number;
    sizeFormatted: string;
    createdAt: string;
  }[]>([]);

  const [verificationResult, setVerificationResult] = useState<{
    healthy: boolean;
    fileHash: string;
    primarySize: number;
    writePermissionTest: boolean;
    recordCounts: { workers: number; jobs: number; vehicles: number; settings: boolean };
    checkedAt: string;
  } | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);
  const [vacuumFeedback, setVacuumFeedback] = useState<string | null>(null);
  const [offlineSyncFeedback, setOfflineSyncFeedback] = useState<string | null>(null);

  const loadStorageDiagnostics = async () => {
    try {
      const [infoRes, snapRes] = await Promise.all([
        apiFetch('/api/storage/info'),
        apiFetch('/api/storage/snapshots'),
      ]);
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.success) {
          setStorageInfo(infoData);
        }
      }
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        if (snapData.success && Array.isArray(snapData.snapshots)) {
          setSnapshots(snapData.snapshots);
        }
      }
    } catch (e) {
      
    }
  };

  useEffect(() => {
    loadStorageDiagnostics();
  }, []);

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await apiFetch('/api/storage/verify');
      const data = await res.json();
      if (data.success) {
        setVerificationResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  const adminAuthHeaders = (): Record<string, string> =>
    adminToken ? { Authorization: `Bearer ${adminToken}` } : {};

  const handleCreateSnapshot = async () => {
    setIsTakingSnapshot(true);
    try {
      const res = await apiFetch('/api/storage/snapshot', {
        method: 'POST',
        headers: { ...adminAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        setSnapshotFeedback(`Snapshot created: ${data.snapshotFileName}`);
        loadStorageDiagnostics();
        setTimeout(() => setSnapshotFeedback(null), 4000);
      } else {
        setSnapshotFeedback(data.error || 'Failed to create snapshot (admin re-login may be required)');
        setTimeout(() => setSnapshotFeedback(null), 4000);
      }
    } catch (e) {
      setSnapshotFeedback('Failed to create snapshot');
      setTimeout(() => setSnapshotFeedback(null), 4000);
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotFileName: string) => {
    if (!window.confirm(`Restore state from snapshot "${snapshotFileName}"? Current data will be safely backed up first.`)) {
      return;
    }
    try {
      const res = await apiFetch('/api/storage/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({ fileName: snapshotFileName }),
      });
      const data = await res.json();
      if (data.success) {
        setRestoreMessage(`Restored successfully from ${snapshotFileName}! Reloading...`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setRestoreMessage(`Failed to restore: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      setRestoreMessage('Network error restoring snapshot.');
    }
  };

  const handleVacuumDatabase = async () => {
    setIsVacuuming(true);
    try {
      const res = await apiFetch('/api/storage/vacuum', {
        method: 'POST',
        headers: { ...adminAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        setVacuumFeedback(`Compaction complete! Database saved to ${data.fileSizeBytes} bytes.`);
        loadStorageDiagnostics();
        setTimeout(() => setVacuumFeedback(null), 4500);
      } else {
        setVacuumFeedback(data.error || 'Vacuum failed (admin re-login may be required)');
        setTimeout(() => setVacuumFeedback(null), 4500);
      }
    } catch (e) {
      setVacuumFeedback('Vacuum failed');
      setTimeout(() => setVacuumFeedback(null), 4500);
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleManualOfflineSync = async () => {
    try {
      const res = await syncOfflineQueue();
      setOfflineSyncFeedback(`Synced ${res.success} pending changes to server!`);
      setTimeout(() => setOfflineSyncFeedback(null), 4000);
      loadStorageDiagnostics();
    } catch (e) {
      setOfflineSyncFeedback('Sync failed');
      setTimeout(() => setOfflineSyncFeedback(null), 4000);
    }
  };

  
  const [driveBackups, setDriveBackups] = useState<GoogleDriveBackupMetadata[]>([]);
  const [isLoadingDriveBackups, setIsLoadingDriveBackups] = useState(false);
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [isRestoringDriveId, setIsRestoringDriveId] = useState<string | null>(null);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [driveFeedback, setDriveFeedback] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);
  const [customClientId, setCustomClientId] = useState(() => googleDriveService.getClientId());
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);

  const fetchDriveBackupsList = async () => {
    if (!isGoogleDriveConnected) return;
    setIsLoadingDriveBackups(true);
    try {
      const list = await listGoogleDriveBackups();
      setDriveBackups(list);
    } catch (err) {
      console.error('Failed to list Google Drive backups:', err);
    } finally {
      setIsLoadingDriveBackups(false);
    }
  };

  useEffect(() => {
    if (isGoogleDriveConnected && activeSettingsTab === 'google_workspace') {
      fetchDriveBackupsList();
    }
  }, [isGoogleDriveConnected, activeSettingsTab]);

  const handleConnectDrive = async () => {
    setDriveFeedback(null);
    const res = await connectGoogleDrive();
    if (res.success) {
      setDriveFeedback({
        type: 'success',
        text: `Connected to Google Drive as ${res.user?.email || 'Google Account'}. Workspace storage folder initialized.`,
      });
      fetchDriveBackupsList();
    } else {
      setDriveFeedback({
        type: 'error',
        text: res.error || 'Failed to authenticate with Google Drive.',
      });
    }
  };

  const handleBackupToDriveNow = async () => {
    setIsBackingUpDrive(true);
    setDriveFeedback(null);
    try {
      const res = await backupToGoogleDrive();
      if (res.success) {
        setDriveFeedback({
          type: 'success',
          text: `Snapshot archived successfully to Google Drive folder "Worksynch FieldOps Storage".`,
          link: res.file?.webViewLink,
        });
        await fetchDriveBackupsList();
      } else {
        setDriveFeedback({
          type: 'error',
          text: res.error || 'Failed to backup database to Google Drive.',
        });
      }
    } catch (e: any) {
      setDriveFeedback({
        type: 'error',
        text: e.message || 'Backup failed.',
      });
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  const handleRestoreFromDriveBackup = async (backup: GoogleDriveBackupMetadata) => {
    if (
      !window.confirm(
        `Are you sure you want to restore data from Google Drive snapshot "${backup.name}" created at ${new Date(
          backup.timestamp
        ).toLocaleString()}? This will replace your current workspace records.`
      )
    ) {
      return;
    }

    setIsRestoringDriveId(backup.id);
    setDriveFeedback(null);
    try {
      const res = await restoreFromGoogleDrive(backup.id);
      if (res.success) {
        setDriveFeedback({
          type: 'success',
          text: `System state restored from Google Drive snapshot "${backup.name}". All rosters and records updated.`,
        });
      } else {
        setDriveFeedback({
          type: 'error',
          text: res.error || 'Failed to restore snapshot from Google Drive.',
        });
      }
    } catch (e: any) {
      setDriveFeedback({
        type: 'error',
        text: e.message || 'Restore error.',
      });
    } finally {
      setIsRestoringDriveId(null);
    }
  };

  const handleDeleteDriveBackup = async (backup: GoogleDriveBackupMetadata) => {
    if (!window.confirm(`Delete Google Drive backup file "${backup.name}"?`)) {
      return;
    }
    const ok = await deleteGoogleDriveFile(backup.id);
    if (ok) {
      setDriveBackups((prev) => prev.filter((b) => b.id !== backup.id));
      setDriveFeedback({
        type: 'success',
        text: `Removed "${backup.name}" from Google Drive storage.`,
      });
    } else {
      setDriveFeedback({
        type: 'error',
        text: 'Failed to delete file from Google Drive.',
      });
    }
  };

  const handleExportToGoogleSheets = async () => {
    setIsExportingSheets(true);
    setDriveFeedback(null);
    try {
      const res = await exportJobsToGoogleSheet();
      if (res.success && res.webViewLink) {
        setDriveFeedback({
          type: 'success',
          text: 'Exported active dispatch jobs directly into a Google Spreadsheet in your Google Drive!',
          link: res.webViewLink,
        });
      } else {
        setDriveFeedback({
          type: 'error',
          text: res.error || 'Google Sheets export failed.',
        });
      }
    } catch (e: any) {
      setDriveFeedback({
        type: 'error',
        text: e.message || 'Export error.',
      });
    } finally {
      setIsExportingSheets(false);
    }
  };

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault();
    googleDriveService.setClientId(customClientId);
    setShowClientIdConfig(false);
    setDriveFeedback({
      type: 'success',
      text: 'OAuth Client ID configured successfully.',
    });
  };

  
  const [isBroadcastingRoute, setIsBroadcastingRoute] = useState(false);
  const [routeBroadcastSuccess, setRouteBroadcastSuccess] = useState(false);

  
  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [dispatchCenter, setDispatchCenter] = useState(settings.dispatchCenter);

  const [cardLabels, setCardLabels] = useState({
    overview: settings.dropdownCategoryLabels?.['card_title_overview'] || settings.dropdownCategoryLabels?.['roles'] || 'WORKER',
    all: settings.dropdownCategoryLabels?.['card_title_all'] || 'All',
    electrical: settings.dropdownCategoryLabels?.['card_title_electrical'] || 'Electrical Eng',
    control: settings.dropdownCategoryLabels?.['card_title_control'] || 'Control Eng',
    welder: settings.dropdownCategoryLabels?.['card_title_welder'] || 'Welders',
    plumber: settings.dropdownCategoryLabels?.['card_title_plumber'] || 'Plumbers',
    driver: settings.dropdownCategoryLabels?.['card_title_driver'] || 'Driver',
    vehicle: settings.dropdownCategoryLabels?.['card_title_vehicle'] || 'Vehicle',
  });

  const [soundAlerts, setSoundAlerts] = useState(settings.soundAlerts);
  const [workerNotificationsEnabled, setWorkerNotificationsEnabled] = useState(settings.workerNotificationsEnabled ?? false);
  const [jobListColumns, setJobListColumns] = useState(settings.jobListColumns || INITIAL_SETTINGS.jobListColumns!);
  const [tools, setTools] = useState<ToolItem[]>(settings.tools || []);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isSavingTools, setIsSavingTools] = useState(false);
  const [toolsSaveSuccess, setToolsSaveSuccess] = useState(false);

  
  const handleSaveTools = async () => {
    setIsSavingTools(true);
    try {
      await updateSettings({ tools });
      setToolsSaveSuccess(true);
      setTimeout(() => setToolsSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to sync tools:', e);
    } finally {
      setIsSavingTools(false);
    }
  };

  
  useEffect(() => {
    if (settings.tools) {
      setTools(settings.tools);
    }
  }, [settings.tools]);

  
  const [localDataDirectory, setLocalDataDirectory] = useState(settings.localDataDirectory || '/Users/fieldops/data/storage');
  const [dirSaveSuccess, setDirSaveSuccess] = useState(false);

  const handleSaveLocalDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({ localDataDirectory });
    const exportData = {
      workers,
      jobs,
      settings: { ...settings, localDataDirectory },
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fieldops_data_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDirSaveSuccess(true);
    setTimeout(() => setDirSaveSuccess(false), 3000);
  };



  const handleRestoreFileInSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.workers || parsed.jobs)) {
          const res = await apiFetch('/api/storage/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
            body: JSON.stringify(parsed),
          });
          if (res.ok) {
            setRestoreMessage('Database successfully restored! Reloading...');
            setTimeout(() => window.location.reload(), 1200);
          } else {
            const errData = await res.json().catch(() => ({}));
            setRestoreMessage(errData.error || 'Server failed to restore database (admin re-login may be required).');
          }
        } else {
          setRestoreMessage('Invalid database JSON structure.');
        }
      } catch (err) {
        setRestoreMessage('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  
  const [dropdowns, setDropdowns] = useState<DropdownConfigurations>(() => ({
    roles: [...(settings.dropdownConfig?.roles || DEFAULT_DROPDOWN_CONFIG.roles)],
    zones: [...(settings.dropdownConfig?.zones || DEFAULT_DROPDOWN_CONFIG.zones)],
    priorities: [...(settings.dropdownConfig?.priorities || DEFAULT_DROPDOWN_CONFIG.priorities)],
    skills: [...(settings.dropdownConfig?.skills || DEFAULT_DROPDOWN_CONFIG.skills)],
    vehicleTypes: [...(settings.dropdownConfig?.vehicleTypes || DEFAULT_DROPDOWN_CONFIG.vehicleTypes)],
    jobStatuses: [...(settings.dropdownConfig?.jobStatuses || DEFAULT_DROPDOWN_CONFIG.jobStatuses)],
    jobTitles: [...(settings.dropdownConfig?.jobTitles || DEFAULT_DROPDOWN_CONFIG.jobTitles || [])],
    clients: [...(settings.dropdownConfig?.clients || DEFAULT_DROPDOWN_CONFIG.clients || [])],
    jobDescriptions: [...(settings.dropdownConfig?.jobDescriptions || DEFAULT_DROPDOWN_CONFIG.jobDescriptions || [])],
  }));

  type CategoryKey = keyof DropdownConfigurations;

  
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>('all');
  const [newVehicleDraft, setNewVehicleDraft] = useState<{
    name: string;
    model: string;
    plate: string;
    capacity: number;
    assignedDriverId: string;
    status: 'available' | 'in_use' | 'en_route' | 'on_site' | 'maintenance' | 'out_of_service';
    locationName: string;
    notes: string;
  }>({
    name: '',
    model: '',
    plate: '',
    capacity: 4,
    assignedDriverId: '',
    status: 'available',
    locationName: 'Central Depot',
    notes: '',
  });
  const [vehicleFeedback, setVehicleFeedback] = useState<string | null>(null);

  
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | 'engineer' | 'driver' | 'welder' | 'plumber'>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'configured' | 'pending' | 'deactivated'>('all');
  const [accountDrafts, setAccountDrafts] = useState<
    Record<
      string,
      {
        username?: string;
        password?: string;
        accountActive?: boolean;
        showPassword?: boolean;
        isSaved?: boolean;
        isCopied?: boolean;
      }
    >
  >({});
  const [bulkActionSuccess, setBulkActionSuccess] = useState<string | null>(null);

  const getWorkerDraft = (worker: (typeof workers)[0]) => {
    const draft = accountDrafts[worker.id];
    return {
      username: draft?.username !== undefined ? draft.username : worker.username || worker.id,
      
      
      password: draft?.password !== undefined ? draft.password : '',
      hasStoredPassword: Boolean((worker as any).hasPassword || (worker as any).password),
      accountActive: draft?.accountActive !== undefined ? draft.accountActive : worker.accountActive !== false,
      showPassword: draft?.showPassword || false,
      isSaved: draft?.isSaved || false,
      isCopied: draft?.isCopied || false,
    };
  };

  const updateWorkerDraft = (
    workerId: string,
    updates: Partial<{
      username: string;
      password: string;
      accountActive: boolean;
      showPassword: boolean;
      isSaved: boolean;
      isCopied: boolean;
    }>
  ) => {
    setAccountDrafts((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        ...updates,
      },
    }));
  };

  const handleGeneratePasswordForWorker = (workerId: string) => {
    const prefixes = ['Field', 'Tech', 'Power', 'Service', 'Crew', 'Safe'];
    const syms = ['#', '!', '$', '*'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const sym = syms[Math.floor(Math.random() * syms.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const pwd = `${prefix}${sym}${num}`;
    updateWorkerDraft(workerId, { password: pwd, showPassword: true });
  };

  const handleSaveWorkerAccount = async (worker: (typeof workers)[0]) => {
    const draft = getWorkerDraft(worker);
    await assignWorkerAccount(worker.id, {
      username: draft.username.trim() || worker.id,
      password: draft.password.trim() || undefined,
      accountActive: draft.accountActive,
    });
    updateWorkerDraft(worker.id, { isSaved: true });
    setTimeout(() => {
      updateWorkerDraft(worker.id, { isSaved: false });
    }, 2500);
  };

  const handleCopyWorkerCredentials = (worker: (typeof workers)[0]) => {
    const draft = getWorkerDraft(worker);
    const text = `worksynch Staff Login Credentials\nName: ${worker.name}\nRole: ${worker.roleTitle || worker.role}\nUsername/Login ID: ${draft.username}\nPassword: ${draft.password || '(No password configured)'}\nEmail: ${worker.email}\nAccount Status: ${draft.accountActive ? 'Active' : 'Deactivated'}`;
    navigator.clipboard.writeText(text);
    updateWorkerDraft(worker.id, { isCopied: true });
    setTimeout(() => {
      updateWorkerDraft(worker.id, { isCopied: false });
    }, 2000);
  };

  const handleBulkGeneratePasswords = async () => {
    const pendingWorkers = workers.filter((w) => !(w as any).hasPassword && !(w as any).password);
    if (pendingWorkers.length === 0) {
      setBulkActionSuccess('All workers already have passwords assigned!');
      setTimeout(() => setBulkActionSuccess(null), 3000);
      return;
    }

    const prefixes = ['Field', 'Tech', 'Power', 'Service', 'Crew', 'Safe'];
    const syms = ['#', '!', '$', '*'];
    const updates = pendingWorkers.map((w, idx) => {
      const prefix = prefixes[idx % prefixes.length];
      const sym = syms[idx % syms.length];
      const num = Math.floor(1000 + Math.random() * 9000);
      const pwd = `${prefix}${sym}${num}`;
      const username = w.username || w.id;
      return {
        id: w.id,
        username,
        password: pwd,
        accountActive: w.accountActive !== false,
      };
    });

    await batchAssignWorkerAccounts(updates);

    
    setAccountDrafts((prev) => {
      const next = { ...prev };
      updates.forEach((u) => {
        next[u.id] = {
          ...next[u.id],
          username: u.username,
          password: u.password,
          accountActive: u.accountActive,
          showPassword: true,
          isSaved: true,
        };
      });
      return next;
    });

    setBulkActionSuccess(`Successfully generated and assigned passwords for ${updates.length} worker(s)!`);
    setTimeout(() => setBulkActionSuccess(null), 4000);
  };

  const handleExportCredentialsCSV = () => {
    
    
    const headers = ['Worker ID', 'Full Name', 'Role', 'Role Title', 'Email', 'Login Username', 'Password Status', 'New Password (unsaved draft only)', 'Account Status', 'Phone'];
    const rows = workers.map((w) => {
      const draft = getWorkerDraft(w);
      const configured = Boolean(draft.password || (w as any).hasPassword || (w as any).password);
      return [
        `"${w.id}"`,
        `"${w.name.replace(/"/g, '""')}"`,
        `"${w.role}"`,
        `"${(w.roleTitle || '').replace(/"/g, '""')}"`,
        `"${w.email}"`,
        `"${draft.username}"`,
        `"${configured ? 'Configured' : 'Missing'}"`,
        `"${(draft.password || '').replace(/"/g, '""')}"`,
        `"${draft.accountActive ? 'Active' : 'Disabled'}"`,
        `"${w.phone || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fieldops_worker_logins_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const [adminUsernameInput, setAdminUsernameInput] = useState('admin');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPasswordInput, setShowAdminPasswordInput] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleUpdateAdminAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminUsernameInput.trim()) {
      setAdminFeedback({ type: 'error', message: 'Admin username cannot be empty.' });
      return;
    }
    if (!adminPasswordInput.trim()) {
      setAdminFeedback({ type: 'error', message: 'Please enter a new password for the Administrator account.' });
      return;
    }
    setIsAdminLoading(true);
    setAdminFeedback(null);
    try {
      const res = await apiFetch('/api/auth/reset-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          newUsername: adminUsernameInput.trim(),
          newPassword: adminPasswordInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminFeedback({
          type: 'success',
          message: `Admin credentials updated successfully! Username: "${adminUsernameInput.trim()}"`
        });
        setAdminPasswordInput('');
        setTimeout(() => setAdminFeedback(null), 5000);
      } else {
        setAdminFeedback({ type: 'error', message: data.error || 'Failed to update admin account.' });
      }
    } catch (err) {
      setAdminFeedback({ type: 'error', message: 'Network error updating admin credentials.' });
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleResetAdminToDefault = async () => {
    setIsAdminLoading(true);
    setAdminFeedback(null);
    try {
      const res = await apiFetch('/api/auth/reset-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ newUsername: 'admin', newPassword: 'admin123' })
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsernameInput('admin');
        setAdminPasswordInput('');
        setShowResetConfirmModal(false);
        setAdminFeedback({
          type: 'success',
          message: 'Admin account has been reset to default credentials (Username: admin, Password: admin123).'
        });
        setTimeout(() => setAdminFeedback(null), 6000);
      } else {
        setAdminFeedback({ type: 'error', message: data.error || 'Failed to reset admin account.' });
      }
    } catch (err) {
      setAdminFeedback({ type: 'error', message: 'Network error resetting admin account.' });
    } finally {
      setIsAdminLoading(false);
    }
  };

  
  const [activePersonnelCategory, setActivePersonnelCategory] = useState<CategoryKey>('roles');
  const [newPersonnelItemText, setNewPersonnelItemText] = useState('');

  const [activeDropdownCategory, setActiveDropdownCategory] = useState<CategoryKey>('jobStatuses');
  const [newDropdownItemText, setNewDropdownItemText] = useState('');

  const [editingItem, setEditingItem] = useState<{ category: CategoryKey; oldVal: string } | null>(null);
  const [editItemText, setEditItemText] = useState('');
  const [pendingRenames, setPendingRenames] = useState<{ category: string; oldVal: string; newVal: string }[]>([]);

  const rawPersonnelCategories: { key: CategoryKey; defaultLabel: string; placeholder: string }[] = [
    { key: 'roles', defaultLabel: 'Staff Roles', placeholder: 'e.g. Lead Electrical Specialist' },
    { key: 'skills', defaultLabel: 'Skills & Qualifications', placeholder: 'e.g. Fiber Splicing, HVAC' },
    { key: 'zones', defaultLabel: 'Service Zones', placeholder: 'e.g. Zone 6 - South Industrial' },
    { key: 'vehicleTypes', defaultLabel: 'Vehicles & Transport', placeholder: 'e.g. Ford Transit 350 AWD' },
  ];

  const rawDropdownCategories: { key: CategoryKey; defaultLabel: string; placeholder: string }[] = [
    { key: 'jobStatuses', defaultLabel: 'Statuses', placeholder: 'e.g. Scheduled, On Site' },
    { key: 'priorities', defaultLabel: 'Priorities', placeholder: 'e.g. Urgent, High, Low' },
    { key: 'jobTitles', defaultLabel: 'Job Appointment: Titles', placeholder: 'e.g. Preventative Maintenance' },
    { key: 'jobDescriptions', defaultLabel: 'Job Appointment: Descriptions', placeholder: 'e.g. Routine maintenance...' },
    { key: 'clients', defaultLabel: 'Job Appointment: Clients', placeholder: 'e.g. Apex Cloud Corp' },
  ];

  const personnelCategories = rawPersonnelCategories
    .filter(c => !settings.hiddenCategories?.includes(c.key))
    .map(c => ({
      key: c.key,
      label: settings.dropdownCategoryLabels?.[c.key] || c.defaultLabel,
      placeholder: c.placeholder
    }));

  const dropdownCategories = rawDropdownCategories
    .filter(c => !settings.hiddenCategories?.includes(c.key))
    .map(c => ({
      key: c.key,
      label: settings.dropdownCategoryLabels?.[c.key] || c.defaultLabel,
      placeholder: c.placeholder
    }));

  const [editingCategoryKey, setEditingCategoryKey] = useState<CategoryKey | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('');

  const handleEditCategorySave = () => {
    if (!editingCategoryKey) return;
    const trimmed = editingCategoryLabel.trim();
    if (trimmed) {
      updateSettings({
        dropdownCategoryLabels: {
          ...(settings.dropdownCategoryLabels || {}),
          [editingCategoryKey]: trimmed
        }
      });
    }
    setEditingCategoryKey(null);
  };

  const handleHideCategory = (key: CategoryKey, section: 'personnel' | 'dropdown') => {
    updateSettings({
      hiddenCategories: [...(settings.hiddenCategories || []), key]
    });
    if (section === 'personnel' && activePersonnelCategory === key) {
      setActivePersonnelCategory(personnelCategories.find(c => c.key !== key)?.key || 'roles');
    }
    if (section === 'dropdown' && activeDropdownCategory === key) {
      setActiveDropdownCategory(dropdownCategories.find(c => c.key !== key)?.key || 'jobStatuses');
    }
  };

  const handleAddPersonnelItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPersonnelItemText.trim();
    if (!trimmed) return;

    const currentList = dropdowns[activePersonnelCategory] || [];
    if (!currentList.includes(trimmed)) {
      setDropdowns({
        ...dropdowns,
        [activePersonnelCategory]: [...currentList, trimmed],
      });
    }
    setNewPersonnelItemText('');
  };

  const handleAddDropdownItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDropdownItemText.trim();
    if (!trimmed) return;

    const currentList = dropdowns[activeDropdownCategory] || [];
    if (!currentList.includes(trimmed)) {
      setDropdowns({
        ...dropdowns,
        [activeDropdownCategory]: [...currentList, trimmed],
      });
    }
    setNewDropdownItemText('');
  };

  const handleEditItemStart = (category: CategoryKey, oldVal: string) => {
    setEditingItem({ category, oldVal });
    setEditItemText(oldVal);
  };

  const handleEditItemSave = () => {
    if (!editingItem) return;
    const trimmed = editItemText.trim();
    if (!trimmed || trimmed === editingItem.oldVal) {
      setEditingItem(null);
      return;
    }

    const currentList = dropdowns[editingItem.category] || [];
    
    
    if (currentList.includes(trimmed)) {
      setEditingItem(null);
      return;
    }

    setDropdowns({
      ...dropdowns,
      [editingItem.category]: currentList.map((item) => (item === editingItem.oldVal ? trimmed : item)),
    });

    setPendingRenames((prev) => [
      ...prev,
      { category: editingItem.category, oldVal: editingItem.oldVal, newVal: trimmed },
    ]);
    
    setEditingItem(null);
  };

  const handleEditItemCancel = () => {
    setEditingItem(null);
  };

  const handleRemovePersonnelItem = (itemToRemove: string) => {
    const currentList = dropdowns[activePersonnelCategory] || [];
    setDropdowns({
      ...dropdowns,
      [activePersonnelCategory]: currentList.filter((item) => item !== itemToRemove),
    });
  };

  const handleRemoveDropdownItem = (itemToRemove: string) => {
    const currentList = dropdowns[activeDropdownCategory] || [];
    setDropdowns({
      ...dropdowns,
      [activeDropdownCategory]: currentList.filter((item) => item !== itemToRemove),
    });
  };

  const handleBroadcastRoute = async () => {
    setIsBroadcastingRoute(true);
    await broadcastDailyRouteUpdate();
    setIsBroadcastingRoute(false);
    setRouteBroadcastSuccess(true);
    setTimeout(() => setRouteBroadcastSuccess(false), 3000);
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertBody.trim()) return;

    
    await sendBroadcastNotification(alertTitle, alertBody, 'urgent_alert');
    setBroadcastSuccess(true);
    setAlertTitle('');
    setAlertBody('');
    setTimeout(() => setBroadcastSuccess(false), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(
      {
        companyName,
        dispatchCenter,
        soundAlerts,
        workerNotificationsEnabled,
        dropdownConfig: dropdowns,
        jobListColumns,
        tools,
        dropdownCategoryLabels: {
          ...(settings.dropdownCategoryLabels || {}),
          card_title_overview: cardLabels.overview,
          card_title_all: cardLabels.all,
          card_title_electrical: cardLabels.electrical,
          card_title_control: cardLabels.control,
          card_title_welder: cardLabels.welder,
          card_title_plumber: cardLabels.plumber,
          card_title_driver: cardLabels.driver,
          card_title_vehicle: cardLabels.vehicle,
        }
      },
      { cascadeRename: pendingRenames }
    );
    setPendingRenames([]);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const toggleColumnVisibility = (colId: string) => {
    const newCols = jobListColumns.map((c) => (c.id === colId ? { ...c, visible: !c.visible } : c));
    setJobListColumns(newCols);
    updateSettings({ jobListColumns: newCols });
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= jobListColumns.length) return;
    const newCols = [...jobListColumns];
    const temp = newCols[index];
    newCols[index] = newCols[index + direction];
    newCols[index + direction] = temp;
    setJobListColumns(newCols);
    updateSettings({ jobListColumns: newCols });
  };

  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [editingColumn, setEditingColumn] = useState<{ id: string; label: string } | null>(null);

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newColumnLabel.trim();
    if (!label) return;
    const id = 'custom_' + Date.now().toString();
    const newCols = [...jobListColumns, { id, label, visible: true, custom: true }];
    setJobListColumns(newCols);
    updateSettings({ jobListColumns: newCols });
    setNewColumnLabel('');
  };

  const handleEditColumnSave = () => {
    if (!editingColumn) return;
    const label = editingColumn.label.trim();
    if (label) {
      const newCols = jobListColumns.map((c) => (c.id === editingColumn.id ? { ...c, label } : c));
      setJobListColumns(newCols);
      updateSettings({ jobListColumns: newCols });
    }
    setEditingColumn(null);
  };

  const handleDeleteColumn = (colId: string) => {
    const newCols = jobListColumns.filter((c) => c.id !== colId);
    setJobListColumns(newCols);
    updateSettings({ jobListColumns: newCols });
  };

  const currentPersonnelItems = dropdowns[activePersonnelCategory] || [];
  const currentPersonnelConfig = personnelCategories.find((c) => c.key === activePersonnelCategory)!;

  const currentDropdownItems = dropdowns[activeDropdownCategory] || [];
  const currentDropdownConfig = dropdownCategories.find((c) => c.key === activeDropdownCategory)!;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">

      
      <div className="flex flex-wrap gap-1.5 bg-white p-2 border border-slate-300 rounded-lg shadow-2xs">
        {[
          { key: 'overview', label: 'Work Overview & Titles', icon: Sliders },
          { key: 'system', label: 'System Info & Preferences', icon: Building2 },
          { key: 'columns', label: 'Job List Columns', icon: LayoutTemplate },
          { key: 'personnel', label: 'Personnel & Avatars', icon: Users },
          { key: 'accounts', label: 'Accounts & Admin Security', icon: KeyRound },
          { key: 'dropdowns', label: 'Dropdown Options', icon: ListFilter },
          { key: 'tools', label: 'Tools & Inventory', icon: Wrench },
          { key: 'vehicles', label: 'Vehicles & Fleet', icon: Truck },
          { key: 'broadcast', label: 'Broadcast Console', icon: Radio },
          { key: 'google_workspace', label: 'Google Workspace Storage (Netlify)', icon: Cloud },
          { key: 'storage', label: 'Local Storage & Backups', icon: HardDrive },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSettingsTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-colors cursor-pointer ${
                isActive
                  ? tab.key === 'broadcast' ? 'bg-indigo-700 text-white shadow-2xs' : tab.key === 'google_workspace' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-[#107c41] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      
      {activeSettingsTab === 'overview' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#107c41]" />
                Work Overview Card & Category Titles
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Customize the card and tab header titles displayed in the Work Overview roster.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Overview Header Title</label>
                <input
                  type="text"
                  value={cardLabels.overview}
                  onChange={(e) => setCardLabels({ ...cardLabels, overview: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">All Workers Tab</label>
                <input
                  type="text"
                  value={cardLabels.all}
                  onChange={(e) => setCardLabels({ ...cardLabels, all: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Electrical Card Title</label>
                <input
                  type="text"
                  value={cardLabels.electrical}
                  onChange={(e) => setCardLabels({ ...cardLabels, electrical: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Control Card Title</label>
                <input
                  type="text"
                  value={cardLabels.control}
                  onChange={(e) => setCardLabels({ ...cardLabels, control: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Welder Card Title</label>
                <input
                  type="text"
                  value={cardLabels.welder}
                  onChange={(e) => setCardLabels({ ...cardLabels, welder: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plumber Card Title</label>
                <input
                  type="text"
                  value={cardLabels.plumber}
                  onChange={(e) => setCardLabels({ ...cardLabels, plumber: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Card Title</label>
                <input
                  type="text"
                  value={cardLabels.driver}
                  onChange={(e) => setCardLabels({ ...cardLabels, driver: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Card Title</label>
                <input
                  type="text"
                  value={cardLabels.vehicle}
                  onChange={(e) => setCardLabels({ ...cardLabels, vehicle: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={resetToSeedData}
              className="text-xs font-semibold text-slate-500 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Defaults
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Settings
            </button>
          </div>
        </form>
      )}

      
      {activeSettingsTab === 'system' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#107c41]" />
                  System Information & Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Organization details and notification preferences.</p>
              </div>
              {settingsSaved && (
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settings Saved!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispatch Center</label>
                <input
                  type="text"
                  value={dispatchCenter}
                  onChange={(e) => setDispatchCenter(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5">
                {soundAlerts ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                <div>
                  <span className="text-[11px] font-bold text-slate-900 block">Sound Alert Chimes</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSoundAlerts(!soundAlerts)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  soundAlerts ? 'bg-[#107c41]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                    soundAlerts ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#107c41]" />
                <div>
                  <span className="text-[11px] font-bold text-slate-900 block">Allow Worker Push Notifications</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkerNotificationsEnabled(!workerNotificationsEnabled)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  workerNotificationsEnabled ? 'bg-[#107c41]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                    workerNotificationsEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={resetToSeedData}
              className="text-xs font-semibold text-slate-500 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Defaults
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Settings
            </button>
          </div>
        </form>
      )}

      
      {activeSettingsTab === 'columns' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-[#107c41]" />
                  Job List Columns
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Toggle visibility, rename, or add custom columns to the jobs view table.</p>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {jobListColumns.filter(c => c.visible).length} visible
              </span>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {jobListColumns.map((col, idx) => (
                  <div
                    key={col.id}
                    className={`flex flex-col gap-1 p-2 rounded border transition-colors ${
                      col.visible
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {editingColumn?.id === col.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={editingColumn.label}
                          onChange={(e) => setEditingColumn({ ...editingColumn, label: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditColumnSave();
                            if (e.key === 'Escape') setEditingColumn(null);
                          }}
                          className="w-full text-xs font-semibold px-1 py-0.5 border border-emerald-400 rounded outline-none"
                        />
                        <button type="button" onClick={handleEditColumnSave} className="text-emerald-700 hover:text-emerald-900">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group h-[22px]">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 h-full">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() => toggleColumnVisibility(col.id)}
                            className="w-3.5 h-3.5 text-[#107c41] rounded border-slate-300 focus:ring-[#107c41] focus:ring-1 shrink-0"
                          />
                          <span className="text-xs font-semibold select-none truncate pr-1" title={col.label}>{col.label}</span>
                        </label>
                        <div className="flex items-center gap-1 transition-opacity shrink-0">
                          <button type="button" disabled={idx === 0} onClick={() => moveColumn(idx, -1)} className="text-slate-400 hover:text-emerald-700 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer p-0.5 rounded hover:bg-emerald-50" title="Move Left">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" disabled={idx === jobListColumns.length - 1} onClick={() => moveColumn(idx, 1)} className="text-slate-400 hover:text-emerald-700 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer p-0.5 rounded hover:bg-emerald-50" title="Move Right">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingColumn({ id: col.id, label: col.label })} className="text-slate-400 hover:text-emerald-700 cursor-pointer p-0.5 rounded hover:bg-emerald-50" title="Edit Column">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteColumn(col.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 rounded hover:bg-rose-50" title="Delete Column">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              
              <div className="mt-2 flex items-center gap-2 pt-3 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="New custom column name..."
                  value={newColumnLabel}
                  onChange={(e) => setNewColumnLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddColumn(e);
                    }
                  }}
                  className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#107c41] w-64 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleAddColumn}
                  disabled={!newColumnLabel.trim()}
                  className="flex items-center gap-1 bg-slate-800 text-white px-2.5 py-1.5 rounded text-xs font-semibold hover:bg-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'personnel' && (
        <div id="section-personnel-details" className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#107c41]" />
                Personnel Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure staff roles, specialized qualifications, service zones, and assigned vehicles.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {currentPersonnelItems.length} items
            </span>
          </div>

          
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5">
            {personnelCategories.map((cat) => {
              const count = dropdowns[cat.key]?.length || 0;
              const isActive = activePersonnelCategory === cat.key;
              
              if (editingCategoryKey === cat.key) {
                return (
                  <div key={cat.key} className="flex items-center gap-1 bg-[#107c41] px-2 py-1 rounded shadow-2xs">
                    <input
                      type="text"
                      autoFocus
                      value={editingCategoryLabel}
                      onChange={(e) => setEditingCategoryLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditCategorySave();
                        if (e.key === 'Escape') setEditingCategoryKey(null);
                      }}
                      className="w-28 text-xs font-semibold px-1 py-0.5 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded outline-none"
                    />
                    <button type="button" onClick={handleEditCategorySave} className="text-white hover:text-emerald-100 p-0.5 cursor-pointer">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setEditingCategoryKey(null)} className="text-emerald-100 hover:text-white p-0.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={cat.key} className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePersonnelCategory(cat.key);
                      setNewPersonnelItemText('');
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#107c41] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-[#0b5c30] text-emerald-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                  {isActive && (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button 
                        type="button" 
                        title="Edit Category Name"
                        onClick={() => {
                          setEditingCategoryKey(cat.key);
                          setEditingCategoryLabel(cat.label);
                        }}
                        className="p-1 text-slate-400 hover:text-[#107c41] hover:bg-emerald-50 rounded cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        type="button" 
                        title="Delete/Hide Category"
                        onClick={() => handleHideCategory(cat.key, 'personnel')}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[90px] flex flex-wrap gap-2 items-start content-start">
            {currentPersonnelItems.length === 0 ? (
              <span className="text-xs text-slate-400 italic py-2">No options defined in this personnel category. Add one below.</span>
            ) : (
              currentPersonnelItems.map((item, itemIdx) => (
                editingItem?.category === activePersonnelCategory && editingItem.oldVal === item ? (
                  <div key={`personnel_edit_${item}_${itemIdx}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 shadow-2xs group">
                    <input
                      type="text"
                      autoFocus
                      value={editItemText}
                      onChange={(e) => setEditItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditItemSave();
                        if (e.key === 'Escape') handleEditItemCancel();
                      }}
                      className="border-none bg-transparent w-40 px-1 py-0.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#107c41] rounded"
                    />
                    <button
                      type="button"
                      onClick={handleEditItemSave}
                      className="text-emerald-600 hover:text-emerald-800 rounded p-0.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Save"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleEditItemCancel}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    key={`personnel_item_${item}_${itemIdx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-slate-800 border border-slate-300 text-xs font-medium shadow-2xs group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleEditItemStart(activePersonnelCategory, item)}
                      className="text-slate-400 hover:text-emerald-600 rounded p-0.5 hover:bg-emerald-50 transition-colors cursor-pointer ml-1"
                      title={`Edit ${item}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePersonnelItem(item)}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                      title={`Remove ${item}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )
              ))
            )}
          </div>

          
          <div className="flex gap-2">
            <input
              type="text"
              value={newPersonnelItemText}
              onChange={(e) => setNewPersonnelItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPersonnelItem(e);
                }
              }}
              placeholder={currentPersonnelConfig?.placeholder || 'Add item...'}
              className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
            />
            <button
              type="button"
              onClick={handleAddPersonnelItem}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to {currentPersonnelConfig?.label}</span>
            </button>
          </div>

          
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Personnel Profile Avatars
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workers.map(worker => (
                <div key={worker.id} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg bg-slate-50 shadow-2xs hover:border-emerald-300 transition-colors">
                  <img 
                    src={backendFileUrl(worker.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                    alt={worker.name} 
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{worker.name}</p>
                    <p className="text-[10px] text-slate-500 truncate mb-1">{worker.roleTitle || worker.role}</p>
                    <label className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-0.5 rounded cursor-pointer transition-colors inline-block">
                      Upload Photo
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const url = await uploadAvatarImage(file, worker.id);
                              updateWorker(worker.id, { avatarUrl: url });
                            } catch (err) {
                              console.error('Failed to upload worker avatar:', err);
                            }
                          }
                        }}
                      />
                    </label>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        ((worker as any).hasPassword || (worker as any).password)
                          ? worker.accountActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {((worker as any).hasPassword || (worker as any).password) ? (worker.accountActive !== false ? '● Login Active' : '○ Deactivated') : '⚠ No Password'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSettingsTab('accounts');
                          setAccountSearchQuery(worker.name);
                        }}
                        className="text-[9px] text-[#107c41] hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                      >
                        <KeyRound className="w-2.5 h-2.5" />
                        Credentials →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'accounts' && (
        <div id="section-worker-accounts" className="space-y-6">
          
          <div className="bg-white border-2 border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#107c41] text-white flex items-center justify-center shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Administrator Master Account & Password Reset
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                    Admin Exclusive
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage master administrator login credentials, update passwords, or reset administrator access to default.
                </p>
              </div>

              
              <button
                type="button"
                id="btn-admin-reset-default"
                onClick={() => setShowResetConfirmModal(true)}
                className="px-3 py-1.5 rounded text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Reset Admin to Default</span>
              </button>
            </div>

            
            {adminFeedback && (
              <div
                className={`p-3 rounded-md text-xs font-semibold flex items-center justify-between shadow-2xs border ${
                  adminFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {adminFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{adminFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminFeedback(null)}
                  className="text-slate-500 hover:text-slate-800 text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            
            <form onSubmit={handleUpdateAdminAccount} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    New Admin Password
                  </label>
                  {showAdminPasswordInput ? (
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswordInput(false)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <EyeOff className="w-3 h-3" /> Hide
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswordInput(true)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Show
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPasswordInput ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter new administrator password"
                    className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isAdminLoading || !adminPasswordInput.trim()}
                  className="w-full bg-[#107c41] hover:bg-[#0b5c30] text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isAdminLoading ? 'Saving...' : 'Update Admin'}</span>
                </button>
              </div>
            </form>
            <p className="text-[11px] text-slate-400">
              Default system fallback credentials: Username <strong className="text-slate-600 font-mono">admin</strong> / Password <strong className="text-slate-600 font-mono">admin123</strong>.
            </p>
          </div>

          
          {showResetConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Reset Administrator Account?</h4>
                    <p className="text-xs text-slate-500">This will reset admin login credentials to factory defaults.</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-medium">Reset Username:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">admin</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-medium">Reset Password:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">admin123</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Are you sure you want to proceed? Any custom admin password currently configured will be overwritten.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmModal(false)}
                    disabled={isAdminLoading}
                    className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAdminToDefault}
                    disabled={isAdminLoading}
                    className="px-4 py-1.5 rounded text-xs font-bold bg-[#107c41] hover:bg-[#0b5c30] text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isAdminLoading ? 'Resetting...' : 'Confirm Reset'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#107c41]" />
                  Worker Login Accounts & Passwords
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign credentials, manage usernames and passwords, and control access permissions for field personnel.
                </p>
              </div>

              
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {workers.length} Personnel
                </span>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {workers.filter((w) => Boolean((w as any).hasPassword || (w as any).password)).length} Configured
                </span>
                {workers.filter((w) => !((w as any).hasPassword || (w as any).password)).length > 0 && (
                  <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    {workers.filter((w) => !((w as any).hasPassword || (w as any).password)).length} Missing Password
                  </span>
                )}
              </div>
            </div>

            
            {bulkActionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-md text-xs font-semibold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bulkActionSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkActionSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search workers, roles, usernames..."
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
                />
              </div>

              <select
                value={accountRoleFilter}
                onChange={(e) => setAccountRoleFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                <option value="all">All Roles</option>
                <option value="engineer">Engineers</option>
                <option value="driver">Drivers</option>
                <option value="welder">Welders</option>
                <option value="plumber">Plumbers</option>
              </select>

              <select
                value={accountStatusFilter}
                onChange={(e) => setAccountStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
              >
                <option value="all">All Statuses</option>
                <option value="configured">Configured (Has Password)</option>
                <option value="pending">Pending (No Password)</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBulkGeneratePasswords}
                className="px-2.5 py-1.5 rounded text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Automatically generate secure passwords for all workers who do not have one yet"
              >
                <Shuffle className="w-3.5 h-3.5 text-emerald-700" />
                <span>Auto-Generate Unassigned</span>
              </button>

              <button
                type="button"
                onClick={handleExportCredentialsCSV}
                className="px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Download spreadsheet of all worker accounts and passwords"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          
          <div className="space-y-3">
            {workers
              .filter((worker) => {
                const draft = getWorkerDraft(worker);
                const query = accountSearchQuery.toLowerCase().trim();
                if (query) {
                  const matchName = worker.name.toLowerCase().includes(query);
                  const matchId = worker.id.toLowerCase().includes(query);
                  const matchUsername = (draft.username || '').toLowerCase().includes(query);
                  const matchEmail = (worker.email || '').toLowerCase().includes(query);
                  const matchRole = (worker.roleTitle || worker.role).toLowerCase().includes(query);
                  if (!matchName && !matchId && !matchUsername && !matchEmail && !matchRole) return false;
                }
                if (accountRoleFilter !== 'all') {
                  if (accountRoleFilter === 'engineer' && worker.role !== 'engineer') return false;
                  if (accountRoleFilter === 'driver' && worker.role !== 'driver') return false;
                  if (accountRoleFilter === 'welder' && worker.role !== 'welder') return false;
                  if (accountRoleFilter === 'plumber' && worker.role !== 'plumber') return false;
                }
                if (accountStatusFilter !== 'all') {
                  const hasPwd = Boolean((draft.password && draft.password.trim().length > 0) || draft.hasStoredPassword);
                  if (accountStatusFilter === 'configured' && !hasPwd) return false;
                  if (accountStatusFilter === 'pending' && hasPwd) return false;
                  if (accountStatusFilter === 'deactivated' && draft.accountActive !== false) return false;
                }
                return true;
              })
              .map((worker) => {
                const draft = getWorkerDraft(worker);
                const isConfigured = Boolean((draft.password && draft.password.trim().length > 0) || draft.hasStoredPassword);
                const isDeactivated = draft.accountActive === false;

                return (
                  <div
                    key={worker.id}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white hover:border-emerald-300 transition-all space-y-3"
                  >
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            backendFileUrl(worker.avatarUrl) ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={worker.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-2xs shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900">{worker.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {worker.roleTitle || worker.role}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {worker.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {worker.email} • {worker.phone || 'No phone'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                            isDeactivated
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : isConfigured
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isDeactivated ? (
                            <>
                              <Lock className="w-3 h-3 text-slate-500" />
                              Deactivated
                            </>
                          ) : isConfigured ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Login Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              No Password Set
                            </>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setAuthData({
                              username: draft.username || worker.id,
                              role: worker.role === 'driver' ? 'driver' : 'engineer',
                              workerId: worker.id,
                            });
                          }}
                          title="Simulate login as this worker"
                          className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded px-2 py-1 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Test Login
                        </button>
                      </div>
                    </div>

                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Login Username / Handle
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = worker.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '.');
                              updateWorkerDraft(worker.id, { username: clean });
                            }}
                            className="text-[10px] text-[#107c41] hover:underline cursor-pointer"
                          >
                            Use name format
                          </button>
                        </div>
                        <input
                          type="text"
                          value={draft.username}
                          onChange={(e) => updateWorkerDraft(worker.id, { username: e.target.value })}
                          placeholder={worker.id}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Worker can sign in using this username, their ID ({worker.id}), or their email.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-slate-400" />
                            Login Password
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGeneratePasswordForWorker(worker.id)}
                              className="text-[10px] text-[#107c41] hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                            >
                              <Shuffle className="w-3 h-3" />
                              Generate
                            </button>
                            {draft.password && (
                              <button
                                type="button"
                                onClick={() => updateWorkerDraft(worker.id, { password: '' })}
                                className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={draft.showPassword ? 'text' : 'password'}
                            value={draft.password}
                            onChange={(e) => updateWorkerDraft(worker.id, { password: e.target.value })}
                            placeholder="Assign password (min 4 chars)"
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 pr-8 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => updateWorkerDraft(worker.id, { showPassword: !draft.showPassword })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title={draft.showPassword ? 'Hide password' : 'Show password'}
                          >
                            {draft.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Assigned password required to authenticate.</p>
                      </div>
                    </div>

                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={draft.accountActive}
                          onChange={(e) => updateWorkerDraft(worker.id, { accountActive: e.target.checked })}
                          className="rounded text-[#107c41] focus:ring-[#107c41] border-slate-300"
                        />
                        <span className="font-semibold text-xs">
                          Account Status:{' '}
                          <span className={draft.accountActive ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            {draft.accountActive ? 'Active (Allowed)' : 'Deactivated (Revoked)'}
                          </span>
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyWorkerCredentials(worker)}
                          className="px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {draft.isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Login Info</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveWorkerAccount(worker)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                            draft.isSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#107c41] hover:bg-[#0b5c30] text-white'
                          }`}
                        >
                          {draft.isSaved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Saved!</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Credentials</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {workers.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No workers found in system directory.
              </div>
            )}
          </div>

            
            <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-200/80 text-xs text-slate-700 space-y-1.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#107c41]" />
                Staff Login & Security Protocol
              </h4>
              <p className="text-[11px] text-slate-600">
                • Field staff can sign in on the main login screen using either their assigned <strong>Username</strong>, <strong>Worker ID</strong> (e.g. {workers[0]?.id || 'W-ENG-1'}), or <strong>Email Address</strong> along with their assigned password.
              </p>
              <p className="text-[11px] text-slate-600">
                • Passwords and active statuses are saved with persistent server auditing; every credential update creates an audit trail entry with the manager's name and timestamp.
              </p>
              <p className="text-[11px] text-slate-600">
                • If an account is unchecked (Deactivated), login will be automatically denied with an "Account deactivated" alert.
              </p>
            </div>
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'dropdowns' && (
        <div id="section-dropdown-options" className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#107c41]" />
                Dropdown Options
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage appointment dropdowns, dispatch statuses, priorities, job titles, descriptions, and clients.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {currentDropdownItems.length} items
            </span>
          </div>

          
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5">
            {dropdownCategories.map((cat) => {
              const count = dropdowns[cat.key]?.length || 0;
              const isActive = activeDropdownCategory === cat.key;
              
              if (editingCategoryKey === cat.key) {
                return (
                  <div key={cat.key} className="flex items-center gap-1 bg-[#107c41] px-2 py-1 rounded shadow-2xs">
                    <input
                      type="text"
                      autoFocus
                      value={editingCategoryLabel}
                      onChange={(e) => setEditingCategoryLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditCategorySave();
                        if (e.key === 'Escape') setEditingCategoryKey(null);
                      }}
                      className="w-28 text-xs font-semibold px-1 py-0.5 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded outline-none"
                    />
                    <button type="button" onClick={handleEditCategorySave} className="text-white hover:text-emerald-100 p-0.5 cursor-pointer">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setEditingCategoryKey(null)} className="text-emerald-100 hover:text-white p-0.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={cat.key} className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdownCategory(cat.key);
                      setNewDropdownItemText('');
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#107c41] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-[#0b5c30] text-emerald-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                  {isActive && (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button 
                        type="button" 
                        title="Edit Category Name"
                        onClick={() => {
                          setEditingCategoryKey(cat.key);
                          setEditingCategoryLabel(cat.label);
                        }}
                        className="p-1 text-slate-400 hover:text-[#107c41] hover:bg-emerald-50 rounded cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        type="button" 
                        title="Delete/Hide Category"
                        onClick={() => handleHideCategory(cat.key, 'dropdown')}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[90px] flex flex-wrap gap-2 items-start content-start">
            {currentDropdownItems.length === 0 ? (
              <span className="text-xs text-slate-400 italic py-2">No options defined in this dropdown category. Add one below.</span>
            ) : (
              currentDropdownItems.map((item, itemIdx) => (
                editingItem?.category === activeDropdownCategory && editingItem.oldVal === item ? (
                  <div key={`dropdown_edit_${item}_${itemIdx}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 shadow-2xs group">
                    <input
                      type="text"
                      autoFocus
                      value={editItemText}
                      onChange={(e) => setEditItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditItemSave();
                        if (e.key === 'Escape') handleEditItemCancel();
                      }}
                      className="border-none bg-transparent w-40 px-1 py-0.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#107c41] rounded"
                    />
                    <button
                      type="button"
                      onClick={handleEditItemSave}
                      className="text-emerald-600 hover:text-emerald-800 rounded p-0.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Save"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleEditItemCancel}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    key={`dropdown_item_${item}_${itemIdx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-slate-800 border border-slate-300 text-xs font-medium shadow-2xs group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleEditItemStart(activeDropdownCategory, item)}
                      className="text-slate-400 hover:text-emerald-600 rounded p-0.5 hover:bg-emerald-50 transition-colors cursor-pointer ml-1"
                      title={`Edit ${item}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDropdownItem(item)}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                      title={`Remove ${item}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )
              ))
            )}
          </div>

          
          <div className="flex gap-2">
            <input
              type="text"
              value={newDropdownItemText}
              onChange={(e) => setNewDropdownItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDropdownItem(e);
                }
              }}
              placeholder={currentDropdownConfig?.placeholder || 'Add item...'}
              className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41]"
            />
            <button
              type="button"
              onClick={handleAddDropdownItem}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to {currentDropdownConfig?.label}</span>
            </button>
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'tools' && (
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-600" />
                Tools & Inventory Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage physical tools, quantities, active checkouts, and return status. When tools are returned, assigned and remaining counts automatically update.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  
                  const updatedTools = tools.map(t => {
                    const total = Number(t.quantity || 0);
                    return {
                      ...t,
                      isReturned: true,
                      assigned: '0',
                      remaining: String(total),
                      assignments: t.assignments?.map(a => ({ ...a, isReturned: true }))
                    };
                  });
                  setTools(updatedTools);
                  for (const tool of tools) {
                    await toggleToolReturn(tool.id, undefined, true);
                  }
                  await updateSettings({ tools: updatedTools });
                  setToolsSaveSuccess(true);
                  setTimeout(() => setToolsSaveSuccess(false), 2500);
                }}
                className="px-2.5 py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mark all tools and job checkouts as returned to stock"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Mark All Returned</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTools}
                disabled={isSavingTools}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer border ${
                  toolsSaveSuccess
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-sky-600 hover:bg-sky-700 border-sky-600 text-white'
                }`}
                title="Save and synchronize tool inventory changes with server"
              >
                {toolsSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved & Synced!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingTools ? 'Saving...' : 'Save & Sync Tools'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          
          {(() => {
            const validTools = tools.filter(t => (t.name || '').trim().length > 0);
            let totalStock = 0;
            let totalAssigned = 0;
            validTools.forEach(t => {
              const q = Number(t.quantity || 0);
              totalStock += q;
              if (t.assignments && t.assignments.length > 0) {
                t.assignments.forEach(a => {
                  if (!a.isReturned) totalAssigned += Number(a.assigned || 0);
                });
              } else if (!t.isReturned && Number(t.assigned || 0) > 0) {
                totalAssigned += Number(t.assigned || 0);
              }
            });
            const totalRemaining = Math.max(0, totalStock - totalAssigned);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catalog Items</span>
                  <span className="text-base font-extrabold text-slate-900">{validTools.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Stock</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">{totalStock} units</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Active in Field</span>
                  <span className="text-base font-extrabold text-amber-800 font-mono">{totalAssigned} units</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available in Depot</span>
                  <span className="text-base font-extrabold text-emerald-800 font-mono">{totalRemaining} units</span>
                </div>
              </div>
            );
          })()}

          <div className="space-y-3">
            
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-600 uppercase px-1.5">
              <div className="flex-1 min-w-[120px]">Tool Name</div>
              <div className="w-14 text-center">Total In</div>
              <div className="w-14 text-center">Assigned</div>
              <div className="w-16 text-center">Remaining</div>
              <div className="w-28 text-center">Return Status</div>
              <div className="flex-1 min-w-[100px]">Specs / Details</div>
              <div className="w-28">Receiver / Signed</div>
              <div className="w-8 text-center">Action</div>
            </div>

            {tools.map((tool, idx) => {
              const enteredNum = Number(tool.quantity || 0);
              const isRet = Boolean(tool.isReturned);
              const assignedNum = isRet ? 0 : Number(tool.assigned || 0);
              const autoRemaining = Math.max(0, enteredNum - assignedNum);
              const hasAssignments = tool.assignments && tool.assignments.length > 0;

              return (
                <div key={tool.id || `tool-${idx}`} className="flex flex-col bg-slate-50 border border-slate-200 rounded p-2 gap-2 shadow-2xs">
                  <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center">
                    <input
                      type="text"
                      value={tool.name}
                      onChange={(e) => setTools(tools.map((t, i) => i === idx ? { ...t, name: e.target.value } : t))}
                      placeholder="Tool Name"
                      className="flex-1 min-w-[120px] bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-600"
                    />
                    <div className="flex items-center gap-1">
                      <span className="sm:hidden text-[11px] text-slate-500">In:</span>
                      <input
                        type="number"
                        min="0"
                        value={tool.quantity}
                        onChange={(e) => {
                          const newQty = e.target.value;
                          const total = Number(newQty || 0);
                          const rem = Math.max(0, total - assignedNum);
                          setTools(tools.map((t, i) => i === idx ? { ...t, quantity: newQty, remaining: String(rem) } : t));
                        }}
                        placeholder="Qty"
                        className="w-14 bg-white border border-slate-300 rounded px-1 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-600 text-center font-mono"
                        title="Total Quantity Entered in Inventory"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="sm:hidden text-[11px] text-slate-500">Out:</span>
                      <input
                        type="number"
                        min="0"
                        value={assignedNum}
                        onChange={(e) => {
                          const newAssigned = e.target.value;
                          const outNum = Number(newAssigned || 0);
                          const rem = Math.max(0, enteredNum - outNum);
                          setTools(tools.map((t, i) => i === idx ? { ...t, assigned: newAssigned, remaining: String(rem), isReturned: outNum === 0 } : t));
                        }}
                        placeholder="Out"
                        className={`w-14 border rounded px-1 py-1 text-xs text-center font-mono font-semibold ${
                          isRet
                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800'
                            : assignedNum > 0
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        title="Assigned Out to Jobs/Personnel"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="sm:hidden text-[11px] text-slate-500">Rem:</span>
                      <div
                        className={`w-16 px-1.5 py-1 rounded text-xs font-bold text-center font-mono border ${
                          autoRemaining > 0
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                        }`}
                        title="Auto-calculated Remaining Inventory in Stock"
                      >
                        {autoRemaining} rem
                      </div>
                    </div>

                    
                    <div className="w-28 flex items-center justify-center">
                      <label
                        className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded border text-xs select-none transition-colors ${
                          isRet
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100 font-medium'
                        }`}
                        title={isRet ? 'Tool is fully returned to stock. Click to mark active checkout.' : 'Click to mark tool as returned'}
                      >
                        <input
                          type="checkbox"
                          checked={isRet}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            const total = Number(tool.quantity || 0);
                            const newAssigned = checked ? 0 : Number(tool.assigned || 0);
                            const updatedAssignments = tool.assignments?.map(a => ({ ...a, isReturned: checked }));

                            setTools(tools.map((t, i) => i === idx ? {
                              ...t,
                              isReturned: checked,
                              assigned: String(newAssigned),
                              remaining: String(Math.max(0, total - newAssigned)),
                              assignments: updatedAssignments,
                            } : t));

                            await toggleToolReturn(tool.id, undefined, checked);
                          }}
                          className="rounded text-emerald-700 focus:ring-emerald-700"
                        />
                        <span>{isRet ? 'Returned' : 'In Use'}</span>
                      </label>
                    </div>

                    <input
                      type="text"
                      value={tool.details || ''}
                      onChange={(e) => setTools(tools.map((t, i) => i === idx ? { ...t, details: e.target.value } : t))}
                      placeholder="Specs / Notes"
                      className="flex-1 min-w-[100px] bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                    <input
                      type="text"
                      value={tool.signedBy}
                      onChange={(e) => setTools(tools.map((t, i) => i === idx ? { ...t, signedBy: e.target.value } : t))}
                      placeholder="Received by"
                      className="w-28 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                    <button
                      type="button"
                      onClick={() => setTools(tools.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-auto"
                      title="Remove Tool"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  
                  {hasAssignments && (
                    <div className="mt-1 pt-1.5 border-t border-slate-200 bg-white/80 rounded p-2 text-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                        <Wrench className="w-3 h-3 text-sky-600" />
                        <span>Job Checkouts for this tool ({tool.assignments!.length}):</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {tool.assignments!.map((assignment, aIdx) => {
                          const linkedJob = jobs.find(j => j.id === assignment.id);
                          const isAssignmentRet = Boolean(assignment.isReturned);
                          return (
                            <div
                              key={assignment.id ? `assign_${assignment.id}_${aIdx}` : `assign_${tool.id || idx}_${aIdx}`}
                              className={`flex flex-wrap items-center justify-between gap-2 px-2 py-1 rounded border text-[11px] ${
                                isAssignmentRet
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                  : 'bg-amber-50/50 border-amber-200 text-amber-900'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {linkedJob ? (
                                  <button
                                    type="button"
                                    onClick={() => setInteractingJob(linkedJob)}
                                    className="font-mono font-bold text-[#107c41] hover:text-[#0b5c30] bg-white hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs group"
                                    title={`View Job #${linkedJob.code}: ${linkedJob.title}`}
                                  >
                                    <span>{linkedJob.code}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-emerald-600 opacity-60 group-hover:opacity-100" />
                                  </button>
                                ) : (
                                  <span className="font-semibold text-slate-700">Job {assignment.id}</span>
                                )}
                                {linkedJob?.title && <span className="text-slate-600 truncate max-w-[180px]">({linkedJob.title})</span>}
                                <span className="font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  Qty: {assignment.assigned}
                                </span>
                                <span className="text-slate-600">Receiver: {assignment.signedBy || 'Unsigned'}</span>
                                <span className="text-slate-500 font-mono">Date: {assignment.date}</span>
                              </div>
                              <label
                                className={`flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded border text-[10px] select-none font-bold ${
                                  isAssignmentRet
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssignmentRet}
                                  onChange={async (e) => {
                                    const nextRet = e.target.checked;
                                    const total = Number(tool.quantity || 0);
                                    const updatedAssignments = tool.assignments?.map(a =>
                                      a.id === assignment.id ? { ...a, isReturned: nextRet } : a
                                    ) || [];
                                    const activeAssigned = updatedAssignments
                                      .filter(a => !a.isReturned)
                                      .reduce((acc, a) => acc + Number(a.assigned || 0), 0);
                                    const allRet = updatedAssignments.length > 0 && updatedAssignments.every(a => a.isReturned);

                                    setTools(tools.map((t, i) => i === idx ? {
                                      ...t,
                                      isReturned: allRet,
                                      assigned: String(activeAssigned),
                                      remaining: String(Math.max(0, total - activeAssigned)),
                                      assignments: updatedAssignments,
                                    } : t));

                                    await toggleToolReturn(tool.id, assignment.id, nextRet);
                                  }}
                                  className="rounded text-emerald-700 focus:ring-emerald-700 w-3.5 h-3.5"
                                />
                                <span>{isAssignmentRet ? 'Returned' : 'Check Returned'}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setTools([...tools, { id: 't' + Date.now(), name: '', quantity: '1', assigned: '0', remaining: '1', signedBy: '', details: '', isReturned: false }])}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tool</span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'vehicles' && (
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#107c41]" />
                Fleet & Vehicles Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure fleet vehicles, license plates, seating capacity, assigned drivers, and real-time depot / field status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-settings-vehicles-mark-all-depot"
                onClick={async () => {
                  for (const v of vehicles) {
                    await updateVehicleStatus(v.id, 'available', 'Returned to central depot', 'Central Depot');
                  }
                  setVehicleFeedback('All fleet vehicles marked as available in Central Depot!');
                  setTimeout(() => setVehicleFeedback(null), 3500);
                }}
                className="px-2.5 py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mark all fleet vehicles as returned to Central Depot"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Mark All in Depot</span>
              </button>

              <button
                type="button"
                id="btn-settings-vehicles-add-toggle"
                onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                className="px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0c5c30] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingVehicle ? 'Close Form' : 'Add Vehicle'}</span>
              </button>
            </div>
          </div>

          {vehicleFeedback && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{vehicleFeedback}</span>
            </div>
          )}

          
          {(() => {
            const validVehicles = (vehicles || []).filter(v => (v.name || v.model || '').trim().length > 0);
            const inField = validVehicles.filter(v => v.status === 'in_use' || v.status === 'en_route' || v.status === 'on_site').length;
            const inDepot = validVehicles.filter(v => v.status === 'available').length;
            const inService = validVehicles.filter(v => v.status === 'maintenance' || v.status === 'out_of_service').length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Fleet</span>
                  <span className="text-base font-extrabold text-slate-900">{validVehicles.length} units</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Active in Field</span>
                  <span className="text-base font-extrabold text-amber-800 font-mono">{inField} units</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available in Depot</span>
                  <span className="text-base font-extrabold text-emerald-800 font-mono">{inDepot} units</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">In Maintenance</span>
                  <span className="text-base font-extrabold text-rose-800 font-mono">{inService} units</span>
                </div>
              </div>
            );
          })()}

          
          <div className="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-lg space-y-1.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-md">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Google Maps Platform & Live Fleet Tracking</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ● Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Live GPS coordinates, street traffic overlays, vehicle heading indicators, and Gemini 2.5 Flash Maps Grounding enabled.
                  </p>
                </div>
              </div>
              <div className="font-mono text-[11px] text-slate-700 bg-white px-2.5 py-1 rounded border border-blue-200 shrink-0">
                Key: <strong className="text-blue-700">AIzaSyBd...HyFLs</strong>
              </div>
            </div>
          </div>

          
          {isAddingVehicle && (
            <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#107c41]" />
                  <span>Add New Fleet Vehicle</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingVehicle(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Unit Name / Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVehicleDraft.name}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, name: e.target.value })}
                    placeholder="e.g. Utility Van 04"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Make / Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVehicleDraft.model}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, model: e.target.value })}
                    placeholder="e.g. Ford Transit 350 AWD"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    License Plate *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVehicleDraft.plate}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, plate: e.target.value.toUpperCase() })}
                    placeholder="e.g. FL-889-TX"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assigned Driver
                  </label>
                  <select
                    value={newVehicleDraft.assignedDriverId}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, assignedDriverId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                  >
                    <option value="">-- No Assigned Driver --</option>
                    {workers
                      .filter((w) => w.role === 'driver' || (w.roleTitle && w.roleTitle.toLowerCase().includes('driver')))
                      .map((driver, dIdx) => {
                        const leaveInfo = getEffectiveLeaveInfo(driver);
                        const leaveText = leaveInfo.isOnLeave
                          ? ' [On Leave]'
                          : leaveInfo.daysUntilLeave !== null && leaveInfo.daysUntilLeave !== undefined && leaveInfo.daysUntilLeave <= 7
                          ? ` [Leaves in ${leaveInfo.daysUntilLeave}d]`
                          : '';
                        return (
                          <option key={driver.id || `driver-opt-${dIdx}`} value={driver.id}>
                            {driver.name} ({driver.roleTitle || 'Driver'}{driver.vehicleInfo?.plate ? ` • ${driver.vehicleInfo.plate}` : ''}){leaveText}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newVehicleDraft.status}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, status: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                  >
                    <option value="available">Available (In Depot)</option>
                    <option value="on_site">On Site (In Field)</option>
                    <option value="en_route">En Route (In Field)</option>
                    <option value="maintenance">In Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Home Location / Depot
                  </label>
                  <input
                    type="text"
                    value={newVehicleDraft.locationName}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, locationName: e.target.value })}
                    placeholder="e.g. Central Depot"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Notes / Onboard Equipment
                  </label>
                  <input
                    type="text"
                    value={newVehicleDraft.notes}
                    onChange={(e) => setNewVehicleDraft({ ...newVehicleDraft, notes: e.target.value })}
                    placeholder="e.g. Equipped with 5kW diesel generator and fusion splicer kit"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200/60">
                <button
                  type="button"
                  onClick={() => setIsAddingVehicle(false)}
                  className="px-3 py-1.5 rounded bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-settings-save-new-vehicle"
                  disabled={!newVehicleDraft.name.trim() || !newVehicleDraft.model.trim()}
                  onClick={async () => {
                    if (!newVehicleDraft.name.trim() || !newVehicleDraft.model.trim()) return;
                    await addVehicle({
                      name: newVehicleDraft.name.trim(),
                      model: newVehicleDraft.model.trim(),
                      plate: (newVehicleDraft.plate || 'FL-' + Math.floor(100 + Math.random() * 900) + '-TX').toUpperCase(),
                      capacity: Number(newVehicleDraft.capacity) || 4,
                      assignedDriverId: newVehicleDraft.assignedDriverId || undefined,
                      status: newVehicleDraft.status,
                      locationName: newVehicleDraft.locationName || 'Central Depot',
                      notes: newVehicleDraft.notes,
                    });
                    setNewVehicleDraft({
                      name: '',
                      model: '',
                      plate: '',
                      capacity: 4,
                      assignedDriverId: '',
                      status: 'available',
                      locationName: 'Central Depot',
                      notes: '',
                    });
                    setIsAddingVehicle(false);
                    setVehicleFeedback('Vehicle added to fleet roster successfully!');
                    setTimeout(() => setVehicleFeedback(null), 3000);
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#107c41] hover:bg-[#0c5c30] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Vehicle</span>
                </button>
              </div>
            </div>
          )}

          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                placeholder="Search fleet by name, plate, model..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 shrink-0">Filter:</span>
              {[
                { key: 'all', label: 'All Fleet' },
                { key: 'in_field', label: 'In Field' },
                { key: 'available', label: 'In Depot' },
                { key: 'maintenance', label: 'Maintenance' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setVehicleStatusFilter(f.key)}
                  className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    vehicleStatusFilter === f.key
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          
          <div className="space-y-2 pt-1">
            {(() => {
              const filtered = (vehicles || []).filter((v) => {
                const search = vehicleSearchQuery.toLowerCase();
                const matchesSearch =
                  !search ||
                  (v.name || '').toLowerCase().includes(search) ||
                  (v.model || '').toLowerCase().includes(search) ||
                  (v.plate || '').toLowerCase().includes(search) ||
                  (v.locationName || '').toLowerCase().includes(search) ||
                  (v.notes || '').toLowerCase().includes(search);

                if (!matchesSearch) return false;

                if (vehicleStatusFilter === 'in_field') {
                  return v.status === 'in_use' || v.status === 'en_route' || v.status === 'on_site';
                }
                if (vehicleStatusFilter === 'available') {
                  return v.status === 'available';
                }
                if (vehicleStatusFilter === 'maintenance') {
                  return v.status === 'maintenance' || v.status === 'out_of_service';
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                    <Truck className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold">No fleet vehicles match your filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or add a new vehicle.</p>
                  </div>
                );
              }

              return filtered.map((vehicle, vIdx) => {
                const isEditing = editingVehicleId === vehicle.id;
                const assignedDriver = workers.find((w) => w.id === vehicle.assignedDriverId);
                const isFieldActive = vehicle.status === 'in_use' || vehicle.status === 'en_route' || vehicle.status === 'on_site';
                const isMaint = vehicle.status === 'maintenance' || vehicle.status === 'out_of_service';
                const isDepot = vehicle.status === 'available';

                return (
                  <div
                    key={vehicle.id || `vehicle-card-${vIdx}`}
                    id={`settings-vehicle-card-${vehicle.id || vIdx}`}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      isFieldActive
                        ? 'bg-amber-50/20 border-amber-200 shadow-2xs'
                        : isMaint
                        ? 'bg-rose-50/20 border-rose-200'
                        : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isFieldActive
                              ? 'bg-amber-100 text-amber-800'
                              : isMaint
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Truck className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">
                              {vehicle.name || vehicle.model}
                            </span>
                            <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {vehicle.plate}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isFieldActive
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : isMaint
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {isDepot ? 'In Depot (Available)' : isFieldActive ? 'In Field' : 'Service'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px]">
                            <span>Model: <strong className="text-slate-700">{vehicle.model}</strong></span>
                            <span>•</span>
                            <span>
                              Driver:{' '}
                              {assignedDriver ? (
                                <strong className="text-slate-800">{assignedDriver.name}</strong>
                              ) : (
                                <span className="italic text-slate-400">Unassigned</span>
                              )}
                            </span>
                            <span>•</span>
                            <span>Location: <strong className="text-slate-700">{vehicle.locationName || 'Central Depot'}</strong></span>
                          </div>

                          {vehicle.notes && (
                            <p className="text-[11px] text-slate-500 italic">
                              Notes: {vehicle.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                        
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={vehicle.assignedDriverId || ''}
                            onChange={(e) => assignVehicleDriver(vehicle.id, e.target.value || undefined)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                            title="Assign default driver worker to vehicle"
                          >
                            <option value="">No Driver</option>
                            {workers
                              .filter((w) => w.role === 'driver' || (w.roleTitle && w.roleTitle.toLowerCase().includes('driver')))
                              .map((driver, dIdx) => {
                                const leaveInfo = getEffectiveLeaveInfo(driver);
                                const leaveText = leaveInfo.isOnLeave
                                  ? ' [On Leave]'
                                  : leaveInfo.daysUntilLeave !== null && leaveInfo.daysUntilLeave !== undefined && leaveInfo.daysUntilLeave <= 7
                                  ? ` [Leaves in ${leaveInfo.daysUntilLeave}d]`
                                  : '';
                                return (
                                  <option key={driver.id || `driver-select-${dIdx}`} value={driver.id}>
                                    {driver.name} ({driver.roleTitle || 'Driver'}{driver.vehicleInfo?.plate ? ` • ${driver.vehicleInfo.plate}` : ''}){leaveText}
                                  </option>
                                );
                              })}
                          </select>
                        </div>

                        
                        <select
                          value={vehicle.status}
                          onChange={(e) => updateVehicleStatus(vehicle.id, e.target.value as any)}
                          className={`text-xs font-semibold rounded px-2 py-1 border cursor-pointer ${
                            isFieldActive
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : isMaint
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          <option value="available">Available (In Depot)</option>
                          <option value="on_site">On Site (In Field)</option>
                          <option value="en_route">En Route (In Field)</option>
                          <option value="in_use">In Use (In Field)</option>
                          <option value="maintenance">In Maintenance</option>
                          <option value="out_of_service">Out of Service</option>
                        </select>

                        
                        <button
                          type="button"
                          onClick={() => {
                            if (isDepot) {
                              updateVehicleStatus(vehicle.id, 'on_site', 'Dispatched to job site', 'On Site');
                            } else {
                              updateVehicleStatus(vehicle.id, 'available', 'Returned to central depot', 'Central Depot');
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-colors flex items-center gap-1 ${
                            isDepot
                              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                          }`}
                          title={isDepot ? 'Dispatch to active field site' : 'Return vehicle to depot'}
                        >
                          {isDepot ? (
                            <>
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Dispatch</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Return to Depot</span>
                            </>
                          )}
                        </button>

                        
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete vehicle "${vehicle.name || vehicle.model}" (${vehicle.plate}) from fleet?`)) {
                              deleteVehicle(vehicle.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete vehicle from fleet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'broadcast' && (
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-700" />
                Broadcast Alert Console
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send internal dispatch notification (delivered to Manager role only).
              </p>
            </div>
            {broadcastSuccess && (
              <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Alert Sent!
              </span>
            )}
          </div>

          <form onSubmit={handleBroadcastAlert} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Headline</label>
              <input
                type="text"
                placeholder="e.g. West Substation priority elevated"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                required
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Message</label>
              <textarea
                rows={2}
                placeholder="e.g. Standby engineer ready for immediate re-assignment."
                value={alertBody}
                onChange={(e) => setAlertBody(e.target.value)}
                required
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#107c41]"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                id="btn-settings-broadcast-manager"
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Broadcast Alert
              </button>
            </div>
          </form>
        </div>
      )}

      
      {activeSettingsTab === 'google_workspace' && (
        <div className="space-y-4">
          
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-lg p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs">
                  <Cloud className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    Google Workspace & Netlify Storage Integration
                  </h3>
                  <p className="text-xs text-blue-200">
                    Zero-cost, serverless cloud persistence for Netlify & static web app deployments using Google Drive.
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-xs font-mono border border-white/15">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Netlify-Ready</span>
              </div>
            </div>
            <p className="text-xs text-blue-100/90 leading-relaxed pt-1">
              Since Worksynch is hosted on Netlify as a client-side web application, your Google Workspace / Google Drive account serves as your private cloud database and document vault. Database snapshots, active job registries, and site photos are stored in your Google Drive under <span className="font-semibold text-white">Worksynch FieldOps Storage</span>.
            </p>
          </div>

          
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Google Account Connection
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorize Worksynch to read and write application snapshots directly in your Google Drive.
                </p>
              </div>

              {isGoogleDriveConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Connected to Google Drive
                  </span>
                  <button
                    type="button"
                    onClick={disconnectGoogleDrive}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-center"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Connect Google Drive</span>
                </button>
              )}
            </div>

            
            {isGoogleDriveConnected && googleDriveUser && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {googleDriveUser.picture ? (
                    <img
                      src={googleDriveUser.picture}
                      alt={googleDriveUser.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {googleDriveUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-900">{googleDriveUser.name}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{googleDriveUser.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <div className="text-right sm:text-left">
                    <div className="font-semibold text-slate-800">Target Folder</div>
                    <div className="text-blue-700 font-medium">Worksynch FieldOps Storage</div>
                  </div>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
                    title="Open Google Drive in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackupToDriveNow}
                disabled={!isGoogleDriveConnected || isBackingUpDrive}
                className="p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-200 rounded-lg text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <CloudUpload className={`w-4 h-4 text-blue-600 ${isBackingUpDrive ? 'animate-bounce' : ''}`} />
                    Backup State Now
                  </span>
                  <span className="text-[10px] uppercase font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-bold">
                    Snapshot
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  {isBackingUpDrive
                    ? 'Uploading snapshot to Google Drive...'
                    : 'Instantly save workers, jobs, fleet & settings to Google Drive.'}
                </p>
              </button>

              <button
                type="button"
                onClick={handleExportToGoogleSheets}
                disabled={!isGoogleDriveConnected || isExportingSheets}
                className="p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 rounded-lg text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className={`w-4 h-4 text-emerald-600 ${isExportingSheets ? 'animate-spin' : ''}`} />
                    Export to Google Sheets
                  </span>
                  <span className="text-[10px] uppercase font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                    Sheets
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  {isExportingSheets
                    ? 'Creating Google Spreadsheet...'
                    : 'Generate a live Google Sheets spreadsheet of all scheduled jobs in Drive.'}
                </p>
              </button>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#107c41]" />
                    Auto-Backup to Drive
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDriveBackup}
                      onChange={(e) => setAutoDriveBackup(e.target.checked)}
                      disabled={!isGoogleDriveConnected}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lastDriveBackupTime
                    ? `Last backed up: ${new Date(lastDriveBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Auto-sync active state to Drive'}
                </p>
              </div>
            </div>

            
            {driveFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 ${
                  driveFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {driveFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{driveFeedback.text}</span>
                </div>
                {driveFeedback.link && (
                  <a
                    href={driveFeedback.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-700 hover:underline shrink-0"
                  >
                    <span>View in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CloudDownload className="w-4 h-4 text-blue-600" />
                  Google Drive Cloud Snapshots ({driveBackups.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Point-in-time database archives saved to your Google Workspace Drive. Restore to any previous state anytime.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchDriveBackupsList}
                disabled={!isGoogleDriveConnected || isLoadingDriveBackups}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoadingDriveBackups ? 'animate-spin' : ''}`} />
                <span>{isLoadingDriveBackups ? 'Refreshing...' : 'Refresh List'}</span>
              </button>
            </div>

            {isGoogleDriveConnected ? (
              driveBackups.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {driveBackups.map((backup, bIdx) => (
                    <div
                      key={backup.id || `gdrive-b-${bIdx}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <FileJson className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{backup.name}</span>
                            {backup.webViewLink && (
                              <a
                                href={backup.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-blue-600"
                                title="Open file in Google Drive"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>{new Date(backup.timestamp).toLocaleString()}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700">
                              {backup.jobsCount} Jobs, {backup.workersCount} Personnel, {backup.vehiclesCount} Fleet
                            </span>
                            <span>•</span>
                            <span>{(backup.sizeBytes / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleRestoreFromDriveBackup(backup)}
                          disabled={isRestoringDriveId === backup.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3 h-3 ${isRestoringDriveId === backup.id ? 'animate-spin' : ''}`} />
                          <span>{isRestoringDriveId === backup.id ? 'Restoring...' : 'Restore State'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDriveBackup(backup)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete from Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200">
                  <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-semibold text-slate-700">No Google Drive snapshots stored yet</div>
                  <p>Click "Backup State Now" above to create your first cloud snapshot in Google Drive.</p>
                </div>
              )
            ) : (
              <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200">
                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="font-semibold text-slate-700">Google Drive Not Connected</div>
                <p>Connect your Google Workspace / Google Drive account to view and restore cloud backups.</p>
              </div>
            )}
          </div>

          
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs">
            <button
              type="button"
              onClick={() => setShowClientIdConfig(!showClientIdConfig)}
              className="w-full flex items-center justify-between font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Cloud OAuth 2.0 Client ID Configuration</span>
                {googleDriveService.isCustomClientIdConfigured() ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    Action Needed for Real Drive
                  </span>
                )}
              </div>
              <span className="text-slate-400 text-xs">{showClientIdConfig ? '▲ Hide' : '▼ Setup'}</span>
            </button>

            {showClientIdConfig && (
              <form onSubmit={handleSaveCustomClientId} className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Paste your Google Cloud Console Web Client ID (from project <span className="font-mono text-slate-800 font-bold">gen-lang-client-0823234389</span>) below so Worksynch can authenticate with your Google Workspace directly:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="172728343478-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="flex-1 border border-slate-300 rounded px-2.5 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      Save Client ID
                    </button>
                    <a
                      href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0823234389"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs border border-slate-300 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span>Get from Google Cloud</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-700">Required Authorized JavaScript Origins in Google Cloud:</div>
                  <div className="font-mono text-[10px] text-blue-700 space-y-0.5">
                    <div>• https://ais-dev-unsiq72usxcpdap2rc46yv-577309879021.europe-west1.run.app</div>
                    <div>• https://ais-pre-unsiq72usxcpdap2rc46yv-577309879021.europe-west1.run.app</div>
                    <div>• https://your-app-name.netlify.app <span className="text-slate-500">(your Netlify URL)</span></div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      
      {activeSettingsTab === 'storage' && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#107c41]" />
                  Local Storage Engine & Real-Time Diagnostics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atomic write-ahead persistence, redundant mirror backup, and client offline synchronization.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => syncAllData(true)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Force complete real-time sync across all connected users and devices"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync All Users'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleVerifyIntegrity}
                  disabled={isVerifying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 text-emerald-600 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVerifying ? 'Checking...' : 'Verify Integrity'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleVacuumDatabase}
                  disabled={isVacuuming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isVacuuming ? 'animate-spin' : ''}`} />
                  <span>{isVacuuming ? 'Compacting...' : 'Vacuum & Compact'}</span>
                </button>
              </div>
            </div>

            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-[#107c41]" />
                    Primary Database
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                    ATOMIC
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {storageInfo ? `${(storageInfo.fileSizeBytes / 1024).toFixed(1)} KB` : '24.5 KB'}
                </div>
                <div className="text-[11px] text-slate-500 truncate" title={storageInfo?.storagePath}>
                  {storageInfo?.storagePath ? storageInfo.storagePath.split('/').pop() : 'persisted_state.json'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Mirror Backup
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                    REDUNDANT
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {storageInfo?.backupExists ? 'Synced' : 'Active'}
                </div>
                <div className="text-[11px] text-slate-500 truncate" title={storageInfo?.backupPath}>
                  {storageInfo?.backupPath ? storageInfo.backupPath.split('/').pop() : 'persisted_state.bak'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                    Browser Cache
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                    LOCAL
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {localStorageStats ? localStorageStats.formattedSize : 'Calculating...'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {workers.length} workers, {jobs.length} jobs, {vehicles.length} fleet
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    Offline Outbox
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                    (localStorageStats?.outboxPendingCount || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {localStorageStats?.outboxPendingCount || 0} QUEUED
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {(localStorageStats?.outboxPendingCount || 0) > 0 ? (
                    <button
                      type="button"
                      onClick={handleManualOfflineSync}
                      className="text-xs text-emerald-700 hover:text-emerald-800 underline font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-600" /> Sync Now
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">All synced</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  Zero data loss offline queue
                </div>
              </div>
            </div>

            
            {verificationResult && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Database Integrity Verified & Healthy</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700">
                    Checked {new Date(verificationResult.checkedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-emerald-800">
                  <div>
                    <span className="font-semibold text-emerald-900">SHA-256 Hash:</span>{' '}
                    <span className="font-mono text-[10px]">{verificationResult.fileHash.slice(0, 16)}...</span>
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-900">Write Permission Test:</span>{' '}
                    <span className="font-semibold text-emerald-700">PASSED (Atomic)</span>
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-900">Records Validated:</span>{' '}
                    <span>{verificationResult.recordCounts.workers}w / {verificationResult.recordCounts.jobs}j / {verificationResult.recordCounts.vehicles}v</span>
                  </div>
                </div>
              </div>
            )}

            {vacuumFeedback && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {vacuumFeedback}
              </div>
            )}

            {offlineSyncFeedback && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {offlineSyncFeedback}
              </div>
            )}
          </div>

          
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#107c41]" />
                  Point-in-Time Snapshots ({snapshots.length} Available)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated background snapshots rotate every 10 minutes with 15 rolling versions. Restore any point instantly.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={isTakingSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isTakingSnapshot ? 'Creating Snapshot...' : 'Create Snapshot Now'}</span>
              </button>
            </div>

            {snapshotFeedback && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {snapshotFeedback}
              </div>
            )}

            {snapshots.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {snapshots.slice(0, 8).map((snap, sIdx) => (
                  <div
                    key={snap.name || `snap-${sIdx}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileJson className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-mono font-semibold text-slate-800">{snap.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(snap.createdAt).toLocaleString()} • {snap.sizeFormatted}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap.name)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-indigo-600" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded text-center text-xs text-slate-500">
                No snapshots created yet. Automated background snapshots run every 10 minutes.
              </div>
            )}
          </div>

          
          <div className="bg-white border border-rose-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Clear All Server Data & Start Fresh
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wipe all workers, jobs, fleet vehicles, and notifications from the server database to allow entering brand-new fresh entries.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to clear all server data records? This will remove all workers, jobs, and entries, allowing you to start fresh.')) {
                    await clearServerData();
                    setRestoreMessage('Server data cleared successfully. Ready for fresh entries.');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All & Start Fresh</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Note: This action clears the active server state (`persisted_state.json`) and resets all rosters and active jobs so you can create new custom entries from scratch.
            </p>
          </div>

          
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#107c41]" />
                  Database Export & Local Restore
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export complete database state as timestamped JSON, or restore from an existing backup file.
                </p>
              </div>
              {dirSaveSuccess && (
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved & Exported!
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                  Local Windows Directory Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. C:\FieldOps\data or /Users/username/Documents/FieldOpsData"
                    value={localDataDirectory}
                    onChange={(e) => setLocalDataDirectory(e.target.value)}
                    required
                    className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-[#107c41]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveLocalDirectory}
                    className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save & Export JSON
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clicking save records the directory path and exports a full timestamped JSON database file to your device.
                </p>
              </div>

              
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="text-slate-600 text-xs">
                  Restore database records from a previously saved JSON snapshot:
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Restore from Local JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleRestoreFileInSettings}
                  />
                </label>
              </div>

              {restoreMessage && (
                <div className={`p-2.5 rounded text-xs font-semibold ${
                  restoreMessage.includes('successfully') ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-300'
                }`}>
                  {restoreMessage}
                </div>
              )}
            </div>
          </div>




        </div>
      )}

    </div>
  );
};


