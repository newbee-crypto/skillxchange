import { useEffect, useRef } from 'react';

const useVisibilityRefresh = (refresh, enabled = true) => {
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 10000) {
        return;
      }

      lastRefreshAtRef.current = now;
      refresh();
    };

    const handleWindowFocus = () => {
      triggerRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refresh]);
};

export default useVisibilityRefresh;
