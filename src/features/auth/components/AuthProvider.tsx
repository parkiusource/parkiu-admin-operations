import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access'
      }}
      onRedirectCallback={(appState) => {
        navigate(appState?.returnTo || '/onboarding');
      }}
    >
      {children}
    </Auth0Provider>
  );
};
