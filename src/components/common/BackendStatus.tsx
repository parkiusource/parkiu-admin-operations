import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const BackendStatus = () => {
  const [backendError, setBackendError] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Observar cambios en el cache de queries para detectar errores de backend
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated') {
        const query = event.query;
        const error = query.state.error as Error & { code?: string };

        if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED') {
          setBackendError(true);
          setShowNotification(true);
        } else if (query.state.status === 'success') {
          setBackendError(false);
          setShowNotification(false);
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`rounded-lg p-4 shadow-lg ${
        backendError
          ? 'bg-yellow-50 border border-yellow-200'
          : 'bg-green-50 border border-green-200'
      }`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {backendError ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              backendError ? 'text-yellow-800' : 'text-green-800'
            }`}>
              {backendError ? 'Se necesita conexión a internet' : 'Conectado'}
            </h3>
            <p className={`text-sm ${
              backendError ? 'text-yellow-700' : 'text-green-700'
            }`}>
              {backendError
                ? 'Conecta a internet para usar la aplicación.'
                : 'Conectado al servidor correctamente.'
              }
            </p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={() => setShowNotification(false)}
              className={`inline-flex rounded-md p-1.5 ${
                backendError
                  ? 'text-yellow-500 hover:bg-yellow-100'
                  : 'text-green-500 hover:bg-green-100'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                backendError ? 'focus:ring-yellow-600' : 'focus:ring-green-600'
              }`}
            >
              <span className="sr-only">Cerrar</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
