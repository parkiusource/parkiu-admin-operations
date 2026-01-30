import React from 'react';
import { useStore } from '@/store/useStore';
import { connectionService } from '@/services/connectionService';

export const SyncErrorBanner: React.FC = () => {
  const lastSyncError = useStore((s) => s.lastSyncError);

  if (lastSyncError !== 'auth') return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-100 border border-amber-400 text-amber-900 px-4 py-2 rounded shadow text-sm max-w-md">
      <span>
        Hay operaciones pendientes de sincronizar. No se pudo obtener el token. Inicia sesión de nuevo y pulsa &quot;Reintentar&quot;.
      </span>
      <button
        type="button"
        onClick={() => connectionService.retrySync()}
        className="shrink-0 px-3 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-700"
      >
        Reintentar
      </button>
    </div>
  );
};

export default SyncErrorBanner;
