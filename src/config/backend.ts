// ===================================
// CONFIGURACIÓN DEL BACKEND
// ===================================

/**
 * URLs del backend según el entorno
 */
export const BACKEND_URLS = {
  // Para desarrollo local
  LOCAL: 'http://localhost:8080',

  // Para producción
  PRODUCTION: 'https://parking-radar.onrender.com',

  // URL actual (detecta automáticamente o usa variable de entorno)
  get CURRENT() {
    // Prioridad: variable de entorno > localhost en desarrollo > producción
    if (import.meta.env.VITE_API_BACKEND_URL) {
      return import.meta.env.VITE_API_BACKEND_URL;
    }

    // Si estamos en desarrollo, usar localhost
    if (import.meta.env.DEV) {
      return this.LOCAL;
    }

    // En producción usar el servidor real
    return this.PRODUCTION;
  }
} as const;

/**
 * Endpoints específicos para parking lots
 */
export const PARKING_ENDPOINTS = {
  // Base para todos los endpoints de parking
  BASE: '/parking-lots',

  // Endpoints específicos
  LIST: '/parking-lots/',
  CREATE: '/parking-lots/',
  GET_BY_ID: (id: number) => `/parking-lots/${id}/`,
  UPDATE: (id: number) => `/parking-lots/${id}/`,
  DELETE: (id: number) => `/parking-lots/${id}/`,

  // Endpoints de estadísticas (cuando los tengas)
  STATS: (id: number) => `/parking-lots/${id}/stats/`,
  VEHICLES: (id: number) => `/parking-lots/${id}/vehicles/`,
} as const;

/**
 * Configuración completa del API
 */
export const API_CONFIG = {
  BASE_URL: BACKEND_URLS.CURRENT,
  ENDPOINTS: PARKING_ENDPOINTS,

  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },

  // Timeouts
  TIMEOUT: 10000, // 10 segundos

  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
} as const;

// Función helper para construir URLs completas
export function buildApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL;
  // Eliminar slash duplicados
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}
