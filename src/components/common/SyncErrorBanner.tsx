import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useStore } from '@/store/useStore';
import { connectionService } from '@/services/connectionService';
import { getPendingCount } from '@/services/offlineQueue';

export const SyncErrorBanner: React.FC = () => {
  const lastSyncError = useStore((s) => s.lastSyncError);
  const isOffline = useStore((s) => s.isOffline);
  const isSyncing = useStore((s) => s.isSyncing);
  const [pendingCount, setPendingCount] = useState(0);
  const { logout } = useAuth0();

  // Verificar operaciones pendientes cada 5 segundos
  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // No mostrar si está sincronizando o si no hay operaciones pendientes
  if (isSyncing || pendingCount === 0) return null;

  // Banner para error de autenticación
  if (lastSyncError === 'auth') {
    const handleRelogin = () => {
      // Guardar que hay operaciones pendientes antes de cerrar sesión
      sessionStorage.setItem('hasPendingOperations', 'true');

      // Forzar logout y redirigir a login
      logout({
        logoutParams: {
          returnTo: window.location.origin + '/login'
        }
      });
    };

    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 bg-amber-100 border border-amber-400 text-amber-900 px-4 py-3 rounded shadow text-sm max-w-md">
        <span>
          Hay {pendingCount} operación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''}.
          No se pudo renovar la sesión.
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => connectionService.retrySync()}
            className="flex-1 px-3 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-700"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={handleRelogin}
            className="flex-1 px-3 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Banner para operaciones pendientes sin error específico (solo si hay conexión)
  if (pendingCount > 0 && !isOffline) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-blue-100 border border-blue-400 text-blue-900 px-4 py-2 rounded shadow text-sm max-w-md">
        <span>
          {pendingCount} operación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de sincronizar.
        </span>
        <button
          type="button"
          onClick={() => connectionService.retrySync()}
          className="shrink-0 px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Sincronizar
        </button>
      </div>
    );
  }

  return null;
};

export default SyncErrorBanner;
