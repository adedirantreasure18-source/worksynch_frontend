import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RouteMapVisualizer } from './RouteMapVisualizer';
import { SpecialistRosterModal } from './SpecialistRosterModal';
import { JobsView } from './JobsView';
import { ToolsSummary } from './ToolsSummary';
import { VehicleSummary } from './VehicleSummary';
import { INITIAL_SETTINGS } from "../data/initialData";
import { getTimeWindowDisplay } from '../utils/timeWindowUtils';
import {
  Table,
  Plus,
  Radio,
  Clock,
  Building2,
  Phone,
  Truck,
  User,
  ShieldCheck,
  Edit,
  Trash2,
  ExternalLink,
  MapPin,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Layers,
  MessageSquare,
  Eye,
  Flame,
  Wrench,
  Cpu,
  Zap,
  Sliders,
  Users,
  Calendar,
  ArrowRight,
  Briefcase,
  FileSpreadsheet,
  BarChart3,
  Repeat,
} from 'lucide-react';
import { JobStatus, JobPriority, Job, Worker } from '../types';
import { getDisplayJobStatus, matchJobStatus, getRoleLabelFromSettings } from '../utils/statusUtils';
import { getEffectiveLeaveInfo, formatLeaveDuration } from '../utils/leaveUtils';

const PRIORITY_ORDER: Record<JobPriority, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

const sortJobsByPriority = (a: Job, b: Job) => {
  const pA = PRIORITY_ORDER[a.priority] ?? 99;
  const pB = PRIORITY_ORDER[b.priority] ?? 99;
  if (pA !== pB) return pA - pB;
  return (a.timeWindow?.start || '').localeCompare(b.timeWindow?.start || '') || a.code.localeCompare(b.code);
};

