import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Users, MessageSquare, CheckCircle, Radio, Clock, Eye, UserCheck, Edit3, RefreshCw, Zap } from 'lucide-react';

interface ConnectedUsersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (jobId: string) => void;
}

export const ConnectedUsersDrawer: React.FC<ConnectedUsersDrawerProps> = ({
  isOpen,
  onClose,
  onSelectJob,
}) => {
  const {
    connectedUsers,
    currentUser,
    updateCurrentUserName,
    updateCurrentUserRole,
    recentActivities,
    jobs,
    isConnected,
    isSyncing,
    lastSyncedAt,
    syncAllData,
  } = useApp();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);

  if (!isOpen) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      updateCurrentUserName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-300 flex flex-col overflow-hidden text-slate-800" onClick={(e) => e.stopPropagation()}>
        
        <div className="bg-[#107c41] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <h3 className="font-bold text-sm tracking-tight">
              Connected Users ({connectedUsers.length || 1})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 text-white transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Multi-User Cloud Sync</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                {isConnected ? 'Real-time WebSocket Active' : 'Connecting...'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              All jobs, workers, fleet vehicles, notes, and settings synchronize in real time across all active user sessions and devices.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-[10px] text-emerald-700">
              <span>Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Just now'}</span>
              <button
                id="btn-drawer-sync-now"
                onClick={() => syncAllData(true)}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#107c41] hover:bg-[#0b5c30] text-white rounded font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing...' : 'Force Sync All Users'}</span>
              </button>
            </div>
          </div>

          
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                Your WebApp Identity
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Online
              </span>
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name..."
                  className="flex-1 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#107c41]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#107c41] text-white rounded text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{currentUser.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNameInput(currentUser.name);
                    setIsEditingName(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-[#107c41] border border-slate-300 rounded px-2 py-0.5 bg-white shadow-xs"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Rename</span>
                </button>
              </div>
            )}

            
            <div className="pt-1 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">
                Switch Role Perspective:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['manager', 'engineer', 'driver'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => updateCurrentUserRole(r)}
                    className={`py-1 rounded text-[11px] font-semibold capitalize border transition-all ${
                      currentUser.role === r
                        ? 'bg-[#107c41] text-white border-[#107c41]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700">
                Connected Peers ({connectedUsers.length})
              </span>
              <span className="text-[10px] text-slate-400">Updates via WebSockets</span>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white overflow-hidden">
              {connectedUsers.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">
                  Connecting to real-time cluster...
                </div>
              ) : (
                connectedUsers.map((user, idx) => {
                  const isSelf = user.id === currentUser.id;
                  const viewingJob = user.focusJobId ? jobs.find((j) => j.id === user.focusJobId) : null;

                  return (
                    <div
                      key={user.id ? `${user.id}-${idx}` : `user-${idx}`}
                      className={`p-2.5 flex items-center justify-between transition-colors ${
                        isSelf ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: user.color || '#107c41' }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 capitalize">
                            Role: {user.role}
                          </div>
                        </div>
                      </div>

                      
                      <div className="text-right">
                        {viewingJob ? (
                          <button
                            onClick={() => {
                              onSelectJob(viewingJob.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 text-[10px] font-semibold border border-emerald-300"
                            title="Jump to job being inspected by this user"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>{viewingJob.code}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Viewing App</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700">Recent Team Activity</span>
              <span className="text-[10px] text-slate-400">Live stream</span>
            </div>

            <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">
                  No activities recorded yet.
                </div>
              ) : (
                recentActivities.slice(0, 15).map((act, idx) => (
                  <div
                    key={act.id ? `${act.id}-${idx}` : `act-${idx}`}
                    className="p-2.5 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-700">{act.userName}</span>
                      <span className="font-mono">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{act.details}</p>
                    {act.jobId && (
                      <button
                        onClick={() => {
                          onSelectJob(act.jobId!);
                          onClose();
                        }}
                        className="mt-1 text-[10px] text-[#107c41] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-2.5 h-2.5" />
                        <span>View {act.jobCode || 'Job'}</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>Multi-client state synced</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
