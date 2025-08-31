import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();

  // Leer variables de entorno
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const redirectUri = window.location.origin + '/callback';

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    console.log('Auth0 redirect callback triggered:', { appState });
    // Si hay un returnTo en el appState, usarlo
    // Si no hay returnTo, ir a onboarding por defecto para nuevos usuarios
    const destination = appState?.returnTo || '/onboarding';
    console.log('Redirecting to:', destination);
    navigate(destination, { replace: true });
  };

  // Validación de configuración
  if (!(domain && clientId && audience)) {
    console.error('Missing required Auth0 configuration:', {
      domain: domain ? '✓' : '✗',
      clientId: clientId ? '✓' : '✗',
      audience: audience ? '✓' : '✗'
    });

    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error de Configuración</h2>
            <p className="text-gray-600 mb-4">
              Faltan variables de entorno de Auth0. Por favor contacta al administrador.
            </p>
            <div className="text-left bg-gray-50 p-3 rounded text-sm">
              <p>Variables requeridas:</p>
              <ul className="mt-2 space-y-1">
                <li>• VITE_AUTH0_DOMAIN {domain ? '✓' : '✗'}</li>
                <li>• VITE_AUTH0_CLIENT_ID {clientId ? '✓' : '✗'}</li>
                <li>• VITE_AUTH0_AUDIENCE {audience ? '✓' : '✗'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Auth0 Provider initialized with:', {
    domain,
    clientId: clientId ? `${clientId.substring(0, 8)}...` : 'missing',
    audience,
    redirectUri
  });

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience,
        scope: 'openid profile email offline_access',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={onRedirectCallback}
      skipRedirectCallback={window.location.pathname === '/callback'}
    >
      {children}
    </Auth0Provider>
  );
};

export { Auth0ProviderWithNavigate as AuthProvider };
