import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { setAuth0Client } from '@/api/client';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Internal component to register Auth0 client with axios interceptor
 * This must be inside Auth0Provider to access the client
 */
const Auth0ClientRegistrar = ({ children }: { children: React.ReactNode }) => {
  const auth0 = useAuth0();

  useEffect(() => {
    // Register the Auth0 client as soon as it's available
    // Use getAuth0ClientFromAuth0Context to access internal client
    const registerClient = async () => {
      try {
        // The useAuth0 hook provides access to getAccessTokenSilently
        // We need to register a way to get tokens with our axios client
        // We'll pass a function that calls getAccessTokenSilently
        const tokenGetter = async (options?: { detailedResponse?: boolean }) => {
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                scope: 'openid profile email offline_access'
              }
            });

            // Si se pide detailedResponse, devolver objeto con access_token
            // (compatible con el formato que espera getToken() en client.ts)
            if (options?.detailedResponse) {
              return { access_token: token };
            }

            return token;
          } catch (error) {
            console.error('Error getting token silently:', error);
            return null;
          }
        };

        // Register a mock Auth0 client that uses the token getter
        const mockClient = {
          getTokenSilently: tokenGetter
        };

        setAuth0Client(mockClient as Auth0Client);
      } catch (error) {
        console.error('Error registering Auth0 client:', error);
      }
    };

    if (!auth0.isLoading) {
      registerClient();
    }
  }, [auth0, auth0.isLoading]);

  // Auto-sync pending operations after login
  useEffect(() => {
    const checkPendingOps = async () => {
      // Solo si está autenticado y no está cargando
      if (auth0.isAuthenticated && !auth0.isLoading) {
        const hasPendingFlag = sessionStorage.getItem('hasPendingOperations');

        if (hasPendingFlag === 'true') {
          // Limpiar flag
          sessionStorage.removeItem('hasPendingOperations');

          // Esperar un poco para que Auth0 esté completamente listo
          setTimeout(async () => {
            const { connectionService } = await import('@/services/connectionService');
            connectionService.retrySync();
          }, 2000);
        }
      }
    };

    checkPendingOps();
  }, [auth0.isAuthenticated, auth0.isLoading]);

  return <>{children}</>;
}

export const Auth0ProviderWithNavigate = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();

  // Leer variables de entorno
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const redirectUri = window.location.origin + '/callback';

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    // Si hay un returnTo en el appState, usarlo; si no, ir a la raíz
    // para que RootRedirect determine el destino correcto
    const destination = appState?.returnTo || '/';
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
      <Auth0ClientRegistrar>
        {children}
      </Auth0ClientRegistrar>
    </Auth0Provider>
  );
};

export { Auth0ProviderWithNavigate as AuthProvider };
