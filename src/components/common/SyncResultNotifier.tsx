import { useEffect, useRef } from 'react';
import { useStore, type LastSyncResult } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

/**
 * Muestra un toast cuando la sincronización automática de operaciones offline termina.
 * Solo se suscribe a lastSyncResult; no renderiza nada.
 */
export function SyncResultNotifier() {
  const lastSyncResult = useStore((s) => s.lastSyncResult);
  const { addToast } = useToast();
  const prevRef = useRef<LastSyncResult>(null);

  useEffect(() => {
    if (lastSyncResult === null || lastSyncResult === prevRef.current) return;
    prevRef.current = lastSyncResult;
    const { synced, failed } = lastSyncResult;
    if (synced > 0) {
      const msg =
        failed > 0
          ? `${synced} operación(es) sincronizada(s). ${failed} fallida(s).`
          : `${synced} operación(es) sincronizada(s) con el servidor.`;
      addToast(msg, 'success', 5000);
    } else if (failed > 0) {
      addToast(`${failed} operación(es) no se pudieron sincronizar.`, 'error', 6000);
    }
    useStore.getState().setLastSyncResult(null);
    prevRef.current = null;
  }, [lastSyncResult, addToast]);

  return null;
}
