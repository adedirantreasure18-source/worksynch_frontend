import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, JobPriority, WorkerStatus } from '../types';
import { INITIAL_SETTINGS } from '../data/initialData';
import {
  Clock,
  MapPin,
  Truck,
  User,
  Plus,
  Search,
  Trash2,
  Edit,
  Building2,
  FileSpreadsheet,
  MessageSquare,
  Eye,
  CheckCircle,
  ExternalLink,
  Flame,
  Wrench,
  Users,
} from 'lucide-react';
import { getTimeWindowDisplay } from '../utils/timeWindowUtils';
import { getDisplayJobStatus, matchJobStatus } from '../utils/statusUtils';

export const JobsView: React.FC = () => {
  const {
    jobs,
    workers,
    selectedDate,
    setSelectedDate,
    setIsAddJobOpen,
    setEditingJob,
    deleteJob,
    updateWorker,
    updateJobStatus,
    connectedUsers,
    currentUser,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredJobs = jobs
    .filter((job) => {
      if (dateScope === 'selected' && job.scheduledDate !== selectedDate) return false;
      if (statusFilter !== 'all' && !matchJobStatus(job.status, statusFilter)) return false;
      if (priorityFilter !== 'all' && job.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const eng = workers.find((w) => w.id === job.engineerId)?.name.toLowerCase() || '';
        const drv = workers.find((w) => w.id === job.driverId)?.name.toLowerCase() || '';
        return (
          job.title.toLowerCase().includes(q) ||
          job.code.toLowerCase().includes(q) ||
          job.clientName.toLowerCase().includes(q) ||
          job.siteLocation.name.toLowerCase().includes(q) ||
          job.siteLocation.address.toLowerCase().includes(q) ||
          eng.includes(q) ||
          drv.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const PRIORITY_ORDER: Record<JobPriority, number> = {
        urgent: 1,
        high: 2,
        normal: 3,
        low: 4,
      };
      const pA = PRIORITY_ORDER[a.priority] ?? 99;
      const pB = PRIORITY_ORDER[b.priority] ?? 99;
      if (pA !== pB) return pA - pB;
      return (a.timeWindow?.start || '').localeCompare(b.timeWindow?.start || '') || a.code.localeCompare(b.code);
    });

  return (
    <div className="space-y-4">
      
      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search site, client, worker, job code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#107c41]"
            />
          </div>

          
          <div>
            <select
              value={dateScope}
              onChange={(e) => setDateScope(e.target.value as any)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] bg-white font-medium"
            >
              <option value="selected">Selected Date ({selectedDate})</option>
              <option value="all">All Dates ({jobs.length} total jobs)</option>
            </select>
          </div>

          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] bg-white"
            >
              <option value="all">All {settings.dropdownCategoryLabels?.jobStatuses || 'Statuses'}</option>
              {(settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'In Progress', 'Completed', 'Cancelled']).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#107c41] bg-white"
            >
              <option value="all">All {settings.dropdownCategoryLabels?.priorities || 'Priorities'}</option>
              {(settings.dropdownConfig?.priorities || ['Urgent', 'High', 'Normal', 'Low']).map((pr) => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      
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
                    case 'siteLocation': return <th key="siteLocation" className="excel-th min-w-[210px]">{c.label}</th>;
                    case 'jobTitle': return <th key="jobTitle" className="excel-th min-w-[190px]">{c.label}</th>;
                    case 'fieldSpecialist': return <th key="fieldSpecialist" className="excel-th min-w-[160px]">{c.label}</th>;
                    case 'driverVehicle': return <th key="driverVehicle" className="excel-th min-w-[160px]">{c.label}</th>;
                    case 'priority': return <th key="priority" className="excel-th w-20">{c.label}</th>;
                    case 'jobStatus': return <th key="jobStatus" className="excel-th min-w-[170px] bg-emerald-50/60 text-[#107c41] font-bold">{c.label}</th>;
                    case 'connectedActivity': return <th key="connectedActivity" className="excel-th min-w-[150px]">{c.label}</th>;
                    default: return <th key={c.id} className="excel-th min-w-[150px]">{c.label}</th>;
                  }
                })}
                <th className="excel-th w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={jobListColumns.filter(c => c.visible).length + 2} className="text-center py-8 text-slate-500 bg-slate-50">
                    No matching appointments found.
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
                      className={`excel-row hover:bg-emerald-50/40 transition-colors border-b border-slate-200 text-slate-800 ${
                        activeViewers.length > 0 ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="excel-td text-center font-mono font-semibold bg-slate-50 text-slate-400 text-[11px]">
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
                              <div className="mt-1">
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
                              </div>
                              <div className="text-[10px] text-slate-400 font-sans mt-0.5">{job.scheduledDate}</div>
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
                              <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{job.siteLocation.address}</div>
                              {job.siteLocation.zone && (
                                <div className="text-[9px] text-slate-400 truncate">{job.siteLocation.zone}</div>
                              )}
                            </td>
                          );
                          case 'jobTitle': return (
                            <td key="jobTitle" className="excel-td">
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
                                      <div className="flex items-center gap-1">
                                        {spec.role === 'welder' ? (
                                          <Flame className="w-3 h-3 text-orange-600 shrink-0" />
                                        ) : spec.role === 'plumber' ? (
                                          <Wrench className="w-3 h-3 text-cyan-600 shrink-0" />
                                        ) : (
                                          <User className="w-3 h-3 text-indigo-600 shrink-0" />
                                        )}
                                        <span className="font-medium text-slate-900">{spec.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <select
                                          value={spec.status}
                                          onChange={(e) => updateWorker(spec.id, { status: e.target.value as WorkerStatus })}
                                          className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none focus:border-[#107c41] max-w-[100px] truncate"
                                        >
                                          <option value="available">Available</option>
                                          <option value="en_route">In Transit</option>
                                          <option value="on_site">On Site</option>
                                          <option value="completed">Off-site</option>
                                          <option value="off_duty">Off Duty</option>
                                          <option value="on_leave">On Leave</option>
                                        </select>
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
                                      <div className="flex items-center gap-1">
                                        <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span className="font-medium text-slate-900">{drv.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <select
                                          value={drv.status}
                                          onChange={(e) => updateWorker(drv.id, { status: e.target.value as WorkerStatus })}
                                          className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none focus:border-[#107c41] max-w-[100px] truncate"
                                        >
                                          <option value="available">Available</option>
                                          <option value="en_route">In Transit</option>
                                          <option value="on_site">On Site</option>
                                          <option value="completed">Off-site</option>
                                          <option value="off_duty">Off Duty</option>
                                          <option value="on_leave">On Leave</option>
                                        </select>
                                      </div>
                                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
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
                                id={`jobs-view-status-select-${job.id}`}
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
                                  title="Open live collaboration and interaction modal"
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
                            <td key={c.id} className="excel-td">
                              {job.customFields?.[c.id] || <span className="text-slate-400 italic text-[10px]">Empty</span>}
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
                          <button
                            onClick={() => setEditingJob(job)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

