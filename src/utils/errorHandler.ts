/**
 * Manejo Centralizado de Errores
 *
 * Convierte cualquier error en un formato estructurado
 * con mensajes user-friendly según el tipo de error.
 */

import { AxiosError } from 'axios';
import { logger } from './logger';

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  isNetworkError: boolean;
  isAuthError: boolean;
}

/**
 * Mensajes user-friendly por código de estado HTTP
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Datos inválidos. Por favor verifica la información ingresada.',
  401: 'Sesión expirada. Por favor inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'Recurso no encontrado.',
  409: 'Conflicto con los datos existentes.',
  422: 'Los datos enviados no son válidos.',
  429: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
  500: 'Error del servidor. Intenta de nuevo más tarde.',
  502: 'El servidor no está disponible. Intenta de nuevo más tarde.',
  503: 'Servicio temporalmente no disponible.',
  504: 'El servidor tardó demasiado en responder.',
};

/**
 * Convierte cualquier error en un AppError estructurado
 */
export function handleError(error: unknown, context?: string): AppError {
  // Error de Axios (API calls)
  if (error instanceof AxiosError) {
    const isNetworkError = !error.response;
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;

    // Obtener mensaje del backend o usar mensaje por defecto
    const serverMessage = error.response?.data?.message || error.response?.data?.error;
    const defaultMessage = status ? HTTP_ERROR_MESSAGES[status] : undefined;

    let message: string;
    if (isNetworkError) {
      message = 'Sin conexión a internet. Verifica tu red.';
    } else if (serverMessage) {
      message = serverMessage;
    } else if (defaultMessage) {
      message = defaultMessage;
    } else {
      message = 'Ha ocurrido un error. Intenta de nuevo.';
    }

    const appError: AppError = {
      message,
      code: error.code,
      status,
      details: error.response?.data,
      isNetworkError,
      isAuthError,
    };

    logger.error(message, { status, code: error.code, details: error.response?.data }, context);
    return appError;
  }

  // Error estándar de JavaScript
  if (error instanceof Error) {
    const appError: AppError = {
      message: error.message || 'Ha ocurrido un error inesperado.',
      details: error.stack,
      isNetworkError: false,
      isAuthError: false,
    };

    logger.error(error.message, error, context);
    return appError;
  }

  // Error desconocido
  const appError: AppError = {
    message: 'Ha ocurrido un error inesperado.',
    details: error,
    isNetworkError: false,
    isAuthError: false,
  };

  logger.error('Unknown error', error, context);
  return appError;
}

/**
 * Hook para usar en componentes React
 */
export function useErrorHandler() {
  return {
    handleError: (error: unknown, context?: string) => handleError(error, context),
  };
}

/**
 * Wrapper para async/await con manejo de errores
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  context?: string
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    return [null, handleError(error, context)];
  }
}
