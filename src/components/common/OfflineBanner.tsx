import React from 'react';
import { useStore } from '@/store/useStore';
import { getOfflineSessionWithStatus } from '@/services/offlineSession';

export const OfflineBanner: React.FC = () => {
  const isOffline = useStore((s) => s.isOffline);

  if (!isOffline) return null;

  // Verificar estado de sesión offline
  const sessionStatus = getOfflineSessionWithStatus();
  const hasSession = sessionStatus.session !== null;
  const hoursRemaining = sessionStatus.hoursRemaining;
  const isExpiringSoon = hasSession && hoursRemaining <= 4; // Advertir si quedan 4 horas o menos

  return (
    <div className={`fixed bottom-3 left-1/2 -translate-x-1/2 ${
      isExpiringSoon
        ? 'bg-red-100 border-red-300 text-red-900'
        : 'bg-amber-100 border-amber-300 text-amber-900'
    } border px-4 py-2 rounded shadow z-50 text-sm max-w-md text-center`}>
      {isExpiringSoon ? (
        <>
          <div className="font-medium">⚠️ Sesión offline por expirar</div>
          <div className="text-xs mt-1">
            Quedan <strong>{hoursRemaining}h</strong> de sesión offline.
            Conéctate a internet pronto para renovarla.
          </div>
        </>
      ) : (
        <>
          <div className="font-medium">Sin conexión</div>
          <div className="text-xs mt-1">
            Las operaciones se guardarán localmente y se sincronizarán al reconectar
            {hasSession && hoursRemaining > 0 && (
              <span className="block mt-0.5 text-amber-700">
                Sesión válida por {hoursRemaining}h más
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
