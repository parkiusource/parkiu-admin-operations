import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Hook to monitor network connection status and update global state
 * Must be called from within a React component
 */
export function useConnectionStatus() {
  useEffect(() => {
    // Use Zustand's getState() API to avoid potential hook call issues
    const store = useStore.getState();

    const handleOnline = () => {
      store.setOffline(false);
    };

    const handleOffline = () => {
      store.setOffline(true);
    };

    // Set initial state
    store.setOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}
