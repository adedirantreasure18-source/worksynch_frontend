import React, { useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, X, Radio, CheckCircle2, Navigation, AlertTriangle, Trash2, ShieldCheck } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, clearAllNotifications } = useApp();

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const formatTime = useCallback((ts?: string) => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getIcon = useCallback((type: string) => {
    switch (type) {
      case 'route_update':
        return <Radio className="w-4 h-4 text-[#107c41]" />;
      case 'job_status':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'worker_status':
        return <Navigation className="w-4 h-4 text-blue-600" />;
      case 'urgent_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="notification-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Manager notifications"
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        id="notification-drawer-panel"
        className="w-full max-w-md bg-white border-l border-slate-300 h-full flex flex-col text-slate-800 shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#107c41]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manager Push Notification Log</h3>
              <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                TARGET: MANAGER ONLY ({safeNotifications.length} logged)
              </span>
            </div>
          </div>
          <button
            id="btn-close-notifications"
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-start gap-2 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-[#107c41] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-[11px] text-[#0b5c30]">Strict Manager-Only Delivery Policy</span>
            <span className="text-[11px] text-slate-600">
              Drivers and field engineers do not receive instant push notifications to prevent driving and on-site distraction.
            </span>
          </div>
        </div>

        
        {safeNotifications.length > 0 && (
          <div className="p-2.5 bg-white border-b border-slate-200 flex items-center justify-end text-xs">
            <button
              id="btn-clear-notifications"
              onClick={clearAllNotifications}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Log
            </button>
          </div>
        )}

        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {safeNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold text-slate-600">No push notifications received yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Route broadcasts and status shifts will appear here for the manager.
              </p>
            </div>
          ) : (
            safeNotifications.map((n, idx) => (
              <div
                key={n.id ? `${n.id}-${idx}` : `notif-${idx}`}
                onClick={() => n.id && markNotificationRead(n.id)}
                className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs ${
                  !n.read ? 'bg-emerald-50/30' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getIcon(n.type)} 
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 truncate">{n.title || 'Notification'}</h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{n.body || ''}</p>

                    
                    {n.metadata?.workersOnSite && n.metadata.workersOnSite.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-500 font-medium">On Site:</span>{' '}
                        <span className="text-emerald-700 font-semibold">
                          {n.metadata.workersOnSite.map((w) => w.name).join(', ')}
                        </span>
                      </div>
                    )}
                    {n.metadata?.workersAvailable && n.metadata.workersAvailable.length > 0 && (
                      <div className="mt-1 text-[11px]">
                        <span className="text-slate-500 font-medium">Available:</span>{' '}
                        <span className="text-blue-700 font-semibold">
                          {n.metadata.workersAvailable.map((w) => w.name).join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-[#107c41] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        TARGET: MANAGER ONLY
                      </span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
