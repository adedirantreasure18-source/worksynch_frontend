import React from 'react';
import { backendFileUrl } from '../config/api';
import { Worker, WorkerHistoryEntry } from '../types';
import { X, History, Download, Calendar, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface WorkerHistoryModalProps {
  worker: Worker | null;
  onClose: () => void;
}

export const WorkerHistoryModal: React.FC<WorkerHistoryModalProps> = ({ worker, onClose }) => {
  if (!worker) return null;

  const historyEntries: WorkerHistoryEntry[] = worker.history || [];

  const handleExportSingleWorkerCSV = () => {
    const rows = [
      ['Timestamp', 'Worker Name', 'Role', 'Modified By', 'Summary', 'Field Changes'].join(','),
    ];

    historyEntries.forEach((h) => {
      const details = (h.changes || []).map((c) => `${c.fieldLabel}: ${c.from} -> ${c.to}`).join(' | ');
      rows.push([
        `"${h.timestamp}"`,
        `"${(worker.name || '').replace(/"/g, '""')}"`,
        `"${(worker.roleTitle || worker.role || '').replace(/"/g, '""')}"`,
        `"${(h.changedBy || 'Dispatch Manager').replace(/"/g, '""')}"`,
        `"${(h.summary || '').replace(/"/g, '""')}"`,
        `"${(details || '').replace(/"/g, '""')}"`,
      ].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${worker.name.toLowerCase().replace(/\s+/g, '_')}_audit_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        id="worker-history-modal"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl"
      >
        
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={backendFileUrl(worker.avatarUrl)}
              alt={worker.name}
              className="h-10 w-10 rounded-full border border-neutral-200 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-900">{worker.name}</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {historyEntries.length} {historyEntries.length === 1 ? 'Revision' : 'Revisions'}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {worker.roleTitle || worker.role.toUpperCase()} • Profile & Roster Audit Trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="export-worker-history-csv-btn"
              onClick={handleExportSingleWorkerCSV}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              title="Download CSV log for this worker"
            >
              <Download className="h-3.5 w-3.5 text-neutral-600" />
              <span>Export CSV</span>
            </button>
            <button
              id="close-worker-history-modal-btn"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {historyEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-neutral-100 p-3 text-neutral-400">
                <History className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-neutral-700">No profile revisions recorded yet</p>
              <p className="mt-1 max-w-sm text-xs text-neutral-500">
                Modifications to {worker.name}&apos;s profile, status, vehicle, or skills will be tracked here chronologically.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-neutral-200 pl-4 ml-3 space-y-5">
              {historyEntries.map((entry, index) => (
                <div key={entry.id || index} className="relative group">
                  
                  <div
                    className={`absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      index === 0 ? 'bg-emerald-600 ring-2 ring-emerald-100' : 'bg-neutral-400'
                    }`}
                  />

                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5 transition-colors hover:bg-white hover:border-neutral-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 pb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                        <User className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{entry.changedBy || 'Dispatch Manager'}</span>
                        {index === 0 && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Current Version
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        <Calendar className="h-3 w-3 text-neutral-400" />
                        <span>{formatDateTime(entry.timestamp)}</span>
                      </div>
                    </div>

                    <p className="mt-2 text-xs font-medium text-neutral-700">{entry.summary}</p>

                    
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-3 space-y-1.5 pt-1">
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                          Modified Attributes ({entry.changes.length})
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {entry.changes.map((change, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center justify-between rounded border border-neutral-200 bg-white px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-medium text-neutral-700">{change.fieldLabel}</span>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500 line-through">
                                  {String(change.from || '(None)')}
                                </span>
                                <ArrowRight className="h-3 w-3 text-neutral-400 shrink-0" />
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800">
                                  {String(change.to || '(None)')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-3 rounded-b-xl">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Persistent history stored and synced with roster</span>
          </div>
          <button
            id="close-history-footer-btn"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
