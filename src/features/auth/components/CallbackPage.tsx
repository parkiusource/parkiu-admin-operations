import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export const CallbackPage = () => {
  const { handleRedirectCallback, error, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        setStatus('loading');

        // Verificar si ya estamos autenticados
        if (isAuthenticated) {
          setStatus('success');
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
          return;
        }

        // Procesar el callback de Auth0
        const result = await handleRedirectCallback();

        if (result) {
          setStatus('success');
          // Redirigir según el appState o a onboarding por defecto
          const returnTo = result.appState?.returnTo || '/onboarding';
          setTimeout(() => navigate(returnTo, { replace: true }), 1500);
        }
      } catch (err) {
        console.error('Error processing Auth0 callback:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Error desconocido durante la autenticación');

        // Redirigir al login después de mostrar el error
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    // Solo procesar si no hay error de Auth0 y estamos cargando
    if (!error && !isAuthenticated) {
      processCallback();
    } else if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } else if (isAuthenticated) {
      setStatus('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    }
  }, [handleRedirectCallback, isAuthenticated, error, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-parkiu-600 animate-spin" />
            <h2 className="text-2xl font-semibold text-gray-900">Procesando autenticación...</h2>
            <p className="text-gray-600 text-center max-w-md">
              Estamos verificando tus credenciales y configurando tu sesión.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">¡Autenticación exitosa!</h2>
            <p className="text-gray-600 text-center max-w-md">
              Bienvenido a ParkiU. Serás redirigido en un momento...
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Error de autenticación</h2>
            <p className="text-gray-600 text-center max-w-md">
              {errorMessage || 'Hubo un problema durante el proceso de autenticación.'}
            </p>
            <p className="text-sm text-gray-500">
              Serás redirigido al login en unos segundos...
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-4 px-6 py-2 bg-parkiu-600 text-white rounded-lg hover:bg-parkiu-700 transition-colors"
            >
              Volver al login
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-parkiu-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
              <img
                src="/logo/secondary.svg"
                alt="ParkiU"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Sistema de gestión de parqueaderos ParkiU
          </p>
        </div>
      </div>
    </div>
  );
};
