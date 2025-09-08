import { useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const CallbackPage = () => {
  const { handleRedirectCallback, error, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (processedRef.current) return;
        processedRef.current = true;

        if (isAuthenticated) {
          navigate('/', { replace: true });
          return;
        }

        // Validar que la URL tiene parámetros de Auth0
        const params = new URLSearchParams(window.location.search);
        const hasAuthParams = params.has('code') && params.has('state');
        if (!hasAuthParams) {
          navigate('/login', { replace: true });
          return;
        }

        const result = await handleRedirectCallback();
        if (result) {
          const returnTo = result.appState?.returnTo || '/';
          navigate(returnTo, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err: unknown) {
        // Manejar estado inválido (ocurre si el callback se procesa dos veces o cambia el origen)
        const message = err instanceof Error ? err.message : String(err ?? '');
        if (message.toLowerCase().includes('invalid state')) {
          console.warn('Auth0 invalid state detected. Redirecting to login.');
          navigate('/login', { replace: true });
          return;
        }
        console.error('Error processing Auth0 callback:', err);
        navigate('/login', { replace: true });
      }
    };

    if (error) {
      navigate('/login', { replace: true });
      return;
    }

    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    processCallback();
  }, [handleRedirectCallback, isAuthenticated, error, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-parkiu-50 to-parkiu-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        <div className="text-center">
          <div className="mb-8">
            <img
              src="/logo-parkiu.svg"
              alt="ParkiU"
              className="h-12 mx-auto"
            />
          </div>
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-parkiu-600 animate-spin" />
            <h2 className="text-2xl font-semibold text-gray-900">Procesando autenticación...</h2>
            <p className="text-gray-600 text-center max-w-md">
              Estamos verificando tus credenciales y configurando tu sesión.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
