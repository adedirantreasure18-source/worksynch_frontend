import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { History as HistoryIcon, Wrench, Users, FileText, Calendar, CheckCircle2, AlertCircle, Clock, Search, Filter } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { jobs, workers, settings, notifications } = useApp();
  const [historyTab, setHistoryTab] = useState<'jobs' | 'tools' | 'personnel' | 'activity'>('jobs');
  const [searchQuery, setSearchQuery] = useState('');

  
  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    return (
      j.clientName.toLowerCase().includes(q) ||
      j.code.toLowerCase().includes(q) ||
      j.title.toLowerCase().includes(q) ||
      j.siteLocation.name.toLowerCase().includes(q) ||
      j.siteLocation.address.toLowerCase().includes(q) ||
      (j.notes && j.notes.toLowerCase().includes(q))
    );
  });

  
  const toolHistoryItems = (settings.tools || []).flatMap((tool) => {
    const entered = Number(tool.quantity || 0);
    if (tool.assignments && tool.assignments.length > 0) {
      return tool.assignments.map((assignment) => {
        const isRet = assignment.isReturned ?? tool.isReturned;
        const assignedQty = Number(assignment.assigned || 0);
        const remaining = isRet ? entered : Math.max(0, entered - assignedQty);

        
        const linkedJob = jobs.find(j => j.id === assignment.id);
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
          name: tool.name,
          entered,
          assigned: assignedQty,
          remaining,
          signedBy: recipient,
          date: assignment.date || linkedJob?.scheduledDate || tool.date || '19/Sep/2026',
          isReturned: isRet,
          details: tool.details || ''
        };
      });
    } else {
      const isRet = tool.isReturned;
      const assignedQty = Number(tool.assigned || 0);
      const remaining = isRet ? entered : Math.max(0, entered - assignedQty);
      return [{
        id: tool.id,
        name: tool.name,
        entered,
        assigned: assignedQty,
        remaining,
        signedBy: (tool.signedBy || '').trim() || 'Depot Inventory',
        date: tool.date || '19/Sep/2026',
        isReturned: isRet,
        details: tool.details || ''
      }];
    }
  }).filter(item => item.name && item.name.trim().length > 0);

  const filteredTools = toolHistoryItems.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.signedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.body && n.body.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      
      <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-[#107c41]" />
            <span>Activity & Operational History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized audit trail of job executions, tool inventory checkouts, personnel records, and system events.
          </p>
        </div>

        
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setHistoryTab('jobs')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              historyTab === 'jobs' ? 'bg-white text-[#107c41] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Job History ({jobs.length})</span>
          </button>
          <button
            onClick={() => setHistoryTab('tools')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              historyTab === 'tools' ? 'bg-white text-[#107c41] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tool History ({toolHistoryItems.length})</span>
          </button>
          <button
            onClick={() => setHistoryTab('personnel')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              historyTab === 'personnel' ? 'bg-white text-[#107c41] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personnel ({workers.length})</span>
          </button>
          <button
            onClick={() => setHistoryTab('activity')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              historyTab === 'activity' ? 'bg-white text-[#107c41] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Logs ({notifications.length})</span>
          </button>
        </div>
      </div>

      
      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${historyTab} history records...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-[#107c41]"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium px-2">
          Showing {
            historyTab === 'jobs' ? filteredJobs.length :
            historyTab === 'tools' ? filteredTools.length :
            historyTab === 'personnel' ? filteredWorkers.length : filteredNotifications.length
          } records
        </div>
      </div>

      
      <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
        {historyTab === 'jobs' && (
          <div className="overflow-x-auto">
            <table className="excel-table text-left border-collapse w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 select-none">
                  <th className="excel-th w-10 text-center bg-slate-200">#</th>
                  <th className="excel-th w-28">Job Code</th>
                  <th className="excel-th w-44">Client Name</th>
                  <th className="excel-th min-w-[220px]">Description & Details</th>
                  <th className="excel-th w-32">Status</th>
                  <th className="excel-th w-28">Priority</th>
                  <th className="excel-th w-40">Assignees</th>
                  <th className="excel-th w-32">Date Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredJobs.map((job, idx) => {
                  const assigneeNames = (() => {
                    const ids = [...(job.specialistIds || []), ...(job.engineerId ? [job.engineerId] : []), ...(job.driverIds || []), ...(job.driverId ? [job.driverId] : [])];
                    const names = ids.map(id => workers.find(w => w.id === id)?.name).filter(Boolean) as string[];
                    return names.length ? names.join(', ') : 'Unassigned';
                  })();
                  return (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="excel-td text-center font-mono text-slate-500 w-10">{idx + 1}</td>
                    <td className="excel-td font-mono font-bold text-slate-800">{job.code}</td>
                    <td className="excel-td font-semibold text-slate-900">{job.clientName}</td>
                    <td className="excel-td text-slate-700">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-[10px] text-slate-500">{job.siteLocation.name} • {job.siteLocation.address}</div>
                      {job.notes && <div className="text-[10px] text-slate-400 italic truncate max-w-[220px]">{job.notes}</div>}
                    </td>
                    <td className="excel-td">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'in_progress' ? 'bg-sky-100 text-sky-800' :
                        job.status === 'on_site' ? 'bg-amber-100 text-amber-800' :
                        job.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="excel-td">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        job.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        job.priority === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {job.priority}
                      </span>
                    </td>
                    <td className="excel-td text-slate-700 font-medium">
                      {assigneeNames}
                    </td>
                    <td className="excel-td font-mono text-slate-600">{job.scheduledDate || '--'}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {historyTab === 'tools' && (
          <div className="overflow-x-auto">
            <table className="excel-table text-left border-collapse w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 select-none">
                  <th className="excel-th w-10 text-center bg-slate-200">#</th>
                  <th className="excel-th w-28">Date</th>
                  <th className="excel-th w-32">Status</th>
                  <th className="excel-th min-w-[200px]">Tool Name</th>
                  <th className="excel-th w-32 text-center">Assigned Qty</th>
                  <th className="excel-th w-32 text-center">Total Inventory</th>
                  <th className="excel-th w-32 text-center">Remaining</th>
                  <th className="excel-th min-w-[200px]">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTools.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="excel-td text-center font-mono text-slate-500 w-10">{idx + 1}</td>
                    <td className="excel-td font-mono text-slate-700">{item.date}</td>
                    <td className="excel-td">
                      {item.isReturned ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Returned
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                          Checked Out
                        </span>
                      )}
                    </td>
                    <td className="excel-td font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                      {item.details && <div className="text-[10px] text-slate-500 italic">{item.details}</div>}
                    </td>
                    <td className="excel-td text-center font-bold text-slate-800">({item.assigned})</td>
                    <td className="excel-td text-center font-mono text-slate-600">{item.entered}</td>
                    <td className="excel-td text-center font-bold text-slate-700">rem {item.remaining}</td>
                    <td className="excel-td font-medium text-slate-900">{item.signedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTab === 'personnel' && (
          <div className="overflow-x-auto">
            <table className="excel-table text-left border-collapse w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 select-none">
                  <th className="excel-th w-10 text-center bg-slate-200">#</th>
                  <th className="excel-th w-24">Code</th>
                  <th className="excel-th w-36">Role</th>
                  <th className="excel-th min-w-[200px]">Full Name & Profile</th>
                  <th className="excel-th w-36">Status</th>
                  <th className="excel-th min-w-[180px]">Contact Phone</th>
                  <th className="excel-th min-w-[200px]">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredWorkers.map((worker, idx) => (
                  <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                    <td className="excel-td text-center font-mono text-slate-500 w-10">{idx + 1}</td>
                    <td className="excel-td font-mono font-bold text-slate-800">{worker.id}</td>
                    <td className="excel-td font-semibold text-slate-700 uppercase text-[10px]">{worker.roleTitle || worker.role}</td>
                    <td className="excel-td font-semibold text-slate-900">{worker.name}</td>
                    <td className="excel-td">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        worker.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                        worker.status === 'on_site' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {worker.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="excel-td font-mono text-slate-600">{worker.phone}</td>
                    <td className="excel-td text-slate-600">{worker.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTab === 'activity' && (
          <div className="divide-y divide-slate-200">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No activity logs matching search.</div>
            ) : (
              filteredNotifications.map((notif) => (
              <div key={notif.id} className="p-3 hover:bg-slate-50 flex items-start gap-3 transition-colors">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp ? new Date(notif.timestamp).toLocaleDateString() : '--'}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{notif.body || (notif as any).message || ''}</p>
                </div>
              </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
