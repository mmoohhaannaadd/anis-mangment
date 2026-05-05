/**
 * Offline Status Context & Hook
 * Provides sync status and offline state to the entire app.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { syncManager, type SyncStatus } from '../lib/syncManager';

interface OfflineContextValue {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  syncMessage: string;
  triggerSync: () => void;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  syncStatus: 'idle',
  pendingCount: 0,
  syncMessage: '',
  triggerSync: () => {},
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync manager updates
    const unsubscribe = syncManager.subscribe((status, message, pending) => {
      setSyncStatus(status);
      if (message) setSyncMessage(message);
      if (pending !== undefined) setPendingCount(pending);
    });

    // Do an initial sync on mount if online
    if (navigator.onLine) {
      syncManager.startSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => {
    if (navigator.onLine) {
      syncManager.startSync();
    }
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, syncStatus, pendingCount, syncMessage, triggerSync }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