export const DashboardView: React.FC = () => {
  const {
    todayDate,
    workers,
    jobs,
    selectedDate,
    setEditingJob,
    deleteJob,
    updateJobStatus,
    setIsAddJobOpen,
    setActiveView,
    connectedUsers,
    currentUser,
    currentRole,
    settings,
    toggleToolReturn,
    interactingJob,
    setInteractingJob,
    dateScope,
    setDateScope,
  } = useApp();

  const jobListColumns = settings.jobListColumns || INITIAL_SETTINGS.jobListColumns!;
  const isColVisible = (id: string) => jobListColumns.find(c => c.id === id)?.visible ?? true;
  const getColLabel = (id: string, defaultLabel: string) => jobListColumns.find(c => c.id === id)?.label || defaultLabel;

  const [scheduleMode, setScheduleMode] = useState<'table' | 'list'>('table');
  const [showMap, setShowMap] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterModalRole, setRosterModalRole] = useState<'all' | 'engineer' | 'electrical' | 'control' | 'welder' | 'plumber' | 'driver' | 'vehicle'>('all');
  const [rosterModalStatus, setRosterModalStatus] = useState<'all' | 'en_route' | 'available' | 'on_leave'>('all');
  const [rosterModalSearch, setRosterModalSearch] = useState<string>('');

  const handleOpenRoster = (
    role: 'all' | 'engineer' | 'electrical' | 'control' | 'welder' | 'plumber' | 'driver' | 'vehicle',
    status: 'all' | 'en_route' | 'available' | 'on_leave' = 'all',
    searchQuery: string = ''
  ) => {
    setRosterModalRole(role);
    setRosterModalStatus(status);
    setRosterModalSearch(searchQuery);
    setIsRosterModalOpen(true);
  };

  
  const dayJobs = jobs.filter((j) => j.scheduledDate === selectedDate);
  const baseJobs = (dateScope === 'selected'
    ? dayJobs
    : [...jobs]
  ).sort(sortJobsByPriority);

  const filteredJobs = baseJobs.filter((j) => {
    if (statusFilter !== 'all' && !matchJobStatus(j.status, statusFilter)) return false;
    if (priorityFilter !== 'all' && j.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    const eng = workers.find((w) => w.id === j.engineerId)?.name.toLowerCase() || '';
    const drv = workers.find((w) => w.id === j.driverId)?.name.toLowerCase() || '';
    return (
      j.title.toLowerCase().includes(q) ||
      j.code.toLowerCase().includes(q) ||
      j.clientName.toLowerCase().includes(q) ||
      j.siteLocation.name.toLowerCase().includes(q) ||
      j.siteLocation.address.toLowerCase().includes(q) ||
      eng.includes(q) ||
      drv.includes(q)
    );
  });

  
  const getSpecialistMetrics = (role: 'engineer' | 'welder' | 'plumber') => {
    const roleWorkers = workers.filter((w) => w.role === role);
    const onRoute = roleWorkers.filter((w) => w.status === 'en_route' || w.status === 'on_site').length;
    const available = roleWorkers.filter((w) => w.status === 'available').length;
    const onLeave = roleWorkers.filter((w) => w.status === 'on_leave' || w.status === 'off_duty').length;

    const targetJobs = dateScope === 'selected' ? dayJobs : jobs;
    const roleJobs = targetJobs.filter((j) => {
      const specialist = workers.find((w) => w.id === j.engineerId);
      return specialist && specialist.role === role;
    });

    const assignedJobs = roleJobs.filter((j) => j.status !== 'scheduled' && j.status !== 'cancelled').length;
    const scheduledJobs = roleJobs.filter((j) => j.status === 'scheduled').length;

    return {
      total: roleWorkers.length,
      onRoute,
      available,
      onLeave,
      assignedJobs,
      scheduledJobs,
      totalJobs: roleJobs.length,
    };
  };

  const engineerMetrics = getSpecialistMetrics('engineer');
  const welderMetrics = getSpecialistMetrics('welder');
  const plumberMetrics = getSpecialistMetrics('plumber');

  const allSpecialists = workers.filter((w) => w.role === 'engineer' || w.role === 'welder' || w.role === 'plumber');
  const totalSpecialistsOnRoute = allSpecialists.filter((w) => w.status === 'en_route' || w.status === 'on_site').length;
  const totalSpecialistsAvailable = allSpecialists.filter((w) => w.status === 'available').length;
  const totalSpecialistsOnLeave = allSpecialists.filter((w) => w.status === 'on_leave' || w.status === 'off_duty').length;

  const targetJobs = dateScope === 'selected' ? dayJobs : jobs;
  const totalJobsCount = targetJobs.length;
  const scheduledJobsCount = targetJobs.filter((j) => j.status === 'scheduled').length;
  const enRouteJobsCount = targetJobs.filter((j) => j.status === 'en_route').length;
  const onSiteJobsCount = targetJobs.filter((j) => j.status === 'on_site').length;
  const completedJobsCount = targetJobs.filter((j) => j.status === 'completed').length;
  const urgentHighJobsCount = targetJobs.filter((j) => j.priority === 'urgent' || j.priority === 'high').length;
  const completionRate = totalJobsCount > 0 ? Math.round((completedJobsCount / totalJobsCount) * 100) : 0;

  const currentInteractingJob = interactingJob ? jobs.find((j) => j.id === interactingJob.id) || interactingJob : null;

  
  const isControlEngineer = (w: Worker): boolean => {
    if (w.role !== 'engineer') return false;
    
    
    if (w.functionCategory) {
      return w.functionCategory === 'control_engineer';
    }
    
    
    const title = (w.roleTitle || '').toLowerCase();
    if (title.includes('control') || title.includes('system') || title.includes('automation') || title.includes('robotics') || title.includes('scada') || title.includes('telemetry')) {
      return true;
    }
    
    
    if (w.id === 'w-eng-4' || w.id === 'w-eng-5' || w.id === 'w-eng-6') return true;
    
    return false;
  };

  const electricalEngineers = workers.filter((w) => w.role === 'engineer' && !isControlEngineer(w));
  const controlEngineers = workers.filter((w) => isControlEngineer(w));
  const weldersList = workers.filter((w) => w.role === 'welder');
  const plumbersList = workers.filter((w) => w.role === 'plumber');
  const driversList = workers.filter((w) => w.role === 'driver');

  
  const electricalRoleLabel = getRoleLabelFromSettings('electrical', settings);
  const controlRoleLabel = getRoleLabelFromSettings('control', settings);
  const welderRoleLabel = getRoleLabelFromSettings('welder', settings);
  const plumberRoleLabel = getRoleLabelFromSettings('plumber', settings);
  const driverRoleLabel = getRoleLabelFromSettings('driver', settings);

  
  const getJobSpecialists = (j: Job): Worker[] => {
    const specIds = Array.from(new Set([
      ...(j.specialistIds || []),
      ...(j.engineerId ? [j.engineerId] : [])
    ]));
    return specIds.map((id) => workers.find((w) => w.id === id)).filter(Boolean) as Worker[];
  };

  const getJobDrivers = (j: Job): Worker[] => {
    const driverIds = Array.from(new Set([
      ...(j.driverIds || []),
      ...(j.driverId ? [j.driverId] : [])
    ]));
    return driverIds.map((id) => workers.find((w) => w.id === id)).filter(Boolean) as Worker[];
  };

  
  const multiSpecialistJobs = targetJobs.filter((j) => {
    if (j.status === 'cancelled') return false;
    return getJobSpecialists(j).length > 1;
  });

  
  const getTradeJobCount = (predicate: (w: Worker) => boolean) => {
    return targetJobs.filter((j) => {
      if (j.status === 'cancelled') return false;
      const specs = getJobSpecialists(j);
      return specs.some((s) => predicate(s));
    }).length;
  };

  const electricalJobsCount = getTradeJobCount((w) => w.role === 'engineer' && !isControlEngineer(w));
  const controlJobsCount = getTradeJobCount((w) => isControlEngineer(w));
  const welderJobsCount = getTradeJobCount((w) => w.role === 'welder');
  const plumberJobsCount = getTradeJobCount((w) => w.role === 'plumber');
  const driversJobsCount = targetJobs.filter((j) => !!j.driverId || (j.driverIds && j.driverIds.length > 0)).length;

  
  const formatDuration = (totalDays: number) => {
    if (totalDays >= 30) {
      const m = Math.floor(totalDays / 30);
      const d = totalDays % 30;
      return d > 0 ? `(${m}m:${d}d)` : `(${m}m)`;
    }
    return `(${totalDays}d)`;
  };

  const renderLeaveBadge = (worker: Worker) => {
    try {
      const leaveInfo = getEffectiveLeaveInfo(worker, selectedDate || todayDate);
      const isCurrentlyOnLeave = worker.status === 'on_leave' || worker.status === 'off_duty' || leaveInfo.isOnLeave;

      if (!isCurrentlyOnLeave && leaveInfo.daysUntilLeave !== undefined) {
        return (
          <span className="ml-1 text-[9px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded inline-flex items-center gap-0.5">
            {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-purple-600" />}
            <span>Leaves in {formatLeaveDuration(leaveInfo.daysUntilLeave)}</span>
          </span>
        );
      }

      if (isCurrentlyOnLeave && leaveInfo.daysUntilReturn !== undefined) {
        if (leaveInfo.daysUntilReturn > 0) {
          return (
            <span className="ml-1 text-[9px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded inline-flex items-center gap-0.5">
              {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-purple-600" />}
              <span>Resumes in {formatLeaveDuration(leaveInfo.daysUntilReturn)}</span>
            </span>
          );
        } else if (leaveInfo.daysUntilReturn === 0) {
          return (
            <span className="ml-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded inline-flex items-center gap-0.5">
              {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-emerald-600" />}
              <span>Returns Today</span>
            </span>
          );
        } else {
          return (
            <span className="ml-1 text-[9px] font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded inline-flex items-center gap-0.5">
              {leaveInfo.isRecurringYearly && <Repeat className="w-2.5 h-2.5 text-rose-600" />}
              <span>Overdue</span>
            </span>
          );
        }
      }

      if (leaveInfo.isRecurringYearly && (worker.leaveStartDate || worker.leaveReturnDate)) {
        return (
          <span className="ml-1 text-[9px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded inline-flex items-center gap-0.5" title="Annual recurring leave schedule">
            <Repeat className="w-2.5 h-2.5 text-purple-600" />
            <span>Annual</span>
          </span>
        );
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  const renderCardContent = (
    groupWorkers: Worker[],
    roleKey: 'engineer' | 'welder' | 'plumber' | 'driver'
  ) => {
    const hasJobForToday = (w: Worker) =>
      targetJobs.some((j) => {
        if (j.status === 'cancelled') return false;
        const specs = getJobSpecialists(j);
        const drvs = getJobDrivers(j);
        return specs.some((s) => s.id === w.id) || drvs.some((d) => d.id === w.id);
      });

    const active = groupWorkers.filter((w) => w.status === 'en_route' || w.status === 'on_site' || hasJobForToday(w));
    const leave = groupWorkers.filter((w) => w.status === 'on_leave' || w.status === 'off_duty' || w.status === 'completed');
    const avail = groupWorkers.filter((w) => !active.includes(w) && !leave.includes(w));

    if (groupWorkers.length === 0) {
      return <p className="text-[11px] text-slate-400 italic py-1">No personnel registered</p>;
    }

    return (
      <div className="space-y-2 text-xs">
        
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between pb-0.5 mb-1 border-b border-emerald-100/70">
            <span className="flex items-center gap-1 font-semibold">
              AVAILABLE
            </span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100/80 text-emerald-800">
              {avail.length}
            </span>
          </div>
          {avail.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {avail.map((worker) => (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => handleOpenRoster(roleKey, 'available', worker.name)}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 text-[11px] font-medium transition-colors cursor-pointer text-left shadow-2xs group max-w-full"
                  title={`${worker.name} (Available) - Click to inspect`}
                >
                  <span className="truncate">{worker.name}</span>
                  {renderLeaveBadge(worker)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic pl-0.5">None available</p>
          )}
        </div>

        
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between pb-0.5 mb-1 border-b border-amber-100/70">
            <span className="flex items-center gap-1 font-semibold">
              ASSIGNED
            </span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100/80 text-amber-800">
              {active.length}
            </span>
          </div>
          {active.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {active.map((worker) => {
                const workerActiveJobs = targetJobs.filter((j) => {
                  if (j.status === 'cancelled') return false;
                  const specs = getJobSpecialists(j);
                  const drvs = getJobDrivers(j);
                  return specs.some((s) => s.id === worker.id) || drvs.some((d) => d.id === worker.id);
                });
                const teamJob = workerActiveJobs.find((j) => getJobSpecialists(j).length > 1);
                const allTeamSpecs = teamJob ? getJobSpecialists(teamJob) : [];
                const coSpecialists = allTeamSpecs.filter((s) => s.id !== worker.id);

                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => {
                      if (teamJob) {
                        setInteractingJob(teamJob);
                      } else {
                        handleOpenRoster(roleKey, 'en_route', worker.name);
                      }
                    }}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer text-left shadow-2xs group max-w-full ${
                      teamJob
                        ? 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-950 border border-indigo-300/90 hover:border-indigo-400'
                        : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200/90 hover:border-amber-300'
                    }`}
                    title={
                      teamJob
                        ? `${worker.name} — Co-assigned on ${teamJob.code} (${teamJob.title}) with: ${coSpecialists.map((s) => s.name).join(', ')} • Click to inspect job`
                        : `${worker.name} (${worker.status === 'en_route' ? 'in transit' : worker.status.replace('_', ' ')}) - Click to inspect`
                    }
                  >
                    <span className="truncate">{worker.name}</span>
                    {teamJob && (
                      <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-indigo-200/80 text-indigo-900 text-[9px] font-extrabold shrink-0">
                        <Users className="w-2.5 h-2.5 text-indigo-700" />
                        <span>Team ({allTeamSpecs.length})</span>
                      </span>
                    )}
                    {renderLeaveBadge(worker)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic pl-0.5">None assigned</p>
          )}
        </div>

        
        {leave.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center justify-between pb-0.5 mb-1 border-b border-purple-100/70">
              <span className="flex items-center gap-1 font-semibold">
                OFF DUTY / LEAVE
              </span>
              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100/80 text-purple-800">
                {leave.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {leave.map((worker) => (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => handleOpenRoster(roleKey, 'on_leave', worker.name)}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-900 border border-slate-200/90 hover:border-purple-300 text-[11px] font-medium transition-colors cursor-pointer text-left shadow-2xs group max-w-full"
                  title={`${worker.name} (On Leave) - Click to inspect`}
                >
                  <span className="truncate">{worker.name}</span>
                  {renderLeaveBadge(worker)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      
      <div
        id="dashboard-card-worker-overview"
        className="bg-[#bbd9bf] border border-slate-300 rounded-lg p-3 sm:p-3.5 shadow-xs order-last"
      >
        
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#107c41] shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              {settings.dropdownCategoryLabels?.card_title_overview || settings.dropdownCategoryLabels?.roles ? `${(settings.dropdownCategoryLabels.card_title_overview || settings.dropdownCategoryLabels.roles).toUpperCase()} OVERVIEW` : 'WORKER OVERVIEW'}
            </h3>
            <span className="text-[11px] text-[#282c32] font-normal">
              ({allSpecialists.length} specialists • {driversList.length} drivers)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                Available: {totalSpecialistsAvailable}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                Active: {totalSpecialistsOnRoute}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                On Leave: {totalSpecialistsOnLeave}
              </span>
              {multiSpecialistJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold flex items-center gap-1 shadow-2xs">
                  <Users className="w-3 h-3 text-indigo-600" />
                  <span>Team Jobs: {multiSpecialistJobs.length}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              id="btn-worker-overview-full-roster"
              onClick={() => handleOpenRoster('all', 'all')}
              className="text-xs font-bold text-[#107c41] hover:text-[#0b5c30] flex items-center gap-1 cursor-pointer transition-colors bg-emerald-50/80 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200/60"
            >
              <span>Full Roster</span>
              <span className="text-xs font-bold leading-none">→</span>
            </button>
          </div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2.5">
          
          <div
            id="card-electrical-eng"
            className="bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200 border-t-[3px] border-t-amber-500 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-amber-100 text-amber-700">
                    <Zap className="w-2.5 h-2.5 shrink-0" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
                    {electricalRoleLabel.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-white text-amber-800 border border-amber-200/80 shadow-2xs">
                  {electricalEngineers.length}
                </span>
              </div>
              {renderCardContent(electricalEngineers, 'engineer')}
            </div>
            <div className="pt-1.5 mt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">
                {electricalEngineers.filter((w) => w.status === 'available').length} free
              </span>
              <button
                type="button"
                onClick={() => handleOpenRoster('electrical', 'all')}
                className="font-semibold text-slate-500 hover:text-amber-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            </div>
          </div>

          
          <div
            id="card-control-eng"
            className="bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200 border-t-[3px] border-t-indigo-500 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-indigo-100 text-indigo-700">
                    <Cpu className="w-2.5 h-2.5 shrink-0" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
                    {controlRoleLabel.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-white text-indigo-800 border border-indigo-200/80 shadow-2xs">
                  {controlEngineers.length}
                </span>
              </div>
              {renderCardContent(controlEngineers, 'engineer')}
            </div>
            <div className="pt-1.5 mt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">
                {controlEngineers.filter((w) => w.status === 'available').length} free
              </span>
              <button
                type="button"
                onClick={() => handleOpenRoster('control', 'all')}
                className="font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            </div>
          </div>

          
          <div
            id="card-welders"
            className="bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200 border-t-[3px] border-t-orange-500 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-orange-100 text-orange-700">
                    <Flame className="w-2.5 h-2.5 shrink-0" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
                    {welderRoleLabel.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-white text-orange-800 border border-orange-200/80 shadow-2xs">
                  {weldersList.length}
                </span>
              </div>
              {renderCardContent(weldersList, 'welder')}
            </div>
            <div className="pt-1.5 mt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">
                {weldersList.filter((w) => w.status === 'available').length} free
              </span>
              <button
                type="button"
                onClick={() => handleOpenRoster('welder', 'all')}
                className="font-semibold text-slate-500 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            </div>
          </div>

          
          <div
            id="card-plumbers"
            className="bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200 border-t-[3px] border-t-sky-500 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-sky-100 text-sky-700">
                    <Wrench className="w-2.5 h-2.5 shrink-0" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
                    {plumberRoleLabel.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-white text-sky-800 border border-sky-200/80 shadow-2xs">
                  {plumbersList.length}
                </span>
              </div>
              {renderCardContent(plumbersList, 'plumber')}
            </div>
            <div className="pt-1.5 mt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">
                {plumbersList.filter((w) => w.status === 'available').length} free
              </span>
              <button
                type="button"
                onClick={() => handleOpenRoster('plumber', 'all')}
                className="font-semibold text-slate-500 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            </div>
          </div>

          
          <div
            id="card-drivers"
            className="bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200 border-t-[3px] border-t-emerald-600 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-emerald-100 text-emerald-700">
                    <Truck className="w-2.5 h-2.5 shrink-0" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
                    {driverRoleLabel.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-white text-emerald-800 border border-emerald-200/80 shadow-2xs">
                  {driversList.length}
                </span>
              </div>
              {renderCardContent(driversList, 'driver')}
            </div>
            <div className="pt-1.5 mt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">
                {driversList.filter((w) => w.status === 'available').length} free
              </span>
              <button
                type="button"
                onClick={() => handleOpenRoster('driver', 'all')}
                className="font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        
        <div id="worker-overview-multi-specialist-section" className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                <span>MULTI-SPECIALIST TEAM ASSIGNMENTS</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold border ${
                    multiSpecialistJobs.length > 0
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {multiSpecialistJobs.length} {multiSpecialistJobs.length === 1 ? 'Job' : 'Jobs'}
                </span>
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-normal hidden sm:inline">
              {multiSpecialistJobs.length > 0
                ? 'Jobs staffed by multiple engineers, welders, or plumbers working concurrently'
                : 'When 2+ specialists are assigned to a job, their joint crew rosters appear here'}
            </span>
          </div>

          {multiSpecialistJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {multiSpecialistJobs.map((job) => {
                const specs = getJobSpecialists(job);
                const driver = workers.find((w) => w.id === job.driverId);
                const timeWindowInfo = getTimeWindowDisplay(job);

                return (
                  <div
                    key={job.id}
                    id={`multi-specialist-card-${job.id}`}
                    className="bg-indigo-50/40 hover:bg-indigo-50/70 border border-indigo-200/90 rounded-lg p-3 flex flex-col justify-between shadow-2xs transition-all text-xs"
                  >
                    <div>
                      
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInteractingJob(job);
                            }}
                            className="font-mono font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs group"
                            title={`Click to inspect Job #${job.code}: ${job.title}`}
                          >
                            <span>{job.code}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-600 opacity-60 group-hover:opacity-100" />
                          </button>
                          <span
                            className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              job.priority === 'urgent'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : job.priority === 'high'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {job.priority}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            job.status === 'completed'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : job.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : job.status === 'en_route' || job.status === 'on_site' || job.status === 'in_progress'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      
                      <div className="font-bold text-slate-900 text-xs mb-1 line-clamp-2" title={job.title}>
                        {job.title}
                      </div>

                      
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3 text-[#107c41] shrink-0" />
                        <span className="truncate">{job.siteLocation.name}</span>
                        <span className="text-slate-400">•</span>
                        <span className="truncate">{job.clientName}</span>
                      </div>

                      
                      <div className="bg-white rounded border border-indigo-100 p-2 mb-2 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-600" />
                            Assigned Crew ({specs.length} Specialists)
                          </span>
                          <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                            Co-Assigned
                          </span>
                        </div>

                        <div className="space-y-1 pt-0.5">
                          {specs.map((spec) => (
                            <div key={spec.id} className="flex items-center justify-between gap-1 text-[11px]">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {spec.role === 'welder' ? (
                                  <Flame className="w-3 h-3 text-orange-600 shrink-0" />
                                ) : spec.role === 'plumber' ? (
                                  <Wrench className="w-3 h-3 text-cyan-600 shrink-0" />
                                ) : (
                                  <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                                )}
                                <span className="font-semibold text-slate-900 truncate">{spec.name}</span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  ({spec.roleTitle || spec.role})
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                                  spec.status === 'on_site'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : spec.status === 'en_route'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {spec.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {driver && (
                          <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600">
                            <div className="flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="font-medium">Driver: {driver.name}</span>
                            </div>
                            <span className="text-slate-400 font-mono">{driver.vehicleInfo?.plate || 'Van'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    
                    <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-500 text-[10.5px]">
                        {timeWindowInfo.commuteStart || job.timeWindow.start} ({job.estimatedDurationHours || 2}h)
                      </span>
                      <button
                        type="button"
                        onClick={() => setInteractingJob(job)}
                        className="font-bold text-[#107c41] hover:text-[#0b5c30] flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-200 hover:border-emerald-300 transition-colors shadow-2xs"
                      >
                        <span>Inspect Job</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-xs">
              <p className="font-medium">No multi-specialist jobs currently scheduled for this date.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When 2 or more specialists are assigned to a job, this section dynamically tracks joint crews, active locations, and member statuses.
              </p>
            </div>
          )}
        </div>
      </div>

      
      <div className="bg-[#aad3b1] text-black border border-slate-300 rounded-lg p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-6 h-6 rounded bg-[#107c41] text-white flex items-center justify-center shadow-2xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                Jobs ({filteredJobs.length})
              </span>

              
              <div className="inline-flex rounded border border-slate-300 p-0.5 bg-slate-100 text-xs">
                <button
                  id="btn-schedule-view-table"
                  onClick={() => {
                    setScheduleMode('table');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                    scheduleMode === 'table'
                      ? 'bg-white text-[#107c41] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="View standard job schedule table"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  id="btn-schedule-view-list"
                  onClick={() => {
                    setScheduleMode('list');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                    scheduleMode === 'list'
                      ? 'bg-white text-[#107c41] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="View cards and detailed list layout"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Cards View</span>
                </button>
              </div>

              
              {(() => {
                const activeJobs = targetJobs.filter(j => !(j.status || '').toLowerCase().includes('cancel'));
                const total = activeJobs.length;
                const weightedSum = activeJobs.reduce((acc, j) => {
                  const s = (j.status || '').toLowerCase();
                  if (s.includes('complet') || s === 'done') return acc + 1;
                  if (s.includes('prog') || s.includes('site') || s.includes('route') || s.includes('transit') || s.includes('active')) return acc + 0.5;
                  return acc;
                }, 0);
                const pct = total > 0 ? Math.round((weightedSum / total) * 100) : 0;
                return (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs" title={`Progress for ${dateScope === 'all' ? 'all dates' : selectedDate} (Completed = 100%, In Progress / On Site = 50%, Scheduled = 0%)`}>
                    <span className="font-bold text-slate-700 text-[11px]">Progress:</span>
                    <span className="font-extrabold text-[#107c41]">{pct}%</span>
                    <div className="w-24 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#107c41] transition-all duration-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              
              <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                <button
                  id="btn-date-scope-selected"
                  onClick={() => setDateScope('selected')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    dateScope === 'selected'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title={`View jobs scheduled for ${selectedDate}`}
                >
                  {selectedDate}
                </button>
                <button
                  id="btn-date-scope-all"
                  onClick={() => setDateScope('all')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    dateScope === 'all'
                      ? 'bg-[#107c41] text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="View all jobs across all dates"
                >
                  All Dates ({jobs.length})
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            <input
              type="text"
              placeholder="Search jobs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="border border-[#164724] rounded px-2 py-1 text-xs text-[#8b94a3] placeholder:text-slate-400 focus:outline-none focus:border-[#107c41] bg-white"
            />
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                showMap
                  ? 'bg-emerald-50 text-[#107c41] border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {showMap ? 'Hide Map' : 'Map'}
            </button>
          </div>
        </div>

        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-xs">
          
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[#606a79] font-semibold text-[10px] uppercase shrink-0">
              {settings.dropdownCategoryLabels?.jobStatuses || 'Status'}:
            </span>
            <button
              id="filter-status-all"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border border-[#5e7ba1] ${
                statusFilter === 'all'
                  ? 'bg-[#107c41] text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({baseJobs.length})
            </button>
            {(settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'In Progress', 'Completed', 'Cancelled']).map((st) => {
              const count = baseJobs.filter((j) => matchJobStatus(j.status, st)).length;
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  id={`filter-status-${st.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setStatusFilter(isSelected ? 'all' : st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border border-[#5e7ba1] ${
                    isSelected
                      ? 'bg-[#107c41] text-white font-semibold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>

          
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[#606a79] font-semibold text-[10px] uppercase shrink-0">
              {settings.dropdownCategoryLabels?.priorities || 'Priority'}:
            </span>
            <button
              id="filter-priority-all"
              onClick={() => setPriorityFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                priorityFilter === 'all'
                  ? 'bg-slate-800 text-white font-semibold border-slate-800 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {(settings.dropdownConfig?.priorities || ['Urgent', 'High', 'Normal', 'Low']).map((pr) => {
              const count = baseJobs.filter((j) => (j.priority || '').toLowerCase() === pr.toLowerCase()).length;
              const isSelected = priorityFilter.toLowerCase() === pr.toLowerCase();
              const isUrgent = pr.toLowerCase().includes('urgent');
              const isHigh = pr.toLowerCase().includes('high');
              const isNormal = pr.toLowerCase().includes('normal') || pr.toLowerCase().includes('medium');
              return (
                <button
                  key={pr}
                  id={`filter-priority-${pr.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setPriorityFilter(isSelected ? 'all' : pr)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-800 text-white font-semibold border-slate-800 shadow-2xs'
                      : isUrgent
                      ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                      : isHigh
                      ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                      : isNormal
                      ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {pr} ({count})
                </button>
              );
            })}
          </div>
        </div>

        
        <ToolsSummary className="mt-2.5" onSelectJob={(job) => setInteractingJob(job)} />

        
        <VehicleSummary className="mt-2.5" onSelectJob={(job) => setInteractingJob(job)} />
      </div>

      {scheduleMode === 'list' ? (
        <JobsView />
      ) : (
        <>
          
          {showMap && (
            <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs">
              <RouteMapVisualizer />
            </div>
          )}

          
          <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="excel-table text-left border-collapse w-full">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-semibold border-b border-slate-300 select-none">
                    <th className="excel-th w-10 text-center bg-slate-200">#</th>
                    {jobListColumns.filter(c => c.visible).map(c => {
                      switch (c.id) {
                        case 'code': return <th key="code" className="excel-th w-24">{c.label}</th>;
                        case 'timeWindow': return <th key="timeWindow" className="excel-th min-w-[170px] bg-slate-100/90 text-[#107c41] font-bold">{c.label}</th>;
                        case 'clientName': return <th key="clientName" className="excel-th min-w-[150px]">{c.label}</th>;
                        case 'siteLocation': return <th key="siteLocation" className="excel-th min-w-[220px]">{c.label}</th>;
                        case 'jobTitle': return <th key="jobTitle" className="excel-th min-w-[200px]">{c.label}</th>;
                        case 'fieldSpecialist': return <th key="fieldSpecialist" className="excel-th min-w-[180px]">{c.label}</th>;
                        case 'driverVehicle': return <th key="driverVehicle" className="excel-th min-w-[190px]">{c.label}</th>;
                        case 'priority': return <th key="priority" className="excel-th w-24">{c.label}</th>;
                        case 'jobStatus': return <th key="jobStatus" className="excel-th min-w-[170px] bg-emerald-50/60 text-[#107c41] font-bold">{c.label}</th>;
                        case 'connectedActivity': return <th key="connectedActivity" className="excel-th min-w-[140px]">{c.label}</th>;
                        default: return <th key={c.id} className="excel-th min-w-[150px]">{c.label}</th>;
                      }
                    })}
                    <th className="excel-th w-24 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={jobListColumns.filter(c => c.visible).length + 2} className="text-center py-10 text-slate-500 bg-slate-50">
                        <p className="font-semibold text-slate-700">
                          {dateScope === 'all' ? 'No jobs found across all dates' : `No jobs scheduled for ${selectedDate}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Insert a new job appointment row to begin</p>
                        {currentRole === 'manager' && (
                          <button
                            id="btn-empty-insert-job"
                            onClick={() => setIsAddJobOpen(true)}
                            className="mt-3 px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Insert Job Row
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                filteredJobs.map((job, idx) => {
                  const specIds = Array.from(new Set([
                    ...(job.specialistIds || []),
                    ...(job.engineerId ? [job.engineerId] : [])
                  ]));
                  const jobSpecialists = specIds.map(id => workers.find(w => w.id === id)).filter(Boolean) as typeof workers;
                  const driverIds = Array.from(new Set([
                    ...(job.driverIds || []),
                    ...(job.driverId ? [job.driverId] : [])
                  ]));
                  const jobDrivers = driverIds.map(id => workers.find(w => w.id === id)).filter(Boolean) as typeof workers;
                  const timeWindowInfo = getTimeWindowDisplay(job);
                  const activeViewers = connectedUsers.filter(
                    (u) => u.focusJobId === job.id && u.id !== currentUser.id
                  );
                  const noteCount = job.interactionNotes?.length || 0;

                  return (
                    <tr
                      key={job.id}
                      id={`excel-row-${job.id}`}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('select') || target.closest('input')) {
                          return;
                        }
                        setEditingJob(job);
                      }}
                      className={`excel-row hover:bg-emerald-50/40 transition-colors border-b border-slate-200 text-slate-800 cursor-pointer ${
                        activeViewers.length > 0 ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      
                      <td className="excel-td text-center font-mono font-semibold bg-slate-50 text-slate-400 text-[11px] w-10">
                        {idx + 1}
                      </td>

                      {jobListColumns.filter(c => c.visible).map(c => {
                        switch (c.id) {
                          case 'code': return (
                            <td key="code" className="excel-td">
                              <button
                                type="button"
                                onClick={() => setInteractingJob(job)}
                                className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#107c41] hover:text-[#0b5c30] bg-emerald-50/90 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                                title={`Open Job #${job.code}: ${job.title} • Client: ${job.clientName || 'Client'} • Click to view & interact`}
                                aria-label={`Open Job ${job.code}`}
                              >
                                <span>{job.code}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                              </button>
                            </td>
                          );
                          case 'timeWindow': return (
                            <td key="timeWindow" className="excel-td font-mono text-[11px] text-slate-700">
                              <div className="flex items-center gap-1 font-semibold text-slate-900">
                                <Clock className="w-3 h-3 text-[#107c41] shrink-0" />
                                <span>Commute: {timeWindowInfo.commuteStart}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    job.status === 'completed'
                                      ? 'bg-purple-50 text-purple-800 border-purple-300'
                                      : job.status === 'cancelled'
                                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                                      : job.status === 'en_route' || job.status === 'on_site' || job.status === 'in_progress'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {timeWindowInfo.spentLabel}
                                </span>
                                {dateScope === 'all' && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    <Calendar className="w-2.5 h-2.5 text-[#107c41] shrink-0" />
                                    {job.scheduledDate}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                          case 'clientName': return (
                            <td key="clientName" className="excel-td text-slate-800 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-900">{job.clientName}</span>
                              </div>
                            </td>
                          );
                          case 'siteLocation': return (
                            <td key="siteLocation" className="excel-td">
                              <div className="font-semibold text-slate-900 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#107c41] shrink-0" />
                                <span className="truncate">{job.siteLocation.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                                {job.siteLocation.address}
                              </div>
                            </td>
                          );
                          case 'jobTitle': return (
                            <td key="jobTitle" className="excel-td font-medium text-slate-900">
                              <div className="font-semibold text-slate-900">{job.title}</div>
                              {job.notes && (
                                <div className="text-[11px] text-slate-500 truncate max-w-xs">{job.notes}</div>
                              )}
                              {job.assignedTools && job.assignedTools.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {job.assignedTools.map((at, tIdx) => (
                                    <button
                                      key={tIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleToolReturn(at.toolId || at.toolName, job.id, !at.isReturned);
                                      }}
                                      className={`inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded font-mono border transition-colors cursor-pointer ${
                                        at.isReturned
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      }`}
                                      title={`Click to mark ${at.toolName} as ${at.isReturned ? 'Active Checkout' : 'Returned to Stock'}`}
                                    >
                                      <Wrench className="w-2.5 h-2.5 shrink-0" />
                                      <span>{at.toolName} (x{at.quantity || 1})</span>
                                      <span className="font-bold">{at.isReturned ? '✓ Returned' : '• Out'}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                          case 'fieldSpecialist': return (
                            <td key="fieldSpecialist" className="excel-td">
                              {jobSpecialists.length > 0 ? (
                                <div className="space-y-1.5">
                                  {jobSpecialists.length > 1 && (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold shadow-2xs mb-0.5">
                                      <Users className="w-3 h-3 text-indigo-600" />
                                      <span>Multi-Specialist Crew ({jobSpecialists.length})</span>
                                    </div>
                                  )}
                                  {jobSpecialists.map((spec, sIdx) => (
                                    <div key={sIdx}>
                                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                                        {spec.role === 'welder' ? (
                                          <Flame className="w-3 h-3 text-orange-600 shrink-0" />
                                        ) : spec.role === 'plumber' ? (
                                          <Wrench className="w-3 h-3 text-cyan-600 shrink-0" />
                                        ) : (
                                          <User className="w-3 h-3 text-indigo-600 shrink-0" />
                                        )}
                                        <span>{spec.name}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-sans">
                                        {spec.roleTitle || (spec.role === 'welder' ? 'Welder' : spec.role === 'plumber' ? 'Plumber' : 'Engineer')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                          );
                          case 'driverVehicle': return (
                            <td key="driverVehicle" className="excel-td">
                              {jobDrivers.length > 0 ? (
                                <div className="space-y-1.5">
                                  {jobDrivers.map((drv, dIdx) => (
                                    <div key={dIdx}>
                                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                                        <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>{drv.name}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        {drv.vehicleInfo?.model || 'Fleet Van'} ({drv.vehicleInfo?.plate || 'Plate N/A'})
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No Vehicle</span>
                              )}
                            </td>
                          );
                          case 'priority': return (
                            <td key="priority" className="excel-td">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                  job.priority === 'urgent'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : job.priority === 'high'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-slate-50 text-slate-700 border-slate-300'
                                }`}
                              >
                                {job.priority}
                              </span>
                            </td>
                          );
                          case 'jobStatus': return (
                            <td key="jobStatus" className="excel-td">
                              <select
                                id={`job-status-select-${job.id}`}
                                value={getDisplayJobStatus(job.status, settings.dropdownConfig?.jobStatuses)}
                                onChange={(e) => updateJobStatus(job.id, e.target.value as JobStatus)}
                                aria-label={`Mark status for job ${job.code}`}
                                className={`text-xs font-bold rounded px-2 py-1.5 border shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#107c41]/30 cursor-pointer w-full transition-colors ${
                                  job.status.toLowerCase().includes('site')
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-400 hover:bg-emerald-100'
                                    : (job.status.toLowerCase().includes('route') || job.status.toLowerCase().includes('transit'))
                                    ? 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
                                    : job.status.toLowerCase().includes('complete')
                                    ? 'bg-purple-50 text-purple-900 border-purple-400 hover:bg-purple-100'
                                    : job.status.toLowerCase().includes('cancel')
                                    ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                                    : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                                }`}
                              >
                                {(settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'Completed', 'Cancelled']).map(st => (
                                  <option key={st} value={st} className="bg-white text-slate-900 font-medium">
                                    {st.toLowerCase().includes('complete') ? '✅ ' : st.toLowerCase().includes('transit') || st.toLowerCase().includes('route') ? '🚚 ' : st.toLowerCase().includes('site') ? '📍 ' : st.toLowerCase().includes('cancel') ? '❌ ' : '🕒 '}
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                          case 'connectedActivity': return (
                            <td key="connectedActivity" className="excel-td">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setInteractingJob(job)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#107c41] border border-slate-300 hover:border-emerald-300 text-[11px] font-semibold transition-colors"
                                  title="Open live collaboration and interaction notes"
                                >
                                  <MessageSquare className="w-3 h-3 text-[#107c41]" />
                                  <span>Notes ({noteCount})</span>
                                </button>
                                {activeViewers.length > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300"
                                    title={`${activeViewers.map((u) => u.name).join(', ')} currently inspecting`}
                                  >
                                    <Eye className="w-2.5 h-2.5 text-emerald-700 animate-pulse" />
                                    <span>{activeViewers.length}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                          default: return (
                            <td key={c.id} className="excel-td text-slate-700 font-medium">
                              {job.customFields?.[c.id] || '-'}
                            </td>
                          );
                        }
                      })}

                      
                      <td className="excel-td text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setInteractingJob(job)}
                            className="p-1 rounded text-[#107c41] hover:bg-emerald-50"
                            title="Interact / View Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {currentRole === 'manager' && (
                            <>
                              <button
                                onClick={() => setEditingJob(job)}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                title="Edit Job Row"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteJob(job.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                                title="Delete Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              
              <tr className="bg-slate-50 border-t border-slate-300 text-xs">
                <td className="excel-td text-center font-mono text-slate-400 bg-slate-200/60 font-semibold">
                  +
                </td>
                <td colSpan={jobListColumns.filter(c => c.visible).length + 1} className="excel-td py-2">
                  <button
                    id="btn-excel-quick-insert-job"
                    onClick={() => setIsAddJobOpen(true)}
                    className="text-xs font-semibold text-[#107c41] hover:text-[#0b5c30] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert New Job Appointment Row...</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

      
      <SpecialistRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        initialRole={rosterModalRole}
        initialStatus={rosterModalStatus}
        initialSearchQuery={rosterModalSearch}
        onSelectJob={(job) => setInteractingJob(job)}
      />
    </div>
  );
};
