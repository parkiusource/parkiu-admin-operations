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
    // Si hay un returnTo en el appState, usarlo
    // Si no hay returnTo, ir a onboarding por defecto para nuevos usuarios
    navigate(appState?.returnTo || '/onboarding', { replace: true });
  };

  // Validación de configuración
  if (!(domain && clientId && audience)) {
    console.error('Missing required Auth0 configuration');
    return null;
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
    >
      {children}
    </Auth0Provider>
  );
};

export { Auth0ProviderWithNavigate as AuthProvider };
