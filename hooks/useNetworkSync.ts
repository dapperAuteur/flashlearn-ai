'use client';

import { useContext } from 'react';
import { NetworkSyncContext } from '@/contexts/NetworkSyncContext';

export function useNetworkSync() {
  const context = useContext(NetworkSyncContext);
  if (!context) {
    throw new Error('useNetworkSync must be used within NetworkSyncProvider');
  }
  return context;
}
