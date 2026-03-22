import { useEffect, useRef } from 'react';
import { subscribeAdminDataInvalidation } from './admin-cache';

type RefreshReason = 'focus' | 'visibility' | 'invalidate';

interface UseAdminAutoRefreshOptions {
  enabled?: boolean;
  minIntervalMs?: number;
  refreshOnFocus?: boolean;
  refreshOnVisibility?: boolean;
}

export function useAdminAutoRefresh(
  refresh: (reason: RefreshReason) => void | Promise<void>,
  {
    enabled = true,
    minIntervalMs = 15000,
    refreshOnFocus = true,
    refreshOnVisibility = true,
  }: UseAdminAutoRefreshOptions = {},
) {
  const refreshRef = useRef(refresh);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const triggerRefresh = (reason: RefreshReason) => {
      if ((reason === 'focus' || reason === 'visibility') && document.visibilityState === 'hidden') {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshRef.current < minIntervalMs) {
        return;
      }

      lastRefreshRef.current = now;
      void refreshRef.current(reason);
    };

    const unsubscribe = subscribeAdminDataInvalidation(() => {
      triggerRefresh('invalidate');
    });

    const handleFocus = () => {
      if (refreshOnFocus) {
        triggerRefresh('focus');
      }
    };

    const handleVisibilityChange = () => {
      if (refreshOnVisibility && document.visibilityState === 'visible') {
        triggerRefresh('visibility');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, minIntervalMs, refreshOnFocus, refreshOnVisibility]);
}
