'use client';

import { useNetworkSync } from '@/hooks/useNetworkSync';

/** @deprecated Use useNetworkSync instead */
export function useSync() {
  const { isOnline } = useNetworkSync();
  return { isOnline };
}
