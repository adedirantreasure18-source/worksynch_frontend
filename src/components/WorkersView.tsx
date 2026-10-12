import React, { useState } from 'react';
import { apiUrl, backendFileUrl } from '../config/api';
import { useApp } from '../context/AppContext';
import { Worker, WorkerRole, WorkerStatus, FleetVehicle, VehicleStatus } from '../types';
import { WorkerHistoryModal } from './WorkerHistoryModal';
import {
  Users,
  User,
  Truck,
  Car,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Award,
  Flame,
  Wrench,
  Cpu,
  Zap,
  Check,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Save,
  History,
  Download,
  FolderArchive,
  Calendar,
  Repeat,
} from 'lucide-react';
import { getEffectiveLeaveInfo, formatLeaveDuration } from '../utils/leaveUtils';

interface DraftProfile {
  id: string;
  name: string;
  role: WorkerRole;
  roleTitle: string;
  phone: string;
  email: string;
  status: WorkerStatus;
  locationName: string;
  vehicleModel: string;
  vehiclePlate: string;
  assignedDriverId: string;
}

export const WorkersView: React.FC = () => {
  const {
    workers,
    vehicles = [],
    addVehicle,
    updateVehicle,
    updateVehicleStatus,
    deleteVehicle,
    assignVehicleDriver,
    settings,
    setIsImportModalOpen,
    setEditingWorker,
    deleteWorker,
    updateWorker,
    setIsAddWorkerOpen,
  } = useApp();

  const [roleFilter, setRoleFilter] = useState<'all' | 'electrical' | 'control' | 'welder' | 'plumber' | 'driver' | 'vehicle'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const cardTitleAll = settings.dropdownCategoryLabels?.['card_title_all'] || 'All';
  const cardTitleElectrical = settings.dropdownCategoryLabels?.['card_title_electrical'] || 'Electrical Eng';
  const cardTitleControl = settings.dropdownCategoryLabels?.['card_title_control'] || 'Control Eng';
  const cardTitleWelder = settings.dropdownCategoryLabels?.['card_title_welder'] || 'Welders';
  const cardTitlePlumber = settings.dropdownCategoryLabels?.['card_title_plumber'] || 'Plumbers';
  const cardTitleDriver = settings.dropdownCategoryLabels?.['card_title_driver'] || 'Driver';
  const cardTitleVehicle = settings.dropdownCategoryLabels?.['card_title_vehicle'] || 'Vehicle';
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [draftProfile, setDraftProfile] = useState<DraftProfile | null>(null);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [historyWorker, setHistoryWorker] = useState<Worker | null>(null);

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState<Partial<FleetVehicle>>({
    name: 'Service Van',
    model: 'Ford Transit 350 AWD',
    plate: 'FL-777-VX',
    capacity: 4,
    status: 'available',
    locationName: 'Central Depot - Loading Dock',
    fuelOrBattery: 'Diesel',
    year: '2024',
    notes: '',
  });

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addVehicle({
      ...newVehicleForm,
      plate: newVehicleForm.plate?.toUpperCase() || 'FL-999-XX',
    });
    setIsAddVehicleOpen(false);
    setNewVehicleForm({
      name: 'Service Van',
      model: 'Ford Transit 350 AWD',
      plate: 'FL-777-VX',
      capacity: 4,
      status: 'available',
      locationName: 'Central Depot - Loading Dock',
      fuelOrBattery: 'Diesel',
      year: '2024',
      notes: '',
    });
    setSaveNotice('New fleet vehicle successfully added to fleet management roster!');
    setTimeout(() => setSaveNotice(null), 4500);
  };

  const isControlWorker = (w: Worker) => {
    if (w.role !== 'engineer') return false;
    if (w.functionCategory) {
      return w.functionCategory === 'control_engineer';
    }
    const title = (w.roleTitle || '').toLowerCase();
    if (title.includes('control') || title.includes('system') || title.includes('automation') || title.includes('robotics') || title.includes('scada') || title.includes('telemetry')) return true;
    if (w.id === 'w-eng-4' || w.id === 'w-eng-5' || w.id === 'w-eng-6') return true;
    return false;
  };

  const configuredRoles = settings.dropdownConfig?.roles || [
    'Control Engineer',
    'Control Engineer - HVAC & BMS Automation',
    'Control Engineer - Robotics & Automation',
    'Control Engineer - SCADA & Telemetry',
    'Field Systems Engineer',
    'Lead Substation Specialist',
    'Certified Structural & Pipe Welder',
    'Master Commercial Plumber',
    'Transport Driver (Class A CDL)',
    'Fleet Logistics Driver',
    'Emergency Dispatcher',
  ];

  const configuredZones = settings.dropdownConfig?.zones || [
    'Central Depot',
    'Metro Core (Downtown)',
    'North Industrial Park',
    'East Harbour Logistics Hub',
    'West Hills Tech Corridor',
    'South Terminal Substation',
  ];

  const configuredVehicles = settings.dropdownConfig?.vehicleTypes || [
    'Ford Transit 350 AWD High Roof',
    'Ford Transit 350 Plumbing & Hydro Jetting Van',
    'Chevy Silverado 3500HD Mobile Rig (Welding & Rigging)',
    'Mercedes-Benz Sprinter 2500 Cargo',
  ];

  const drivers = workers.filter((w) => w.role === 'driver');
  const electricalCount = workers.filter((w) => w.role === 'engineer' && !isControlWorker(w)).length;
  const controlCount = workers.filter((w) => isControlWorker(w)).length;
  const welderCount = workers.filter((w) => w.role === 'welder').length;
  const plumberCount = workers.filter((w) => w.role === 'plumber').length;
  const driverCount = workers.filter((w) => w.role === 'driver').length;
  const vehicleCount = vehicles.length;

  const filteredWorkers = workers.filter((w) => {
    if (roleFilter === 'electrical' && (w.role !== 'engineer' || isControlWorker(w))) return false;
    if (roleFilter === 'control' && !isControlWorker(w)) return false;
    if (roleFilter === 'welder' && w.role !== 'welder') return false;
    if (roleFilter === 'plumber' && w.role !== 'plumber') return false;
    if (roleFilter === 'driver' && w.role !== 'driver') return false;
    if (roleFilter === 'vehicle' && !w.vehicleInfo && w.role !== 'driver') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q) ||
        w.phone.includes(q) ||
        (w.roleTitle && w.roleTitle.toLowerCase().includes(q)) ||
        (w.specializations && w.specializations.some((spec) => spec.toLowerCase().includes(q))) ||
        w.skills.some((s) => s.toLowerCase().includes(q)) ||
        (w.locationName && w.locationName.toLowerCase().includes(q)) ||
        (w.vehicleInfo && w.vehicleInfo.model.toLowerCase().includes(q)) ||
        (w.vehicleInfo && w.vehicleInfo.plate.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleStartInlineEdit = (worker: Worker) => {
    setEditingWorkerId(worker.id);
    setDraftProfile({
      id: worker.id,
      name: worker.name,
      role: worker.role,
      roleTitle: worker.roleTitle || '',
      phone: worker.phone,
      email: worker.email,
      status: worker.status,
      locationName: worker.locationName || 'Central Depot',
      vehicleModel: worker.vehicleInfo?.model || (configuredVehicles[0] || 'Ford Transit 350 AWD'),
      vehiclePlate: worker.vehicleInfo?.plate || 'FL-901-CA',
      assignedDriverId: worker.assignedDriverId || '',
    });
  };

  const handleSaveInline = async (workerId: string) => {
    if (!draftProfile || !draftProfile.name.trim()) return;

    const updates: Partial<Worker> = {
      id: draftProfile.id.trim() || undefined,
      name: draftProfile.name.trim(),
      role: draftProfile.role,
      roleTitle: draftProfile.roleTitle.trim() || undefined,
      phone: draftProfile.phone.trim(),
      email: draftProfile.email.trim(),
      status: draftProfile.status,
      locationName: draftProfile.locationName.trim() || 'Central Depot',
    };

    if (draftProfile.role === 'driver') {
      updates.vehicleInfo = {
        model: draftProfile.vehicleModel.trim() || 'Utility Service Van',
        plate: draftProfile.vehiclePlate.trim() || 'FL-000-XX',
        capacity: 4,
      };
      updates.assignedDriverId = undefined;
    } else {
      updates.assignedDriverId = draftProfile.assignedDriverId || undefined;
    }

    await updateWorker(workerId, updates);
    setRecentlySavedId(workerId);
    setEditingWorkerId(null);
    setDraftProfile(null);
    setSaveNotice(`Profile for "${updates.name}" successfully saved & updated in Field Personnel & Fleet Roster!`);

    setTimeout(() => {
      setRecentlySavedId(null);
    }, 3500);

    setTimeout(() => {
      setSaveNotice(null);
    }, 5000);
  };

  const handleCancelInline = () => {
    setEditingWorkerId(null);
    setDraftProfile(null);
  };

  const handleQuickStatusChange = async (workerId: string, workerName: string, newStatus: WorkerStatus) => {
    await updateWorker(workerId, { status: newStatus });
    setRecentlySavedId(workerId);
    setSaveNotice(`Status for "${workerName}" updated to ${newStatus === 'en_route' ? 'IN TRANSIT' : newStatus.replace('_', ' ').toUpperCase()} and saved in roster.`);
    setTimeout(() => setRecentlySavedId(null), 3000);
    setTimeout(() => setSaveNotice(null), 4500);
  };

  return (
    <div className="space-y-4">

      
      {saveNotice && (
        <div
          id="roster-save-notification"
          className="bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-2.5 text-xs text-emerald-950 font-medium flex items-center justify-between shadow-2xs animate-fadeIn"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#107c41] shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button
            onClick={() => setSaveNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-sm px-1.5 py-0.5 rounded hover:bg-emerald-100"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      
      <div className="bg-white border border-slate-300 rounded-lg p-2.5 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded border border-slate-300 text-xs">
          <button
            id="tab-role-all"
            onClick={() => setRoleFilter('all')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors shrink-0 ${
              roleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cardTitleAll} ({workers.length})
          </button>
          <button
            id="tab-role-electrical"
            onClick={() => setRoleFilter('electrical')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 shrink-0 ${
              roleFilter === 'electrical' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-600" />
            <span>{cardTitleElectrical} ({electricalCount})</span>
          </button>
          <button
            id="tab-role-control"
            onClick={() => setRoleFilter('control')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 shrink-0 ${
              roleFilter === 'control' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3 h-3 text-indigo-600" />
            <span>{cardTitleControl} ({controlCount})</span>
          </button>
          <button
            id="tab-role-welder"
            onClick={() => setRoleFilter('welder')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 shrink-0 ${
              roleFilter === 'welder' ? 'bg-white text-orange-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3 h-3 text-orange-600" />
            <span>{cardTitleWelder} ({welderCount})</span>
          </button>
          <button
            id="tab-role-plumber"
            onClick={() => setRoleFilter('plumber')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 shrink-0 ${
              roleFilter === 'plumber' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3 h-3 text-cyan-600" />
            <span>{cardTitlePlumber} ({plumberCount})</span>
          </button>
          <button
            id="tab-role-driver"
            onClick={() => setRoleFilter('driver')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 shrink-0 ${
              roleFilter === 'driver' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3 h-3 text-amber-600" />
            <span>{cardTitleDriver} ({driverCount})</span>
          </button>
          <button
            id="tab-role-vehicle"
            onClick={() => setRoleFilter('vehicle')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 shrink-0 ${
              roleFilter === 'vehicle' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3 h-3 text-emerald-600" />
            <span>{cardTitleVehicle} ({vehicleCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-full sm:w-64">
            <input
              id="input-workers-search"
              type="text"
              placeholder="Search name, vehicle plate, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#107c41]"
            />
          </div>
          <a
            id="btn-export-all-roster-history"
            href={apiUrl('/api/history/export')}
            download
            className="flex items-center justify-center p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Download CSV of worker profiles"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <button
            id="btn-workersheet-import"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center p-1.5 rounded border border-emerald-300 bg-white hover:bg-emerald-50 text-[#107c41] shadow-2xs transition-colors cursor-pointer"
            title="Import personnel roster"
          >
            <FolderArchive className="w-3.5 h-3.5" />
          </button>
          {roleFilter === 'vehicle' ? (
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="bg-[#107c41] hover:bg-[#0b5a2f] text-white font-semibold px-2.5 py-1.5 rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer ml-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddWorkerOpen(true)}
              className="bg-[#107c41] hover:bg-[#0b5a2f] text-white font-semibold px-2.5 py-1.5 rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer ml-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Personnel</span>
            </button>
          )}
        </div>
      </div>

      
      {roleFilter === 'vehicle' && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                Fleet Vehicles & Mobile Transport Units ({vehicleCount})
              </span>
              <span className="text-slate-600 text-[11px]">
                Showing operational utility vans, 4x4 trucks, and mobile rigs with designated drivers, passenger capacity, and assigned crew.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer"
          >
            Show All ({workers.length})
          </button>
        </div>
      )}

      {roleFilter === 'driver' && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-3 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                Fleet Transport Drivers ({driverCount})
              </span>
              <span className="text-slate-600 text-[11px]">
                Showing licensed logistics drivers, emergency transit operators, and dedicated service van chauffeurs.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
          >
            Show All ({workers.length})
          </button>
        </div>
      )}

      
      <datalist id="roster-roles-datalist">
        {configuredRoles.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <datalist id="roster-zones-datalist">
        {configuredZones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>

      <datalist id="roster-vehicles-datalist">
        {configuredVehicles.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      
      <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="excel-table text-left border-collapse w-full">
            <thead>
              {roleFilter === 'vehicle' ? (
                <tr className="bg-slate-100 text-slate-700 text-xs font-semibold border-b border-slate-300 select-none">
                  <th className="excel-th w-10 text-center bg-slate-200">#</th>
                  <th className="excel-th min-w-[160px]">Plate Number</th>
                  <th className="excel-th min-w-[220px]">Vehicle Unit & Model</th>
                  <th className="excel-th w-44">Vehicle Status</th>
                  <th className="excel-th min-w-[240px]">Assigned Driver</th>
                  <th className="excel-th min-w-[180px]">Location & Notes</th>
                  <th className="excel-th w-24 text-center">Actions</th>
                </tr>
              ) : (
                <tr className="bg-slate-100 text-slate-700 text-xs font-semibold border-b border-slate-300 select-none">
                  <th className="excel-th w-10 text-center bg-slate-200">#</th>
                  <th className="excel-th w-24">Code</th>
                  <th className="excel-th w-36">Role & Title</th>
                  <th className="excel-th min-w-[200px]">Full Name & Profile</th>
                  <th className="excel-th min-w-[140px]">Phone</th>
                  <th className="excel-th min-w-[180px]">Email</th>
                  <th className="excel-th w-36">Live Status</th>
                  <th className="excel-th min-w-[200px]">Vehicle / Assigned Driver</th>
                  <th className="excel-th min-w-[200px]">Specializations</th>
                  <th className="excel-th min-w-[200px]">Skills & Certifications</th>
                  <th className="excel-th min-w-[160px]">Location</th>
                  <th className="excel-th min-w-[160px] text-center">Actions & Edit</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {roleFilter === 'vehicle' && vehicles.map((veh, idx) => {
                const assignedDriver = workers.find((w) => w.id === veh.assignedDriverId);
                return (
                  <tr key={veh.id} className="hover:bg-slate-50 transition-colors">
                    <td className="excel-td text-center font-mono text-slate-500 w-10">{idx + 1}</td>
                    <td className="excel-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono text-xs font-bold text-slate-900 tracking-wide">
                            {veh.plate}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Capacity: {veh.capacity} • {veh.fuelOrBattery || 'Diesel'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="excel-td font-semibold text-slate-900">
                      <div>
                        <span className="font-bold text-slate-900 block">{veh.name}</span>
                        <span className="text-[11px] text-slate-600 font-normal">{veh.model}</span>
                      </div>
                    </td>
                    <td className="excel-td">
                      <select
                        value={veh.status}
                        onChange={(e) => updateVehicleStatus(veh.id, e.target.value as VehicleStatus)}
                        className={`text-xs font-semibold rounded px-2.5 py-1 border focus:outline-none cursor-pointer w-full transition-colors ${
                          veh.status === 'on_site' || veh.status === 'available'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : veh.status === 'en_route' || veh.status === 'in_use'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : veh.status === 'maintenance'
                            ? 'bg-orange-50 text-orange-800 border-orange-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="available">Available (Depot Standby)</option>
                        <option value="in_use">In Use / Active Service</option>
                        <option value="en_route">In Transit / En Route</option>
                        <option value="on_site">On Site / Job Deployed</option>
                        <option value="maintenance">Maintenance / Inspection</option>
                        <option value="out_of_service">Out of Service</option>
                      </select>
                    </td>
                    <td className="excel-td">
                      <div className="space-y-1">
                        <select
                          value={veh.assignedDriverId || ''}
                          onChange={(e) => assignVehicleDriver(veh.id, e.target.value || undefined)}
                          className="text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1 w-full focus:outline-none focus:border-[#107c41]"
                        >
                          <option value="">-- Unassigned (Driver Standby Pool) --</option>
                          {workers.filter((w) => w.role === 'driver').map((drv) => (
                            <option key={drv.id} value={drv.id}>
                              {drv.name} ({drv.phone} - {drv.status.replace('_', ' ')})
                            </option>
                          ))}
                        </select>
                        {assignedDriver ? (
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                            <Truck className="w-3 h-3 shrink-0" />
                            <span>Assigned Driver: {assignedDriver.name} ({assignedDriver.status})</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No driver assigned to this vehicle</div>
                        )}
                      </div>
                    </td>
                    <td className="excel-td">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]" title={veh.locationName}>{veh.locationName || 'Central Depot'}</span>
                      </div>
                      {veh.notes && <div className="text-[10px] text-slate-500 italic truncate max-w-[160px] mt-0.5" title={veh.notes}>{veh.notes}</div>}
                    </td>
                    <td className="excel-td text-center">
                      <button
                        type="button"
                        onClick={() => deleteVehicle(veh.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Decommission / Remove Vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {roleFilter !== 'vehicle' && filteredWorkers.map((worker, idx) => {
                const assignedDriver = workers.find((w) => w.id === worker.assignedDriverId);
                const isEditingThisRow = editingWorkerId === worker.id;
                const wasRecentlySaved = recentlySavedId === worker.id;

                if (isEditingThisRow && draftProfile) {
                  
                  return (
                    <tr
                      key={worker.id}
                      id={`worker-row-editing-${worker.id}`}
                      className="bg-emerald-50/50 border-2 border-[#107c41] text-slate-800 transition-colors"
                    >
                      
                      <td className="excel-td text-center font-mono font-bold bg-emerald-100/70 text-emerald-800 text-[11px] w-10">
                        {idx + 1}
                      </td>

                      
                      <td className="excel-td font-mono font-bold text-slate-600">
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-[#107c41]"
                          value={draftProfile.id}
                          onChange={(e) => setDraftProfile({ ...draftProfile, id: e.target.value })}
                        />
                      </td>

                      
                      <td className="excel-td">
                        <div className="space-y-1">
                          <select
                            value={draftProfile.role}
                            onChange={(e) => {
                              const newRole = e.target.value as WorkerRole;
                              setDraftProfile({
                                ...draftProfile,
                                role: newRole,
                                roleTitle:
                                  newRole === 'driver'
                                    ? 'Fleet Transport Driver (Class A CDL)'
                                    : newRole === 'welder'
                                    ? 'Certified Structural & Pipe Welder'
                                    : newRole === 'plumber'
                                    ? 'Master Commercial Plumber'
                                    : 'Field Systems Engineer',
                              });
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none focus:border-[#107c41]"
                          >
                            <option value="engineer">Engineer</option>
                            <option value="welder">Welder</option>
                            <option value="plumber">Plumber</option>
                            <option value="driver">Driver</option>
                          </select>
                          <input
                            type="text"
                            list="roster-roles-datalist"
                            placeholder="Role Title"
                            value={draftProfile.roleTitle}
                            onChange={(e) => setDraftProfile({ ...draftProfile, roleTitle: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#107c41]"
                          />
                        </div>
                      </td>

                      
                      <td className="excel-td">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={draftProfile.name}
                            onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })}
                            placeholder="Full Name"
                            className="w-full bg-white border border-[#107c41] rounded px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 italic block">
                            Avatar and extended notes can be edited in Full Modal.
                          </span>
                        </div>
                      </td>

                      
                      <td className="excel-td">
                        <input
                          type="text"
                          value={draftProfile.phone}
                          onChange={(e) => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                          placeholder="Phone"
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#107c41]"
                        />
                      </td>

                      
                      <td className="excel-td">
                        <input
                          type="email"
                          value={draftProfile.email}
                          onChange={(e) => setDraftProfile({ ...draftProfile, email: e.target.value })}
                          placeholder="Email"
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#107c41]"
                        />
                      </td>

                      
                      <td className="excel-td">
                        <select
                          value={draftProfile.status}
                          onChange={(e) => setDraftProfile({ ...draftProfile, status: e.target.value as WorkerStatus })}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none focus:border-[#107c41]"
                        >
                          <option value="available">Available</option>
                          <option value="en_route">In Transit</option>
                          <option value="on_site">On Site</option>
                          <option value="completed">Completed</option>
                          <option value="off_duty">Off Duty</option>
                        </select>
                      </td>

                      
                      <td className="excel-td">
                        {draftProfile.role === 'driver' ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              list="roster-vehicles-datalist"
                              placeholder="Vehicle Model"
                              value={draftProfile.vehicleModel}
                              onChange={(e) => setDraftProfile({ ...draftProfile, vehicleModel: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#107c41]"
                            />
                            <input
                              type="text"
                              placeholder="Plate (e.g. FL-901-CA)"
                              value={draftProfile.vehiclePlate}
                              onChange={(e) => setDraftProfile({ ...draftProfile, vehiclePlate: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-[#107c41]"
                            />
                          </div>
                        ) : (
                          <div>
                            <select
                              value={draftProfile.assignedDriverId}
                              onChange={(e) => setDraftProfile({ ...draftProfile, assignedDriverId: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-[#107c41]"
                            >
                              <option value="">-- No Default Driver --</option>
                              {drivers.map((drv) => (
                                <option key={drv.id} value={drv.id}>
                                  {drv.name} ({drv.vehicleInfo?.plate || 'Fleet Van'})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>

                      
                      <td className="excel-td">
                        <div className="flex flex-wrap gap-1">
                          {worker.specializations?.map((s, si) => (
                            <span key={si} className="text-[10px] bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded text-indigo-800">
                              {s}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              handleCancelInline();
                              setEditingWorker(worker);
                            }}
                            className="text-[10px] text-emerald-700 underline font-medium hover:text-emerald-900"
                          >
                            + Edit Skills in Modal
                          </button>
                        </div>
                      </td>

                      
                      <td className="excel-td">
                        <div className="flex flex-wrap gap-1">
                          {worker.skills?.map((sk, ski) => (
                            <span key={ski} className="text-[10px] bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded text-emerald-800">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </td>

                      
                      <td className="excel-td">
                        <input
                          type="text"
                          list="roster-zones-datalist"
                          value={draftProfile.locationName}
                          onChange={(e) => setDraftProfile({ ...draftProfile, locationName: e.target.value })}
                          placeholder="Zone / Base"
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                        />
                      </td>

                      
                      <td className="excel-td text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-save-inline-${worker.id}`}
                            onClick={() => handleSaveInline(worker.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                            title="Save & Update Profile in Roster"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={handleCancelInline}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                            title="Cancel Edit"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => {
                              handleCancelInline();
                              setEditingWorker(worker);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-[#107c41] hover:bg-slate-100"
                            title="Open Full Profile Modal (Skills & Badges)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                
                return (
                  <tr
                    key={worker.id}
                    id={`worker-row-${worker.id}`}
                    className={`excel-row transition-all duration-500 border-b border-slate-200 text-slate-800 ${
                      wasRecentlySaved
                        ? 'bg-emerald-100/60 ring-2 ring-emerald-400'
                        : 'hover:bg-emerald-50/40'
                    }`}
                  >
                    
                    <td className="excel-td text-center font-mono font-semibold bg-slate-50 text-slate-400 text-[11px] w-10">
                      {idx + 1}
                    </td>

                    
                    <td className="excel-td font-mono font-bold text-slate-700">
                      {worker.id}
                      {wasRecentlySaved && (
                        <span className="block text-[9px] font-bold text-[#107c41]">
                          ✓ SAVED
                        </span>
                      )}
                    </td>

                    
                    <td className="excel-td">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                          worker.role === 'driver'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : worker.role === 'welder'
                            ? 'bg-orange-50 text-orange-800 border-orange-300'
                            : worker.role === 'plumber'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                            : isControlWorker(worker)
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {worker.role === 'welder' && <Flame className="w-2.5 h-2.5 text-orange-600" />}
                        {worker.role === 'plumber' && <Wrench className="w-2.5 h-2.5 text-cyan-600" />}
                        {worker.role === 'driver' && <Truck className="w-2.5 h-2.5 text-amber-600" />}
                        {worker.role === 'engineer' && isControlWorker(worker) && <Cpu className="w-2.5 h-2.5 text-indigo-600" />}
                        {worker.role === 'engineer' && !isControlWorker(worker) && <Zap className="w-2.5 h-2.5 text-amber-600" />}
                        <span>
                          {worker.roleTitle || (
                            worker.role === 'driver'
                              ? 'Fleet Driver'
                              : worker.role === 'welder'
                              ? 'Certified Welder'
                              : worker.role === 'plumber'
                              ? 'Licensed Plumber'
                              : isControlWorker(worker)
                              ? 'Control Engineer'
                              : 'Electrical Engineer'
                          )}
                        </span>
                      </span>
                    </td>

                    
                    <td className="excel-td">
                      <div className="flex items-center gap-2">
                        <img
                          src={backendFileUrl(worker.avatarUrl)}
                          alt={worker.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{worker.name}</span>
                            <button
                              onClick={() => handleStartInlineEdit(worker)}
                              className="text-slate-400 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Quick edit name inline"
                            >
                              <Edit className="w-2.5 h-2.5 inline" />
                            </button>
                            {(() => {
                              const lInfo = getEffectiveLeaveInfo(worker);
                              if (lInfo.daysUntilLeave !== undefined && worker.status !== 'on_leave' && worker.status !== 'off_duty') {
                                return (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0.5 rounded inline-flex items-center gap-0.5" title={`Leave starts ${lInfo.effectiveStartDate || worker.leaveStartDate}`}>
                                    {lInfo.isRecurringYearly && <Repeat className="w-2 h-2 text-purple-600" />}
                                    <span>Leaves in {formatLeaveDuration(lInfo.daysUntilLeave)}</span>
                                  </span>
                                );
                              }
                              if (lInfo.daysUntilReturn !== undefined && (worker.status === 'on_leave' || worker.status === 'off_duty')) {
                                return (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0.5 rounded inline-flex items-center gap-0.5" title={`Resumes ${lInfo.effectiveReturnDate || worker.leaveReturnDate}`}>
                                    {lInfo.isRecurringYearly && <Repeat className="w-2 h-2 text-purple-600" />}
                                    <span>{lInfo.daysUntilReturn > 0 ? `Resumes in ${formatLeaveDuration(lInfo.daysUntilReturn)}` : lInfo.daysUntilReturn === 0 ? 'Returns Today' : 'Overdue'}</span>
                                  </span>
                                );
                              }
                              if (lInfo.isRecurringYearly && (worker.leaveStartDate || worker.leaveReturnDate)) {
                                return (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0.5 rounded inline-flex items-center gap-0.5" title="Annual recurring leave schedule">
                                    <Repeat className="w-2 h-2 text-purple-600" />
                                    <span>Annual Leave</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {worker.notes && (
                            <div className="text-[10px] text-slate-500 italic truncate max-w-xs">{worker.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    
                    <td className="excel-td font-mono text-[11px] text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400 inline mr-1" />
                      {worker.phone}
                    </td>

                    
                    <td className="excel-td font-mono text-[11px] text-slate-600 truncate">
                      {worker.email}
                    </td>

                    
                    <td className="excel-td">
                      <select
                        value={worker.status}
                        onChange={(e) => handleQuickStatusChange(worker.id, worker.name, e.target.value as WorkerStatus)}
                        className={`text-xs font-semibold rounded px-2 py-1 border focus:outline-none cursor-pointer w-full transition-colors ${
                          worker.status === 'on_site'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : worker.status === 'en_route'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : worker.status === 'available'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="available">Available</option>
                        <option value="en_route">In Transit</option>
                        <option value="on_site">On Site</option>
                        <option value="completed">Completed</option>
                        <option value="off_duty">Off Duty</option>
                      </select>
                    </td>

                    
                    <td className="excel-td">
                      {worker.role === 'driver' && worker.vehicleInfo ? (
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{worker.vehicleInfo.model}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            Plate: <strong className="text-slate-800">{worker.vehicleInfo.plate}</strong> ({worker.vehicleInfo.capacity} pax)
                          </div>
                          {(() => {
                            const pairedSpecialists = workers.filter((w) => w.assignedDriverId === worker.id);
                            if (pairedSpecialists.length === 0) return null;
                            return (
                              <div className="text-[10px] text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                                <span className="font-bold">Crew ({pairedSpecialists.length}):</span>
                                <span className="truncate max-w-[140px]" title={pairedSpecialists.map((s) => s.name).join(', ')}>
                                  {pairedSpecialists.map((s) => s.name.split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      ) : assignedDriver ? (
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Driver: {assignedDriver.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            Vehicle: <strong className="text-slate-800">{assignedDriver.vehicleInfo?.plate || 'Standard Van'}</strong>
                            {assignedDriver.vehicleInfo?.model ? ` (${assignedDriver.vehicleInfo.model.split(' ')[0]})` : ''}
                          </div>
                        </div>
                      ) : worker.vehicleInfo ? (
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{worker.vehicleInfo.model}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            Plate: <strong className="text-slate-800">{worker.vehicleInfo.plate}</strong>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No transport assigned</span>
                      )}
                    </td>

                    
                    <td className="excel-td">
                      <div className="flex flex-wrap gap-1">
                        {worker.specializations && worker.specializations.length > 0 ? (
                          worker.specializations.map((spec, spIdx) => (
                            <span
                              key={spIdx}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 inline-flex items-center gap-1"
                            >
                              <Award className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                              <span>{spec}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No specialization</span>
                        )}
                      </div>
                    </td>

                    
                    <td className="excel-td">
                      <div className="flex flex-wrap gap-1">
                        {worker.skills && worker.skills.length > 0 ? (
                          worker.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 inline-flex items-center gap-1"
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-[#107c41] shrink-0" />
                              <span>{skill}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No skills</span>
                        )}
                      </div>
                    </td>

                    
                    <td className="excel-td text-slate-600">
                      <div className="flex items-center gap-1 text-[11px] truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{worker.locationName || 'Central Depot'}</span>
                      </div>
                    </td>

                    
                    <td className="excel-td text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-edit-profile-${worker.id}`}
                          onClick={() => setEditingWorker(worker)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          title="Edit Full Profile (Role, Specializations, Skills, Vehicle)"
                        >
                          <Edit className="w-3 h-3 text-[#107c41]" />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`btn-history-${worker.id}`}
                          onClick={() => setHistoryWorker(worker)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-300 font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          title={`View audit history (${worker.history?.length || 0} revisions)`}
                        >
                          <History className="w-3 h-3 text-indigo-600" />
                          <span>History</span>
                          {worker.history && worker.history.length > 0 && (
                            <span className="rounded bg-indigo-100 text-indigo-800 px-1 text-[9px] font-bold">
                              {worker.history.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleStartInlineEdit(worker)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Quick inline edit row"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteWorker(worker.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          title="Delete Personnel"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      
      {historyWorker && (
        <WorkerHistoryModal
          worker={historyWorker}
          onClose={() => setHistoryWorker(null)}
        />
      )}

      
      {isAddVehicleOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-100 px-5 py-3.5 border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add New Fleet Vehicle</h3>
                  <p className="text-xs text-slate-600">Register a new transport van, service truck, or mobile rig unit.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddVehicleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Unit Name</label>
                  <input
                    type="text"
                    required
                    value={newVehicleForm.name || ''}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                    placeholder="e.g. Service Van 07"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    required
                    value={newVehicleForm.plate || ''}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, plate: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-800 uppercase focus:outline-none focus:border-[#107c41]"
                    placeholder="FL-999-XX"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Make & Model</label>
                <input
                  type="text"
                  required
                  value={newVehicleForm.model || ''}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                  placeholder="e.g. Ford Transit 350 AWD High Roof"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Passenger Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newVehicleForm.capacity || 4}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, capacity: parseInt(e.target.value) || 4 })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fuel / Power</label>
                  <input
                    type="text"
                    value={newVehicleForm.fuelOrBattery || 'Diesel'}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, fuelOrBattery: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                    placeholder="Diesel / EV"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newVehicleForm.status || 'available'}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, status: e.target.value as VehicleStatus })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#107c41]"
                  >
                    <option value="available">Available</option>
                    <option value="in_use">In Use</option>
                    <option value="en_route">En Route</option>
                    <option value="on_site">On Site</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Location / Depot</label>
                <input
                  type="text"
                  value={newVehicleForm.locationName || ''}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, locationName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                  placeholder="Central Depot - Bay 3"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Equipment Specs</label>
                <textarea
                  rows={2}
                  value={newVehicleForm.notes || ''}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                  placeholder="Equipped with heavy winch, generator, and tool storage racks..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5a2f] text-white font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Fleet Vehicle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
