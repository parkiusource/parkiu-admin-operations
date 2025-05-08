import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useConnectionStatus() {
  const setOffline = useStore((state) => state.setOffline);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Establecer el estado inicial
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);
}
