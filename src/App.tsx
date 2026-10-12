import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { WorkersView } from './components/WorkersView';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { JobModal } from './components/JobModal';
import { JobInteractionModal } from './components/JobInteractionModal';
import { WorkerModal } from './components/WorkerModal';
import { ImportModal } from './components/ImportModal';
import { PushNotificationToast } from './components/PushNotificationToast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RightCalendarPanel } from './components/RightCalendarPanel';
import { SidePersonnelList } from './components/SidePersonnelList';
import { AuthView } from './components/AuthView';
import { Calendar as CalendarIcon, Users, LayoutGrid } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeView,
    isAuthenticated,
    setIsAuthenticated,
    setAuthData,
    isAddJobOpen,
    setIsAddJobOpen,
    editingJob,
    setEditingJob,
    interactingJob,
    setInteractingJob,
    isAddWorkerOpen,
    setIsAddWorkerOpen,
    editingWorker,
    setEditingWorker,
    isImportModalOpen,
    setIsImportModalOpen,
  } = useApp();

  const [sideTab, setSideTab] = useState<'calendar' | 'personnel' | 'both'>('both');

  if (!isAuthenticated) {
    return (
      <AuthView
        onLogin={(data) => setAuthData(data)}
        onCancel={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-emerald-700 selection:text-white">
      
      <Header />

      
      <div className="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 flex flex-col lg:flex-row gap-4 items-start">
        <main className="flex-1 w-full min-w-0">
          {(activeView === 'dashboard' || activeView === 'calendar' || activeView === 'jobs') && <DashboardView />}
          {activeView === 'workers' && <WorkersView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'history' && <HistoryView />}
        </main>

        
        {activeView !== 'settings' && activeView !== 'workers' && activeView !== 'history' && (
          <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-3">
            
            <div className="bg-white border border-slate-300 rounded-lg p-1 flex items-center gap-1 shadow-2xs">
            <button
              id="side-tab-calendar"
              onClick={() => setSideTab('calendar')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sideTab === 'calendar'
                  ? 'bg-[#107c41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="View Calendar panel"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              id="side-tab-personnel"
              onClick={() => setSideTab('personnel')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sideTab === 'personnel'
                  ? 'bg-[#107c41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="View Personnel roster panel"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Personnel</span>
            </button>
            <button
              id="side-tab-both"
              onClick={() => setSideTab('both')}
              className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                sideTab === 'both'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Show both Calendar and Personnel panels stacked"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">All</span>
            </button>
          </div>

          {(sideTab === 'calendar' || sideTab === 'both') && <RightCalendarPanel />}
          {(sideTab === 'personnel' || sideTab === 'both') && <SidePersonnelList />}
        </div>
        )}
      </div>

      
      <JobModal
        isOpen={isAddJobOpen || !!editingJob}
        onClose={() => {
          setIsAddJobOpen(false);
          setEditingJob(null);
        }}
        jobToEdit={editingJob}
      />

      {interactingJob && (
        <JobInteractionModal
          job={interactingJob}
          onClose={() => setInteractingJob(null)}
        />
      )}

      <WorkerModal
        isOpen={isAddWorkerOpen || !!editingWorker}
        onClose={() => {
          setIsAddWorkerOpen(false);
          setEditingWorker(null);
        }}
        workerToEdit={editingWorker}
      />

      
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      
      <PushNotificationToast />

      
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
