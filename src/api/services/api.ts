import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Manejar error de autenticación
      console.error('Error de autenticación:', error);
    }
    return Promise.reject(error);
  }
);
