import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const CallbackPage = () => {
  const { handleRedirectCallback, error, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (isAuthenticated) {
          // Redirigir a la raíz para que RootRedirect decida destino
          navigate('/', { replace: true });
          return;
        }

        const result = await handleRedirectCallback();
        if (result) {
          // Usar returnTo si existe; si no, dejar que RootRedirect decida
          const returnTo = result.appState?.returnTo || '/';
          navigate(returnTo, { replace: true });
        }
      } catch (err) {
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
