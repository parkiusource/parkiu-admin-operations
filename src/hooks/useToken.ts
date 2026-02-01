import { useCallback } from 'react';
import { getToken } from '@/api/client';

/**
 * Hook centralizado para obtener tokens de Auth0
 *
 * ✅ Usa el cliente Auth0 centralizado en client.ts
 * ✅ Retry automático (hasta 2 intentos)
 * ✅ Cache mode optimizado
 * ✅ Timeout de 10 segundos
 * ✅ Manejo robusto de errores
 *
 * @example
 * ```typescript
 * const { getAuthToken } = useToken();
 * const token = await getAuthToken();
 * if (!token) {
 *   // Manejar error de autenticación
 * }
 * ```
 *
 * ⚠️ IMPORTANTE: No usar getAccessTokenSilently() directamente.
 * Este hook garantiza consistencia en toda la aplicación.
 */
export const useToken = () => {
  /**
   * Obtiene un token de Auth0 válido
   *
   * @returns Token de acceso o null si no se pudo obtener
   *
   * Casos donde retorna null:
   * - Auth0 client no inicializado después de reintentos
   * - Token expirado y refresh token también expirado (login_required)
   * - Errores de red persistentes
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    return await getToken();
  }, []);

  return { getAuthToken };
};
