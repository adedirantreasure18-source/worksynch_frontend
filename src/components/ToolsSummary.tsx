import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Wrench,
  CheckCircle2,
  Package,
  RotateCcw,
  ExternalLink,
  User,
  ArrowUpRight,
  Calendar,
  History,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Job } from '../types';

interface ToolsSummaryProps {
  className?: string;
  onSelectJob?: (job: Job) => void;
}

export const ToolsSummary: React.FC<ToolsSummaryProps> = ({
  className = '',
  onSelectJob,
}) => {
  const { settings, jobs, workers, toggleToolReturn, setInteractingJob, openSettingsTab } = useApp();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'in_field' | 'returned' | 'in_depot'>('in_field');

  const handleOpenJob = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
    } else if (setInteractingJob) {
      setInteractingJob(job);
    }
  };

  const tools = (settings.tools || []).filter(t => (t.name || '').trim().length > 0);

  if (tools.length === 0) {
    return null;
  }

  
  let totalInventoryUnits = 0;
  let totalInFieldUnits = 0;

  tools.forEach(tool => {
    const entered = Number(tool.quantity || 0);
    totalInventoryUnits += entered;

    if (tool.assignments && tool.assignments.length > 0) {
      tool.assignments.forEach(a => {
        if (!a.isReturned) {
          totalInFieldUnits += Number(a.assigned || 0);
        }
      });
    } else if (!tool.isReturned && Number(tool.assigned || 0) > 0) {
      totalInFieldUnits += Number(tool.assigned || 0);
    }
  });

  const availableUnits = Math.max(0, totalInventoryUnits - totalInFieldUnits);

  
  const allCheckoutItems = tools.flatMap((tool) => {
    const entered = Number(tool.quantity || 0);

    if (tool.assignments && tool.assignments.length > 0) {
      return tool.assignments
        .filter(assignment => Number(assignment.assigned || 0) > 0)
        .map((assignment) => {
          const isRet = Boolean(assignment.isReturned);
          const assignedQty = Number(assignment.assigned || 0);
          const remaining = isRet ? entered : Math.max(0, entered - assignedQty);

          
          const linkedJob = jobs.find(j => {
            if (!assignment.id) return false;
            const aid = assignment.id.trim().toLowerCase();
            const jid = j.id.trim().toLowerCase();
            const jcode = j.code.trim().toLowerCase();
            return (
              jid === aid ||
              jcode === aid ||
              jcode === aid.replace(/^#/, '') ||
              aid.includes(jcode) ||
              (assignment.signedBy && jcode === assignment.signedBy.trim().toLowerCase())
            );
          });
          let recipient = (assignment.signedBy || '').trim();

          if (!recipient && linkedJob) {
            const personnelIds = [
              ...(linkedJob.specialistIds || []),
              ...(linkedJob.engineerId ? [linkedJob.engineerId] : []),
              ...(linkedJob.driverIds || []),
              ...(linkedJob.driverId ? [linkedJob.driverId] : []),
            ];
            const foundWorker = workers.find(w => personnelIds.includes(w.id));
            if (foundWorker) {
              recipient = foundWorker.name;
            } else if (linkedJob.clientName) {
              recipient = `Site: ${linkedJob.siteLocation?.name || linkedJob.clientName}`;
            }
          }

          if (!recipient) {
            recipient = (tool.signedBy || '').trim() || 'Field Team';
          }

          return {
            id: `${tool.id}-${assignment.id}`,
            toolId: tool.id,
            jobId: assignment.id,
            linkedJob,
            name: tool.name.trim(),
            entered,
            assigned: assignedQty,
            remaining,
            signedBy: recipient,
            date: assignment.date || linkedJob?.scheduledDate || tool.date || 'Active',
            isReturned: isRet,
            details: tool.details,
          };
        });
    } else {
      const isRet = Boolean(tool.isReturned);
      const assignedQty = Number(tool.assigned || 0);
      const remaining = isRet ? entered : Math.max(0, entered - assignedQty);

      
      if (assignedQty <= 0) {
        return [];
      }

      return [{
        id: tool.id,
        toolId: tool.id,
        jobId: undefined,
        linkedJob: undefined,
        name: tool.name.trim(),
        entered,
        assigned: assignedQty,
        remaining,
        signedBy: (tool.signedBy || '').trim() || 'Depot Staff',
        date: tool.date || 'Active',
        isReturned: isRet,
        details: tool.details,
      }];
    }
  });

  const activeCheckouts = allCheckoutItems.filter(item => !item.isReturned && item.assigned > 0);
  const returnedCheckouts = allCheckoutItems.filter(item => item.isReturned && item.assigned > 0);

  
  const inDepotTools = tools.filter(t => {
    const hasActiveCheckout = activeCheckouts.some(c => c.toolId === t.id);
    return !hasActiveCheckout;
  });

  const handleToggleReturn = async (toolId: string, jobId: string | undefined, newStatus: boolean) => {
    const key = `${toolId}-${jobId || 'direct'}`;
    setIsUpdating(key);
    try {
      await toggleToolReturn(toolId, jobId, newStatus);
    } finally {
      setTimeout(() => setIsUpdating(null), 250);
    }
  };

  const displayedCheckoutItems = statusFilter === 'in_field'
    ? activeCheckouts
    : statusFilter === 'returned'
    ? returnedCheckouts
    : [];

  return (
    <div
      id="tools-summary-panel"
      className={`pt-2.5 mt-2.5 bg-white border border-slate-300 rounded-lg p-2.5 text-xs ${className}`}
    >
      
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
            <Wrench className="w-3.5 h-3.5 text-[#107c41] shrink-0" />
            <span>Tools Status</span>
          </div>

          
          <div className="flex items-center gap-1.5 text-[11px]">
            {totalInFieldUnits > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-[#5e7ba1] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                {totalInFieldUnits} in field
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 border border-[#5e7ba1] px-2 py-0.5 rounded-full">
                0 in field
              </span>
            )}

            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-[#5e7ba1] px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              {availableUnits} in store
            </span>

            <span className="text-[#282c32] font-normal">
              ({totalInventoryUnits} total stock)
            </span>
          </div>
        </div>

        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px]">
            <button
              type="button"
              id="btn-tools-filter-in-field"
              onClick={() => setStatusFilter('in_field')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'in_field'
                  ? 'bg-white text-amber-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Active tools currently checked out in the field"
            >
              In Field ({activeCheckouts.length})
            </button>
            <button
              type="button"
              id="btn-tools-filter-in-depot"
              onClick={() => setStatusFilter('in_depot')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'in_depot'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="All available stock in store"
            >
              Tools in Store ({availableUnits})
            </button>
            {returnedCheckouts.length > 0 && (
              <button
                type="button"
                id="btn-tools-filter-returned"
                onClick={() => setStatusFilter('returned')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'returned'
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="View equipment returned to store"
              >
                <History className="w-2.5 h-2.5" />
                <span>Returned ({returnedCheckouts.length})</span>
              </button>
            )}
          </div>

          <button
            type="button"
            id="btn-tools-manage-settings"
            onClick={() => openSettingsTab('tools')}
            className="text-[11px] font-medium text-slate-500 hover:text-[#107c41] flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-slate-100"
            title="Open Equipment in Settings"
          >
            <span>Settings</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      
      <div className="space-y-2">
        
        {statusFilter === 'in_field' && activeCheckouts.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">All tools are in store</span>
                <span className="text-[#41464d] ml-1.5">
                  ({availableUnits} equipment units ready for assignment)
                </span>
              </div>
            </div>

            
            <div className="flex flex-wrap gap-1.5">
              {tools.map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-emerald-200 text-slate-700 text-[11px] shadow-2xs"
                >
                  <Wrench className="w-2.5 h-2.5 text-emerald-600" />
                  <span className="font-medium">{t.name}</span>
                  <span className="font-mono text-emerald-700 font-bold">({t.quantity || 0})</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            
            {displayedCheckoutItems.length > 0 && (
              <div className="flex flex-col gap-1.5">
                
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 px-0.5 pt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'in_field' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                  <span>{statusFilter === 'in_field' ? 'In Field' : 'Returned History'} ({displayedCheckoutItems.length}):</span>
                </div>

                <AnimatePresence mode="popLayout">
                  {displayedCheckoutItems.map((item) => {
                    const updateKey = `${item.toolId}-${item.jobId || 'direct'}`;
                    const updating = isUpdating === updateKey;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
                        id={`tool-summary-item-${item.id}`}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors overflow-hidden ${
                          item.isReturned
                            ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                            : 'bg-white border-[#cbcbcb] text-slate-800 shadow-2xs hover:border-slate-400'
                        }`}
                      >
                        
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 text-xs">
                          
                          {item.date && (
                            <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                              {item.date}
                            </span>
                          )}

                          
                          <span className="font-mono font-bold text-slate-900">
                            ({item.assigned})
                          </span>

                          
                          <span className={`font-bold ${item.isReturned ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {item.name}
                          </span>

                          
                          <span className="text-slate-500 font-normal">received by</span>
                          <span className="font-semibold text-slate-800 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200/80">
                            {item.signedBy}
                          </span>

                          
                          {item.linkedJob ? (
                            <>
                              <span className="text-slate-500 font-normal">for</span>
                              <button
                                type="button"
                                onClick={() => handleOpenJob(item.linkedJob!)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-[#107c41] border border-emerald-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                                title={`Open Job #${item.linkedJob.code}: ${item.linkedJob.title} • Client: ${item.linkedJob.clientName || 'Client'}`}
                                aria-label={`Open appointment ${item.linkedJob.code}`}
                              >
                                <span>{item.linkedJob.code}</span>
                                <ArrowUpRight className="w-3 h-3 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                              </button>
                            </>
                          ) : item.jobId && item.jobId !== 'direct' ? (
                            <>
                              <span className="text-slate-500 font-normal">for</span>
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px] font-bold"
                                title={`Referenced Job: ${item.jobId}`}
                              >
                                #{item.jobId}
                              </span>
                            </>
                          ) : null}

                          
                          <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded border ${
                            item.isReturned
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-amber-800 bg-amber-50 border-amber-200'
                          }`}>
                            ({item.isReturned ? 'Returned' : 'In Field'})
                          </span>

                          {item.details && (
                            <span className="text-slate-400 text-[11px] italic">
                              • {item.details}
                            </span>
                          )}
                        </div>

                        
                        <button
                          type="button"
                          id={`btn-toggle-tool-return-${item.id}`}
                          disabled={updating}
                          onClick={() => handleToggleReturn(item.toolId, item.jobId, !item.isReturned)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1.5 ${
                            item.isReturned
                              ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                          } ${updating ? 'opacity-60 cursor-wait' : ''}`}
                          title={item.isReturned ? 'Restore checkout in field' : 'Return tool to store (row will clear from In Field)'}
                        >
                          {item.isReturned ? (
                            <>
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Undo Return</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Return to Store</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            
            {statusFilter === 'returned' && returnedCheckouts.length === 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No tools are currently marked as returned.</span>
              </div>
            )}

            
            {(statusFilter === 'in_field' || statusFilter === 'in_depot') && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Package className="w-3 h-3 text-slate-400" />
                  Tools in store:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tools.map(t => {
                    const totalEntered = Number(t.quantity || 0);
                    let outQty = 0;
                    if (t.assignments && t.assignments.length > 0) {
                      t.assignments.forEach(a => {
                        if (!a.isReturned) outQty += Number(a.assigned || 0);
                      });
                    } else if (!t.isReturned && Number(t.assigned || 0) > 0) {
                      outQty = Number(t.assigned || 0);
                    }
                    const available = Math.max(0, totalEntered - outQty);

                    return (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs transition-colors shadow-2xs"
                        title={`${t.name}: ${available} available in store (${totalEntered} total inventory)`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${available > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-slate-800">{t.name}</span>
                        <span className="text-slate-600 font-mono text-[11px] font-semibold">({available})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

