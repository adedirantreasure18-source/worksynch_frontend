import React, { useState, useMemo } from 'react';
import { backendFileUrl } from '../config/api';
import { Worker, WorkerRole, WorkerStatus, Job, JobPriority } from '../types';
import { useApp } from '../context/AppContext';
import { getRoleLabelFromSettings, getDisplayJobStatus } from '../utils/statusUtils';
import {
  X,
  Search,
  Phone,
  Mail,
  MapPin,
  Truck,
  Car,
  Flame,
  Wrench,
  Cpu,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Edit,
  Trash2,
  Repeat,
} from 'lucide-react';
import { getEffectiveLeaveInfo, formatLeaveDuration } from '../utils/leaveUtils';

export type RosterRoleFilter = 'all' | 'engineer' | 'electrical' | 'control' | 'welder' | 'plumber' | 'driver' | 'vehicle';

interface SpecialistRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: RosterRoleFilter;
  initialStatus?: 'all' | 'en_route' | 'available' | 'on_leave';
  initialSearchQuery?: string;
  onSelectJob?: (job: Job) => void;
}

export const SpecialistRosterModal: React.FC<SpecialistRosterModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'all',
  initialStatus = 'all',
  initialSearchQuery = '',
  onSelectJob,
}) => {
  const { workers, jobs, selectedDate, updateWorker, setEditingWorker, deleteWorker, settings } = useApp();

  const [selectedRole, setSelectedRole] = useState<RosterRoleFilter>(initialRole);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'en_route' | 'available' | 'on_leave'>(initialStatus);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  
  React.useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  React.useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  React.useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  
  const allSpecialists = useMemo(() => {
    return workers.filter((w) => w.role === 'engineer' || w.role === 'welder' || w.role === 'plumber' || w.role === 'driver');
  }, [workers]);

  
  const filteredSpecialists = useMemo(() => {
    return allSpecialists.filter((w) => {
      
      if (selectedRole === 'electrical') {
        if (w.role !== 'engineer' || isControlWorker(w)) return false;
      } else if (selectedRole === 'control') {
        if (!isControlWorker(w)) return false;
      } else if (selectedRole === 'vehicle') {
        if (!w.vehicleInfo && w.role !== 'driver') return false;
      } else if (selectedRole !== 'all') {
        if (w.role !== selectedRole) return false;
      }

      
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'en_route') {
          if (w.status !== 'en_route' && w.status !== 'on_site') return false;
        } else if (selectedStatus === 'available') {
          if (w.status !== 'available') return false;
        } else if (selectedStatus === 'on_leave') {
          if (w.status !== 'on_leave' && w.status !== 'off_duty' && w.status !== 'completed') return false;
        }
      }

      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesTitle = (w.roleTitle || '').toLowerCase().includes(q);
        const matchesPhone = w.phone.includes(q);
        const matchesLocation = (w.locationName || '').toLowerCase().includes(q);
        const matchesSkills = w.skills.some((s) => s.toLowerCase().includes(q));
        const matchesNotes = (w.notes || '').toLowerCase().includes(q);
        return matchesName || matchesTitle || matchesPhone || matchesLocation || matchesSkills || matchesNotes;
      }

      return true;
    });
  }, [allSpecialists, selectedRole, selectedStatus, searchQuery]);

  if (!isOpen) return null;

  const electricalLabel = settings?.dropdownCategoryLabels?.electricalEngineers || getRoleLabelFromSettings('electrical', settings) || 'Electrical Eng';
  const controlLabel = settings?.dropdownCategoryLabels?.controlEngineers || getRoleLabelFromSettings('control', settings) || 'Control Eng';
  const welderLabel = settings?.dropdownCategoryLabels?.welders || getRoleLabelFromSettings('welder', settings) || 'Welders';
  const plumberLabel = settings?.dropdownCategoryLabels?.plumbers || getRoleLabelFromSettings('plumber', settings) || 'Plumbers';
  const driverLabel = settings?.dropdownCategoryLabels?.drivers || getRoleLabelFromSettings('driver', settings) || 'Drivers';
  const vehicleLabel = settings?.dropdownCategoryLabels?.vehicles || 'Vehicles';

  const roleTitleMap: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
    all: {
      title: 'Field Specialists & Drivers Directory',
      icon: <Users className="w-5 h-5 text-[#107c41]" />,
      color: 'text-[#107c41]',
    },
    electrical: {
      title: `${electricalLabel} Roster`,
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      color: 'text-amber-600',
    },
    control: {
      title: `${controlLabel} Roster`,
      icon: <Cpu className="w-5 h-5 text-indigo-600" />,
      color: 'text-indigo-600',
    },
    engineer: {
      title: 'All Field Engineers Roster',
      icon: <Cpu className="w-5 h-5 text-indigo-600" />,
      color: 'text-indigo-600',
    },
    welder: {
      title: `${welderLabel} Roster`,
      icon: <Flame className="w-5 h-5 text-amber-600" />,
      color: 'text-amber-600',
    },
    plumber: {
      title: `${plumberLabel} Roster`,
      icon: <Wrench className="w-5 h-5 text-sky-600" />,
      color: 'text-sky-600',
    },
    driver: {
      title: `${driverLabel} Roster`,
      icon: <Truck className="w-5 h-5 text-emerald-600" />,
      color: 'text-emerald-600',
    },
    vehicle: {
      title: `${vehicleLabel} Directory`,
      icon: <Car className="w-5 h-5 text-emerald-600" />,
      color: 'text-emerald-600',
    },
  };

  const currentRoleInfo = roleTitleMap[selectedRole] || roleTitleMap.all;

  
  const electricalCount = allSpecialists.filter((w) => w.role === 'engineer' && !isControlWorker(w)).length;
  const controlCount = allSpecialists.filter((w) => isControlWorker(w)).length;
  const welderCount = allSpecialists.filter((w) => w.role === 'welder').length;
  const plumberCount = allSpecialists.filter((w) => w.role === 'plumber').length;
  const driverCount = allSpecialists.filter((w) => w.role === 'driver').length;
  const vehicleCount = allSpecialists.filter((w) => Boolean(w.vehicleInfo && (w.vehicleInfo.model || w.vehicleInfo.plate))).length;

  
  const scopedSpecialists = selectedRole === 'all'
    ? allSpecialists
    : selectedRole === 'electrical'
    ? allSpecialists.filter((w) => w.role === 'engineer' && !isControlWorker(w))
    : selectedRole === 'control'
    ? allSpecialists.filter((w) => isControlWorker(w))
    : selectedRole === 'vehicle'
    ? allSpecialists.filter((w) => Boolean(w.vehicleInfo || w.role === 'driver'))
    : allSpecialists.filter((w) => w.role === selectedRole);

  const onRouteCount = scopedSpecialists.filter((w) => w.status === 'en_route' || w.status === 'on_site').length;
  const onLeaveCount = scopedSpecialists.filter((w) => w.status === 'on_leave' || w.status === 'off_duty' || w.status === 'completed').length;
  const availableCount = scopedSpecialists.filter((w) => !['en_route', 'on_site', 'on_leave', 'off_duty', 'completed'].includes(w.status)).length;

  return (
    <div
      id="specialist-roster-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="specialist-roster-modal-card"
        className="bg-white border border-slate-300 rounded-xl w-full max-w-4xl text-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              {currentRoleInfo.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{currentRoleInfo.title}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {filteredSpecialists.length} {filteredSpecialists.length === 1 ? 'specialist' : 'specialists'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Assigned on route, available standby, and on leave status with live job schedules.
              </p>
            </div>
          </div>
          <button
            id="btn-close-specialist-roster"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        <div className="p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
              <button
                onClick={() => setSelectedRole('all')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#107c41]" />
                <span>All ({allSpecialists.length})</span>
              </button>
              <button
                onClick={() => setSelectedRole('electrical')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'electrical'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>{electricalLabel} ({electricalCount})</span>
              </button>
              <button
                onClick={() => setSelectedRole('control')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'control'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>{controlLabel} ({controlCount})</span>
              </button>
              <button
                onClick={() => setSelectedRole('welder')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'welder'
                    ? 'bg-white text-orange-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-600" />
                <span>{welderLabel} ({welderCount})</span>
              </button>
              <button
                onClick={() => setSelectedRole('plumber')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'plumber'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-sky-600" />
                <span>{plumberLabel} ({plumberCount})</span>
              </button>
              <button
                onClick={() => setSelectedRole('driver')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'driver'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>{driverLabel} ({driverCount})</span>
              </button>
              <button
                onClick={() => setSelectedRole('vehicle')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedRole === 'vehicle'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                <span>{vehicleLabel} ({vehicleCount})</span>
              </button>
            </div>

            
            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, skills, location..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#107c41] focus:bg-white"
              />
            </div>
          </div>

          
          <div className="flex items-center gap-2 text-xs overflow-x-auto pt-1">
            <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider shrink-0">
              Filter Status:
            </span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                selectedStatus === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Statuses ({scopedSpecialists.length})
            </button>

            
            <button
              onClick={() => setSelectedStatus('en_route')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedStatus === 'en_route'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Assigned / In Transit ({onRouteCount})</span>
            </button>

            
            <button
              onClick={() => setSelectedStatus('available')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedStatus === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>Available ({availableCount})</span>
            </button>

            
            <button
              onClick={() => setSelectedStatus('on_leave')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedStatus === 'on_leave'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>On Leave ({onLeaveCount})</span>
            </button>
          </div>
        </div>

        
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {filteredSpecialists.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">No specialists matching criteria</p>
              <p className="text-xs text-slate-400">
                Try switching the status filter or clearing your search term.
              </p>
              <button
                onClick={() => {
                  setSelectedStatus('all');
                  setSearchQuery('');
                  setSelectedRole('all');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredSpecialists.map((specialist) => {
              
              const specialistJobs = jobs.filter((j) => j.engineerId === specialist.id || j.specialistIds?.includes(specialist.id));
              const daySpecialistJobs = specialistJobs.filter((j) => j.scheduledDate === selectedDate);
              const assignedJobs = daySpecialistJobs.filter((j) => j.status !== 'scheduled' && j.status !== 'cancelled');
              const scheduledJobs = daySpecialistJobs.filter((j) => j.status === 'scheduled');
              const assignedDriver = workers.find((w) => w.id === specialist.assignedDriverId);

              const isEnRoute = specialist.status === 'en_route' || specialist.status === 'on_site';
              const isAvailable = specialist.status === 'available';
              const isOnLeave = specialist.status === 'on_leave' || specialist.status === 'off_duty';

              return (
                <div
                  key={specialist.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition-all space-y-3"
                >
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={backendFileUrl(specialist.avatarUrl)}
                        alt={specialist.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{specialist.name}</h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              specialist.role === 'engineer' && isControlWorker(specialist)
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : specialist.role === 'engineer'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : specialist.role === 'welder'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : specialist.role === 'plumber'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {specialist.role === 'engineer' && isControlWorker(specialist)
                              ? 'Control Eng'
                              : specialist.role === 'engineer'
                              ? 'Electrical Eng'
                              : specialist.role}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">#{specialist.id}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{specialist.roleTitle}</p>
                      </div>
                    </div>

                    
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                          isEnRoute
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isOnLeave
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isEnRoute && <Truck className="w-3.5 h-3.5 text-amber-600 animate-bounce" />}
                        {isAvailable && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {isOnLeave && <Calendar className="w-3.5 h-3.5 text-purple-600" />}
                        <span className="capitalize">
                          {specialist.status === 'en_route'
                            ? 'In Transit'
                            : specialist.status === 'on_site'
                            ? 'On Site (Active Job)'
                            : specialist.status === 'available'
                            ? 'Available (Standby)'
                            : specialist.status === 'on_leave'
                            ? 'On Leave (PTO)'
                            : 'Off Duty'}
                        </span>
                        
                        {(() => {
                          try {
                            const leaveInfo = getEffectiveLeaveInfo(specialist, selectedDate);
                            
                            if (!isOnLeave && leaveInfo.daysUntilLeave !== undefined) {
                              return (
                                <span className="ml-1 text-[10px] font-bold bg-white/70 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 inline-flex items-center gap-0.5">
                                  {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-purple-600" />}
                                  <span>Leaves in {formatLeaveDuration(leaveInfo.daysUntilLeave)}</span>
                                </span>
                              );
                            }
                            
                            if (isOnLeave && leaveInfo.daysUntilReturn !== undefined) {
                              if (leaveInfo.daysUntilReturn > 0) {
                                return (
                                  <span className="ml-1 text-[10px] font-bold bg-white/70 px-1.5 py-0.5 rounded border border-purple-200 text-purple-700 inline-flex items-center gap-0.5">
                                    {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-purple-600" />}
                                    <span>Resumes in {formatLeaveDuration(leaveInfo.daysUntilReturn)}</span>
                                  </span>
                                );
                              } else if (leaveInfo.daysUntilReturn === 0) {
                                return (
                                  <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-0.5">
                                    {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-emerald-600" />}
                                    <span>Returns Today</span>
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="ml-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-flex items-center gap-0.5">
                                    {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-rose-600" />}
                                    <span>Overdue</span>
                                  </span>
                                );
                              }
                            }
                            return null;
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </span>

                      
                      <select
                        value={specialist.status}
                        onChange={(e) => {
                          updateWorker(specialist.id, { status: e.target.value as WorkerStatus });
                        }}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-[#107c41] cursor-pointer"
                        title="Update specialist live status"
                      >
                        <option value="available">Available</option>
                        <option value="en_route">In Transit</option>
                        <option value="on_site">On Site</option>
                        <option value="on_leave">On Leave</option>
                        <option value="off_duty">Off Duty</option>
                      </select>

                      
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setEditingWorker(specialist);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Edit Specialist Profile"
                        >
                          <Edit className="w-3 h-3 text-[#107c41]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWorker(specialist.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Delete Specialist"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
                    
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong>Location:</strong> {specialist.locationName || 'Central Depot'}
                      </span>
                    </div>

                    
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong>Driver:</strong> {assignedDriver ? assignedDriver.name : 'Not Assigned'}
                      </span>
                    </div>

                    
                    <div className="flex items-center gap-3 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <a
                        href={`tel:${specialist.phone}`}
                        className="flex items-center gap-1 text-slate-700 hover:text-[#107c41] font-mono text-[11px]"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{specialist.phone}</span>
                      </a>
                      <a
                        href={`mailto:${specialist.email}`}
                        className="flex items-center gap-1 text-slate-700 hover:text-[#107c41] truncate text-[11px]"
                        title={specialist.email}
                      >
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{specialist.email}</span>
                      </a>
                    </div>
                  </div>

                  
                  {specialist.skills && specialist.skills.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="text-slate-400 font-semibold text-[10px] uppercase">Skills:</span>
                      {specialist.skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  
                  {(specialist.leaveStartDate || specialist.leaveReturnDate) && (
                    <div className="flex items-center justify-between gap-1.5 bg-purple-50 px-2.5 py-2 rounded-lg border border-purple-100 text-xs text-purple-800">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">
                          <strong>Leave Schedule:</strong> {specialist.leaveStartDate ? `Starts ${specialist.leaveStartDate}` : 'Start date unset'} &mdash; {specialist.leaveReturnDate ? `Resumes ${specialist.leaveReturnDate}` : 'Resume date unset'}
                        </span>
                      </div>
                      {specialist.leaveRecurringYearly && (
                        <span className="inline-flex items-center gap-1 bg-purple-200 text-purple-900 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          <Repeat className="w-2.5 h-2.5" />
                          <span>Yearly Recurring</span>
                        </span>
                      )}
                    </div>
                  )}

                  
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-[#107c41]" />
                        <span className="font-bold text-slate-800">
                          Jobs for {selectedDate} ({daySpecialistJobs.length} total)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                          {assignedJobs.length} Assigned
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                          {scheduledJobs.length} Scheduled
                        </span>
                      </div>
                    </div>

                    
                    {daySpecialistJobs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No appointments assigned on {selectedDate}.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {daySpecialistJobs.map((job) => (
                          <div
                            key={job.id}
                            className="bg-white border border-slate-200 rounded-lg p-2 hover:border-[#107c41] transition-all flex items-start justify-between gap-2 shadow-2xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-emerald-800">{job.code}</span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                    job.priority === 'urgent'
                                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                                      : job.priority === 'high'
                                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                                      : 'bg-slate-50 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {job.priority}
                                </span>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                    job.status === 'scheduled'
                                      ? 'bg-blue-50 text-blue-700'
                                      : job.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-800'
                                  }`}
                                >
                                  {getDisplayJobStatus(job.status, settings?.dropdownConfig?.jobStatuses)}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-900 truncate" title={job.title}>
                                {job.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                📍 {job.siteLocation.name} • {job.timeWindow.start}
                              </p>
                              {(() => {
                                const specIds = Array.from(new Set([...(job.specialistIds || []), ...(job.engineerId ? [job.engineerId] : [])]));
                                if (specIds.length <= 1) return null;
                                const otherSpecs = specIds
                                  .filter((id) => id !== specialist.id)
                                  .map((id) => workers.find((w) => w.id === id)?.name)
                                  .filter(Boolean);
                                return (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                                    <Users className="w-3 h-3 text-indigo-600 shrink-0" />
                                    <span className="truncate">Co-assigned with: {otherSpecs.join(', ')}</span>
                                  </div>
                                );
                              })()}
                            </div>

                            {onSelectJob && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onSelectJob(job);
                                }}
                                className="px-2 py-1 rounded bg-[#107c41]/10 hover:bg-[#107c41] text-[#107c41] hover:text-white text-[11px] font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                                title="Inspect or interact with this job"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Showing <strong>{filteredSpecialists.length}</strong> of <strong>{allSpecialists.length}</strong> field
            specialists
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
};
