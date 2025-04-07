import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useConnectionStatus() {
  const { setOffline, setSyncing } = useStore();

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      setSyncing(true);
      // Aquí iría la lógica de sincronización
      setTimeout(() => setSyncing(false), 1000);
    };

    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar estado inicial
    if (!navigator.onLine) {
      setOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline, setSyncing]);
}
