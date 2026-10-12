export type WorkerRole = 'engineer' | 'driver' | 'welder' | 'plumber';

export type WorkerStatus = 'available' | 'en_route' | 'on_site' | 'completed' | 'off_duty' | 'on_leave';

export type JobStatus = string;

export type JobPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface VehicleInfo {
  model: string;
  plate: string;
  capacity: number;
}

export type VehicleStatus = 'available' | 'in_use' | 'en_route' | 'on_site' | 'maintenance' | 'out_of_service';

export interface FleetVehicle {
  id: string;
  name?: string;
  model: string;
  plate: string;
  capacity: number;
  status: VehicleStatus;
  assignedDriverId?: string;
  currentJobId?: string;
  locationName?: string;
  notes?: string;
  year?: string;
  fuelOrBattery?: string;
  currentLat?: number;
  currentLng?: number;
  speedKmh?: number;
  heading?: number;
  batteryLevel?: number;
  odometerKm?: number;
  telemetryStatus?: 'moving' | 'idling' | 'on_site' | 'parked';
  lastLocationUpdate?: string;
}

export interface WorkerHistoryChange {
  field: string;
  fieldLabel: string;
  from: any;
  to: any;
}

export interface WorkerHistoryEntry {
  id: string;
  timestamp: string;
  changedBy: string;
  summary: string;
  changes: WorkerHistoryChange[];
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  roleTitle?: string;
  functionCategory?: string;
  email: string;
  phone: string;
  status: WorkerStatus;
  specializations?: string[];
  skills: string[];
  avatarUrl: string;
  assignedDriverId?: string;
  vehicleInfo?: VehicleInfo;
  currentJobId?: string;
  locationName?: string;
  notes?: string;
  leaveStartDate?: string;
  leaveReturnDate?: string;
  leaveRecurringYearly?: boolean;
  rating?: number;
  history?: WorkerHistoryEntry[];
  username?: string;

  password?: string;

  passwordHash?: string;

  hasPassword?: boolean;
  accountActive?: boolean;
}

export interface AdminAccount {
  username: string;

  passwordHash?: string;
  password?: string;
}

export interface SiteLocation {
  name: string;
  address: string;
  zone: string;
  lat: number;
  lng: number;
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface JobInteractionNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'manager' | 'engineer' | 'driver';
  content: string;
  timestamp: string;
}

export interface ConnectedUser {
  id: string;
  name: string;
  role: 'manager' | 'engineer' | 'driver';
  color: string;
  activeView: string;
  focusJobId?: string | null;
  lastActive: string;
}

export interface UserActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userRole: 'manager' | 'engineer' | 'driver';
  action: 'viewed_job' | 'status_changed' | 'reassigned' | 'added_note' | 'joined' | 'left' | 'updated_profile';
  jobId?: string;
  jobCode?: string;
  details: string;
  timestamp: string;
}

export interface Job {
  id: string;
  code: string;
  title: string;
  clientName: string;
  siteLocation: SiteLocation;
  scheduledDate: string;
  timeWindow: TimeWindow;
  engineerId: string;
  specialistIds?: string[];
  driverId?: string;
  driverIds?: string[];
  transitMode?: 'driver' | 'public_transport' | 'walking';
  priority: JobPriority;
  status: JobStatus;
  estimatedDurationHours: number;
  notes: string;
  completedAt?: string;
  cancelledAt?: string;
  commuteStartedAt?: string;
  timeSpent?: string;
  customFields?: Record<string, string>;
  routeNotes?: string;
  requiredSkills?: string[];
  assignedTools?: { toolId: string; toolName: string; quantity: number; date?: string; signedBy?: string; isReturned?: boolean }[];
  interactionNotes?: JobInteractionNote[];
  activeUsersViewing?: string[];
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'route_update' | 'job_status' | 'worker_status' | 'urgent_alert' | 'system' | 'interaction';
  read: boolean;
  targetAudience?: 'manager_only' | 'all';
  metadata?: {
    jobId?: string;
    workerId?: string;
    workersOnSite?: { id: string; name: string; site: string }[];
    workersAvailable?: { id: string; name: string }[];
  };
}

export interface DropdownConfigurations {
  roles: string[];
  zones: string[];
  priorities: string[];
  specializations?: string[];
  skills: string[];
  vehicleTypes: string[];
  jobStatuses: string[];
  jobTitles?: string[];
  clients?: string[];
  jobDescriptions?: string[];
}

export interface ToolAssignment {
  id: string;
  assigned: string;
  signedBy: string;
  date: string;
  isReturned?: boolean;
}

export interface ToolItem {
  id: string;
  name: string;
  quantity: string;
  assigned?: string;
  remaining?: string;
  signedBy: string;
  details?: string;
  date?: string;
  isReturned?: boolean;
  assignments?: ToolAssignment[];
}

export interface SystemSettings {
  companyName: string;
  dispatchCenter: string;
  autoRouteOptimization: boolean;
  soundAlerts: boolean;
  browserNotificationsEnabled: boolean;
  dailyNotificationTime: string;
  dropdownConfig?: DropdownConfigurations;
  tools?: ToolItem[];
  dropdownCategoryLabels?: Record<string, string>;
  hiddenCategories?: string[];
  jobListColumns?: { id: string; label: string; visible: boolean; custom?: boolean }[];
  workerNotificationsEnabled?: boolean;
  localDataDirectory?: string;
}

export interface AppStateData {
  workers: Worker[];
  jobs: Job[];
  vehicles?: FleetVehicle[];
  notifications: PushNotification[];
  settings: SystemSettings;
  connectedUsers?: ConnectedUser[];
  recentActivities?: UserActivityEvent[];
  admins?: AdminAccount[];
}
