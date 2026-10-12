import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useApp } from '../context/AppContext';
import { HardDrive, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { localStorageStats, syncOfflineQueue } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const pendingCount = localStorageStats?.outboxPendingCount || 0;

  if (isOnline && pendingCount === 0 && !syncFeedback) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineQueue();
      setSyncFeedback(`Synced ${res.success} changes!`);
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e) {
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-wrap items-center gap-2.5 rounded-lg bg-slate-900/95 text-white border border-emerald-500/40 px-3.5 py-2.5 text-xs font-medium shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
      {!isOnline ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Offline Mode — Changes saving locally</span>
        </>
      ) : (
        <>
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span>Online — Local storage in sync</span>
        </>
      )}

      {pendingCount > 0 && (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
          {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} queued
        </span>
      )}

      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Now</span>
        </button>
      )}

      {syncFeedback && (
        <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {syncFeedback}
        </span>
      )}
    </div>
  );
};
