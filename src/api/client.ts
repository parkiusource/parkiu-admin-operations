import axios from 'axios';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { useStore } from '@/store/useStore';

let auth0Client: Auth0Client | null = null;

const createClient = () => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BACKEND_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(async (config) => {
    try {
      // If the caller already set an Authorization header, do not override or fetch a new token
      const existingAuthHeader = (config.headers as Record<string, unknown> | undefined)?.Authorization
        || (config.headers as Record<string, unknown> | undefined)?.authorization;
      if (existingAuthHeader) {
        return config;
      }

      // If Auth0 client is not ready, just continue without modifying headers
      if (!auth0Client) {
        return config;
      }

      const token = await getToken();
      if (token) {
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token in request interceptor:', error);
      // Do not redirect here. Let route guards handle authentication state.
    }
    return config;
  });

  const setAuth0Client = (auth0Instance: Auth0Client) => {
    auth0Client = auth0Instance;
  };

  const getToken = async (retryCount = 0): Promise<string | null> => {
    try {
      if (!auth0Client) {
        throw new Error('Auth0 client not initialized');
      }

      // Try to get the token with refresh token
      const response = await auth0Client.getTokenSilently({
        detailedResponse: true,
        timeoutInSeconds: 10,
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access'
        }
      });

      return response.access_token;
    } catch (error) {
      console.error('Error getting token:', error);

      // If we haven't retried yet and it's a refresh token error, try one more time
      if (retryCount === 0 && error instanceof Error && error.message.includes('refresh token')) {
        console.log('Retrying token acquisition...');
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getToken(retryCount + 1);
      }

      // Do not redirect here. Caller decides how to handle a missing token.
      return null;
    }
  };

  // Interceptor para manejar éxito/errores y marcar estado offline/online
  client.interceptors.response.use(
    (response) => {
      try {
        // Any successful response implies conectividad OK
        const store = useStore.getState();
        store.setOffline(false);
      } catch { /* ignore */ }
      return response;
    },
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url;
      try {
        const code: string | undefined = error?.code;
        // Si es error de red (backend caído, CORS bloqueado, timeout), marcar offline
        if (!status || code === 'ERR_NETWORK' || code === 'ECONNABORTED') {
          const store = useStore.getState();
          store.setOffline(true);
        }
      } catch { /* ignore */ }

      if (status === 401) {
        console.error('Error 401: Token inválido o expirado', {
          url,
          message: error?.response?.data?.message || 'No hay mensaje de error',
        });
        // Do not redirect here; let route guards/UI decide how to handle auth state
      } else if (status === 403) {
        console.error('Error 403: Acceso prohibido', {
          url,
          message: error?.response?.data?.message || 'No hay mensaje de error',
        });
      } else if (status === 404) {
        console.error('Error 404: Recurso no encontrado', {
          url,
          message: error?.response?.data?.message || 'No hay mensaje de error',
        });
      } else {
        console.error(`Error ${status || 'desconocido'}:`, {
          url,
          message: error?.response?.data?.message || error?.message || 'Error desconocido',
        });
      }

      return Promise.reject(error);
    }
  );

  return { client, setAuth0Client, getToken };
};

const { client, setAuth0Client, getToken } = createClient();
export { client, setAuth0Client, getToken };

export const getAuth0Client = () => {
  return auth0Client;
};
