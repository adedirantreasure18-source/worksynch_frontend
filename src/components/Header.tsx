import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Plus,
  Radio,
  Bell,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Users,
  User,
  Settings,
  Table,
  FileText,
  Upload,
  FolderArchive,
  ChevronDown,
  FileSpreadsheet,
  Undo2,
  Redo2,
  History,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';
import { ConnectedUsersDrawer } from './ConnectedUsersDrawer';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    selectedDate,
    setSelectedDate,
    dateScope,
    setDateScope,
    todayDate,
    goToToday,
    isCalendarOpen,
    setIsCalendarOpen,
    setIsAddJobOpen,
    setIsAddWorkerOpen,
    notifications,
    isConnected,
    exportScheduleCSV,
    exportZipArchive,
    setIsImportModalOpen,
    currentRole,
    currentUser,
    workers,
    jobs,
    connectedUsers,
    isTeamActivityOpen,
    setIsTeamActivityOpen,
    setEditingJob,
    canUndo,
    canRedo,
    undo,
    redo,
    logout,
    setIsAuthenticated,
    isSyncing,
    lastSyncedAt,
    syncAllData,
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setIsDataMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDataMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleDayShift = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setDateScope('selected');
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 text-slate-800 shadow-xs select-none">
        
        <div className="bg-[#107c41] text-white px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base">
                worksynch
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-100 bg-[#0b5c30] px-2 py-0.5 rounded font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`} />
                {isConnected ? 'Live Sync Active' : 'Reconnecting...'}
              </span>

              
              <button
                id="btn-header-sync-now"
                onClick={() => syncAllData(true)}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 text-[11px] bg-[#0b5c30] hover:bg-[#074020] text-emerald-100 hover:text-white px-2 py-0.5 rounded font-medium border border-emerald-500/40 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Synchronize all jobs, workers, fleet, and settings across all connected users and devices"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-300' : 'text-emerald-200'}`} />
                <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          
          <div className="flex items-center gap-2 sm:gap-3">


            
            <button
              id="btn-connected-users-top"
              onClick={() => setIsTeamActivityOpen(true)}
              className="flex items-center gap-1.5 bg-[#0b5c30] hover:bg-[#074020] px-2.5 py-1 rounded text-xs font-semibold text-white transition-colors border border-emerald-500/50 shadow-xs"
              title="Connected team members"
            >
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <span>Team ({connectedUsers.length || 1})</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            
            <div className="flex items-center gap-2">
              <button
                id="btn-switch-account"
                onClick={() => setIsAuthenticated(false)}
                className="flex items-center gap-1.5 bg-[#074020] hover:bg-[#052e16] px-2.5 py-1 rounded text-xs font-semibold text-emerald-100 transition-colors border border-emerald-500/40 shadow-xs cursor-pointer"
                title="Switch account or login as a field worker"
              >
                <User className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden md:inline">Switch Account / Worker Login</span>
                <span className="md:hidden">Switch</span>
              </button>

              <div className="flex items-center gap-1.5 bg-[#0b5c30] px-2.5 py-1 rounded text-xs border border-emerald-600/50">
                <span className="text-emerald-200 font-medium hidden sm:inline">{currentRole.toUpperCase()}:</span>
                <span className="text-white font-bold">{currentUser?.name}</span>
                <button 
                  id="btn-header-logout"
                  onClick={logout}
                  className="ml-2 bg-emerald-700/60 hover:bg-rose-600 px-1.5 py-0.5 rounded text-[10px] text-white transition-colors cursor-pointer"
                  title="Logout from session"
                >
                  Logout
                </button>
              </div>
            </div>

            
            <button
              id="btn-manager-push-bell"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-1.5 rounded hover:bg-[#0b5c30] text-white transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && currentRole === 'manager' && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#107c41]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <nav className="flex items-center space-x-1">
            <button
              id="tab-dashboard"
              onClick={() => setActiveView('dashboard')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeView === 'dashboard' || activeView === 'jobs'
                  ? 'bg-white text-[#107c41] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="tab-history"
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeView === 'history'
                  ? 'bg-white text-[#107c41] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            {currentRole === 'manager' && (
              <>
                <button
                  id="tab-workers"
                  onClick={() => setActiveView('workers')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeView === 'workers'
                      ? 'bg-white text-[#107c41] shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Personnel</span>
                </button>

                <button
                  id="tab-settings"
                  onClick={() => setActiveView('settings')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeView === 'settings'
                      ? 'bg-white text-[#107c41] shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </>
            )}
          </nav>

          
          <div className="flex flex-wrap items-center gap-2">
            {currentRole === 'manager' && (
              <div className="flex items-center gap-1.5">
                
                <div className="flex items-center gap-1 border-r border-slate-300 pr-2 mr-1">
                  <button
                    id="btn-undo-action"
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all shadow-2xs ${
                      canUndo
                        ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer active:scale-95'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title="Undo last action (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                  <button
                    id="btn-redo-action"
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all shadow-2xs ${
                      canRedo
                        ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer active:scale-95'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title="Redo action (Ctrl+Y or Ctrl+Shift+Z)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Redo</span>
                  </button>
                </div>

                
                <button
                  id="btn-header-add-job"
                  onClick={() => {
                    if (activeView === 'workers') {
                      setIsAddWorkerOpen(true);
                    } else {
                      setIsAddJobOpen(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#107c41] hover:bg-[#0b5c30] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{activeView === 'workers' ? 'Add Personnel' : 'Add Job'}</span>
                </button>

                
                {activeView === 'settings' && (
                  <div className="relative" ref={dataMenuRef}>
                    <button
                      id="btn-data-transfer-dropdown"
                      type="button"
                      onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-all shadow-2xs ${
                        isDataMenuOpen
                          ? 'bg-emerald-50 text-[#107c41] border-emerald-400'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                      title="Import or Export files and packages"
                    >
                      <FolderArchive className="w-3.5 h-3.5 text-[#107c41]" />
                      <span>Import / Export</span>
                      <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isDataMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDataMenuOpen && (
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Data Transfer
                        </div>
                        <button
                          id="btn-import-file-zip"
                          type="button"
                          onClick={() => {
                            setIsImportModalOpen(true);
                            setIsDataMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center gap-2.5 text-slate-700 hover:text-emerald-950 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center shrink-0 text-[#107c41] group-hover:bg-[#107c41] group-hover:text-white transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">Import File / ZIP</div>
                            <div className="text-[10px] text-slate-500">Upload CSV schedules or ZIP archive</div>
                          </div>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        <button
                          id="btn-export-csv"
                          type="button"
                          onClick={() => {
                            exportScheduleCSV();
                            setIsDataMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2.5 text-slate-700 hover:text-blue-950 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">Export CSV</div>
                            <div className="text-[10px] text-slate-500">Download route schedule spreadsheet</div>
                          </div>
                        </button>

                        <button
                          id="btn-export-zip"
                          type="button"
                          onClick={() => {
                            exportZipArchive();
                            setIsDataMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center gap-2.5 text-slate-700 hover:text-emerald-950 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center shrink-0 text-[#107c41] group-hover:bg-[#107c41] group-hover:text-white transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">Export Zip</div>
                            <div className="text-[10px] text-slate-500">Download complete system backup</div>
                          </div>
                        </button>


                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
              {activeView !== 'settings' && (
                <button
                  id="btn-header-jump-today"
                  onClick={() => {
                    goToToday();
                    setDateScope('selected');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                    selectedDate === todayDate && dateScope === 'selected'
                      ? 'bg-emerald-100/90 border border-emerald-400 text-emerald-900 ring-1 ring-emerald-400/50'
                      : 'bg-white hover:bg-emerald-50 border border-emerald-400 text-emerald-800'
                  }`}
                  title="Return calendar to current date"
                >
                  <span className={`w-2 h-2 rounded-full ${selectedDate === todayDate && dateScope === 'selected' ? 'bg-[#107c41] animate-pulse' : 'bg-emerald-500'}`} />
                  <span>Today</span>
                </button>
              )}

              
              {activeView !== 'settings' && (
                <button
                  id="btn-header-all-dates"
                  type="button"
                  onClick={() => setDateScope(dateScope === 'all' ? 'selected' : 'all')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                    dateScope === 'all'
                      ? 'bg-[#107c41] text-white border-[#0b5c30] shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                  title={dateScope === 'all' ? 'Currently viewing all dates. Click to view selected date.' : 'View all jobs across all dates'}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>All Dates</span>
                  <span className={`px-1 rounded text-[10px] font-mono ${dateScope === 'all' ? 'bg-[#0b5c30] text-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                    {jobs.length}
                  </span>
                </button>
              )}

              <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300 text-xs shadow-2xs">
                <button
                  onClick={() => handleDayShift(-1)}
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 px-1 font-medium text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-[#107c41]" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setDateScope('selected');
                    }}
                    className="bg-transparent border-0 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => handleDayShift(1)}
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      
      <ConnectedUsersDrawer
        isOpen={isTeamActivityOpen}
        onClose={() => setIsTeamActivityOpen(false)}
        onSelectJob={(jobId) => {
          const target = jobs.find((j) => j.id === jobId);
          if (target) {
            setEditingJob(target);
          }
        }}
      />


    </>
  );
};
