import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, JobPriority } from '../types';
import { getTimeWindowDisplay } from '../utils/timeWindowUtils';
import { matchJobStatus } from '../utils/statusUtils';
import { getEffectiveLeaveInfo } from '../utils/leaveUtils';
import {
  X,
  MessageSquare,
  Send,
  User,
  Truck,
  Clock,
  MapPin,
  CheckCircle,
  Eye,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Users,
  Flame,
  Wrench,
  Zap,
} from 'lucide-react';

interface JobInteractionModalProps {
  job: Job | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const JobInteractionModal: React.FC<JobInteractionModalProps> = ({
  job: initialJob,
  isOpen = true,
  onClose,
}) => {
  const {
    jobs,
    workers,
    updateJobStatus,
    addJobNote,
    reassignJob,
    currentUser,
    setFocusedJobId,
    connectedUsers,
    settings,
  } = useApp();

  const job = initialJob ? jobs.find((j) => j.id === initialJob.id) || initialJob : null;
  
  const availableStatuses = settings.dropdownConfig?.jobStatuses || ['Scheduled', 'In Transit', 'On Site', 'In Progress', 'Completed', 'Cancelled'];

  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>(job?.status || 'scheduled');
  const [selectedEngId, setSelectedEngId] = useState(job?.engineerId || '');
  const [selectedDrvId, setSelectedDrvId] = useState(job?.driverId || '');

  
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  
  useEffect(() => {
    if (isOpen && job) {
      setFocusedJobId(job.id);
      setSelectedStatus(job.status);
      setSelectedEngId(job.engineerId);
      setSelectedDrvId(job.driverId);
    } else {
      setFocusedJobId(null);
    }
  }, [isOpen, job?.id, setFocusedJobId]);

  if (!isOpen || !job) return null;

  const engineer = workers.find((w) => w.id === selectedEngId) || workers.find((w) => w.id === job.engineerId);
  const driver = workers.find((w) => w.id === selectedDrvId) || workers.find((w) => w.id === job.driverId);
  const allSpecialists = workers.filter((w) => w.role !== 'driver');
  const allDrivers = workers.filter((w) => w.role === 'driver');

  
  const otherViewers = connectedUsers.filter(
    (u) => u.focusJobId === job.id && u.id !== currentUser.id
  );

  const handleStatusChange = async (newStatus: JobStatus) => {
    setSelectedStatus(newStatus);
    await updateJobStatus(job.id, newStatus);
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    await addJobNote(job.id, noteContent.trim());
    setNoteContent('');
    setIsSubmittingNote(false);
  };

  const handleReassign = async () => {
    if (selectedEngId !== job.engineerId || selectedDrvId !== job.driverId) {
      await reassignJob(job.id, selectedEngId, selectedDrvId);
    }
  };

  return (
    <div
      id="job-interaction-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="job-interaction-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
      >
        
        <div className="bg-[#107c41] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-xs">
              {job.code}
            </span>
            <h2 className="text-sm font-bold tracking-tight truncate max-w-md">
              {job.title}
            </h2>
          </div>
          <button
            id="btn-close-interaction-modal"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        
        {otherViewers.length > 0 && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <Eye className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
            <span>
              Also currently viewing: <strong>{otherViewers.map((u) => u.name).join(', ')}</strong>
            </span>
          </div>
        )}

        
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {(() => {
            const timeWindowInfo = getTimeWindowDisplay(job);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded p-3">
                
                <div className="bg-white p-2.5 rounded border border-slate-200/80 space-y-1">
                  <div className="text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#107c41]" />
                    <span className="font-semibold text-slate-700">Time Window & Commute</span>
                  </div>
                  <div className="font-semibold text-slate-900 mt-1 font-mono text-[13px]">
                    Commute: {timeWindowInfo.commuteStart}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
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
                  <div className="text-slate-500 text-[11px] mt-1">
                    Scheduled: {job.scheduledDate}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        job.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : job.priority === 'high'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      Priority: {job.priority}
                    </span>
                  </div>
                </div>

                
                <div className="bg-white p-2.5 rounded border border-slate-200/80 space-y-1">
                  <div className="text-slate-500 font-medium flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#107c41]" />
                    <span className="font-semibold text-slate-700">Client Name & Site Location</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 text-[13px]">{job.clientName}</div>
                  <div className="text-slate-800 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#107c41] shrink-0" />
                    <span>{job.siteLocation.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{job.siteLocation.address}</div>
                  {job.siteLocation.zone && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{job.siteLocation.zone}</div>
                  )}
                </div>
              </div>
            );
          })()}

          
          <div className="border border-slate-200 rounded p-3 bg-white">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Live Job Status (Syncs to All Connected Users):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {availableStatuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`px-2 py-2 rounded text-xs font-bold uppercase border transition-all text-center flex items-center justify-center gap-1 ${
                    matchJobStatus(job.status, st)
                      ? st.toLowerCase().includes('completed')
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : st.toLowerCase().includes('cancelled')
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-[#107c41] text-white border-[#107c41] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {matchJobStatus(job.status, st) && <CheckCircle className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{st}</span>
                </button>
              ))}
            </div>
          </div>

          
          <div className="border border-slate-200 rounded p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Team Crew Assignment</span>
              {(selectedEngId !== job.engineerId || selectedDrvId !== job.driverId) && (
                <button
                  onClick={handleReassign}
                  className="px-2 py-0.5 bg-[#107c41] text-white rounded text-[11px] font-semibold hover:bg-[#0b5c30]"
                >
                  Apply Reassignment
                </button>
              )}
            </div>

            
            {(() => {
              const specIds = Array.from(new Set([...(job.specialistIds || []), ...(job.engineerId ? [job.engineerId] : [])]));
              if (specIds.length <= 1) return null;
              const crewSpecialists = specIds.map((id) => workers.find((w) => w.id === id)).filter(Boolean);
              return (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-900 font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Multi-Specialist Joint Crew ({crewSpecialists.length} Specialists Assigned)</span>
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold">
                      Active Joint Deployment
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {crewSpecialists.map((sp) => (
                      <span
                        key={sp.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-indigo-200 text-slate-800 text-[11px] font-medium shadow-2xs"
                      >
                        {sp.role === 'welder' ? (
                          <Flame className="w-3 h-3 text-orange-600 shrink-0" />
                        ) : sp.role === 'plumber' ? (
                          <Wrench className="w-3 h-3 text-cyan-600 shrink-0" />
                        ) : (
                          <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                        )}
                        <span>{sp.name}</span>
                        <span className="text-[9.5px] text-slate-500 font-sans">
                          ({sp.roleTitle || sp.role})
                        </span>
                        <span
                          className={`ml-0.5 text-[8.5px] font-bold px-1 rounded uppercase ${
                            sp.status === 'on_site'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sp.status === 'en_route'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sp.status.replace('_', ' ')}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-600" />
                  <span>Field Specialist (Engineer / Welder / Plumber):</span>
                </label>
                <select
                  value={selectedEngId}
                  onChange={(e) => {
                    setSelectedEngId(e.target.value);
                    reassignJob(job.id, e.target.value, selectedDrvId);
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#107c41]"
                >
                  {allSpecialists.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name} - {spec.roleTitle || (spec.role === 'welder' ? 'Welder' : spec.role === 'plumber' ? 'Plumber' : 'Engineer')} ({spec.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-amber-600" />
                  <span>Transport Driver:</span>
                </label>
                <select
                  value={selectedDrvId}
                  onChange={(e) => {
                    setSelectedDrvId(e.target.value);
                    reassignJob(job.id, selectedEngId, e.target.value);
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#107c41]"
                >
                  <option value="">-- No Driver Assigned --</option>
                  {allDrivers.map((drv) => {
                    const leaveInfo = getEffectiveLeaveInfo(drv, job.scheduledDate);
                    const leaveText = leaveInfo.isOnLeave
                      ? ' [On Leave]'
                      : leaveInfo.daysUntilLeave !== null && leaveInfo.daysUntilLeave !== undefined && leaveInfo.daysUntilLeave <= 7
                      ? ` [Leaves in ${leaveInfo.daysUntilLeave}d]`
                      : '';
                    return (
                      <option key={drv.id} value={drv.id}>
                        {drv.name} ({drv.vehicleInfo?.plate || drv.vehicleInfo?.model || 'Fleet Unit'}){leaveText}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          
          {(job.notes || job.routeNotes) && (
            <div className="border border-slate-200 rounded p-3 bg-slate-50 text-slate-700 space-y-1">
              {job.notes && (
                <div>
                  <span className="font-semibold text-slate-900">Work Scope: </span>
                  <span>{job.notes}</span>
                </div>
              )}
              {job.routeNotes && (
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Transport & Facility Notes: </span>
                  <span>{job.routeNotes}</span>
                </div>
              )}
            </div>
          )}

          
          <div className="border border-slate-200 rounded p-3 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MessageSquare className="w-3.5 h-3.5 text-[#107c41]" />
                <span>Live Field Interaction Notes ({job.interactionNotes?.length || 0})</span>
              </div>
              <span className="text-[11px] text-slate-400">Broadcasting live to all users</span>
            </div>

            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(!job.interactionNotes || job.interactionNotes.length === 0) ? (
                <div className="py-4 text-center text-slate-400 text-xs italic">
                  No interaction notes posted yet. Add the first update below!
                </div>
              ) : (
                job.interactionNotes.map((note, idx) => {
                  const roleBadgeColor =
                    note.authorRole === 'manager'
                      ? 'bg-emerald-100 text-emerald-800'
                      : note.authorRole === 'engineer'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800';

                  return (
                    <div
                      key={note.id ? `${note.id}-${idx}` : `note-${idx}`}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{note.authorName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${roleBadgeColor}`}>
                            {note.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{note.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            
            <form onSubmit={handleSendNote} className="flex items-center gap-2 pt-1">
              <input
                id="input-interaction-note"
                type="text"
                placeholder={`Post update as ${currentUser.name} (${currentUser.role})...`}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#107c41]"
              />
              <button
                id="btn-send-interaction-note"
                type="submit"
                disabled={!noteContent.trim() || isSubmittingNote}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Post Note</span>
              </button>
            </form>
          </div>
        </div>

        
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected as {currentUser.name}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
