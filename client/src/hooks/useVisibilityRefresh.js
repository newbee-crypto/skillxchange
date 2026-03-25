import { useEffect } from 'react';

const useVisibilityRefresh = (refresh, enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleWindowFocus = () => {
      refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
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
