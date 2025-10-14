import React from 'react';
import { useStore } from '@/store/useStore';
import { getPendingCount } from '@/services/offlineQueue';
import { syncPendingOperations } from '@/services/offlineSync';
import { useAuth0 } from '@auth0/auth0-react';

export const OfflineBanner: React.FC = () => {
  const isOffline = useStore((s) => s.isOffline);
  const [pending, setPending] = React.useState<number>(0);

  React.useEffect(() => {
    let active = true;
    const refresh = async () => {
      const count = await getPendingCount();
      if (active) setPending(count);
    };
    refresh();
    const t = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(t); };
  }, []);

  const { getAccessTokenSilently } = useAuth0();

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded shadow z-50 text-sm flex items-center gap-3">
      <span>Modo offline activo • Pendientes: {pending}</span>
      <button
        className="px-2 py-1 text-xs bg-amber-200 hover:bg-amber-300 rounded border border-amber-400"
        onClick={async () => {
          try {
            const { synced } = await syncPendingOperations({ getToken: () => getAccessTokenSilently() });
            setPending(await getPendingCount());
            console.log(`Synced ${synced} operations`);
          } catch (e) {
            console.warn('Sync error', e);
          }
        }}
      >
        Sincronizar ahora
      </button>
    </div>
  );
};

export default OfflineBanner;
