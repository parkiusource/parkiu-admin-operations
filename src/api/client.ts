import axios from 'axios';
import { Auth0Client } from '@auth0/auth0-spa-js';

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
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
      // If token acquisition fails, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
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

      // If we're not on the login page, redirect there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return null;
    }
  };

  // Interceptor para manejar errores
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url;

      if (status === 401) {
        console.error('Error 401: Token inválido o expirado', {
          url,
          message: error?.response?.data?.message || 'No hay mensaje de error',
        });
        // Redirect to login on 401
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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
