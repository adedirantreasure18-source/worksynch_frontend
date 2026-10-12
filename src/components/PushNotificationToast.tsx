import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, X, CheckCircle2, Navigation, AlertTriangle, Radio, ShieldCheck } from 'lucide-react';

export const PushNotificationToast: React.FC = () => {
  const { activeToast, dismissToast, currentRole } = useApp();

  if (!activeToast || currentRole !== 'manager') return null;

  const getIcon = () => {
    switch (activeToast.type) {
      case 'route_update':
        return <Radio className="w-5 h-5 text-[#107c41] animate-pulse" />;
      case 'job_status':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'worker_status':
        return <Navigation className="w-5 h-5 text-blue-600" />;
      case 'urgent_alert':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div
      id="push-notification-toast"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full sm:w-96 bg-white border border-slate-300 text-slate-800 rounded-xl shadow-xl p-4 transition-all duration-300 transform translate-y-0"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#107c41] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Manager Push Notice (Staff Muted)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Just now</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">{activeToast.title}</h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{activeToast.body}</p>

          {activeToast.metadata?.workersOnSite && activeToast.metadata.workersOnSite.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px]">
              <span className="text-slate-500 font-medium">On Site Now:</span>{' '}
              <span className="text-emerald-700 font-semibold">
                {activeToast.metadata.workersOnSite.map((w) => w.name).join(', ')}
              </span>
            </div>
          )}

          {activeToast.metadata?.workersAvailable && activeToast.metadata.workersAvailable.length > 0 && (
            <div className="mt-1 text-[11px]">
              <span className="text-slate-500 font-medium">Available for Dispatch:</span>{' '}
              <span className="text-blue-700 font-semibold">
                {activeToast.metadata.workersAvailable.map((w) => w.name).join(', ')}
              </span>
            </div>
          )}
        </div>
        <button
          id="btn-dismiss-toast"
          onClick={dismissToast}
          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
