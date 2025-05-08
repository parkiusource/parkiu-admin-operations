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
    }
    return config;
  });

  const setAuth0Client = (auth0Instance: Auth0Client) => {
    auth0Client = auth0Instance;
  };

  const getToken = async () => {
    try {
      if (!auth0Client) {
        throw new Error('Auth0 client not initialized');
      }
      return await auth0Client.getTokenSilently();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  // Interceptor para manejar errores
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Asegurarse de que error.response existe antes de acceder a sus propiedades
      const status = error?.response?.status;
      const url = error?.config?.url;

      if (status === 401) {
        console.error('Error 401: Token inválido o expirado', {
          url,
          message: error?.response?.data?.message || 'No hay mensaje de error',
        });
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
