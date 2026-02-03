import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { parkingLotService } from '@/services/parking/parkingLotService';
import {
  ParkingLot,
  ParkingLotFilters
} from '@/services/parking/types';
import { saveTariffs } from '@/services/offlineTariffs';
import {
  cacheParkingLots,
  getCachedParkingLots,
  isNetworkError
} from '@/services/offlineCache';
import { connectionService } from '@/services/connectionService';
import { useToken } from '@/hooks/useToken';
import { hasValidOfflineSession } from '@/services/offlineSession';

// ===============================
// QUERY HOOKS
// ===============================

/**
 * Hook para obtener parking lots del administrador autenticado
 * ✅ Con soporte offline: guarda en caché y hace fallback cuando el backend no responde
 * ✅ OFFLINE-FIRST: Permite cargar datos del caché incluso sin Auth0 activo
 */
export const useParkingLots = (filters?: ParkingLotFilters, options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}) => {
  const { isAuthenticated } = useAuth0();
  const { getAuthToken } = useToken();
  const [isFromCache, setIsFromCache] = useState(false);

  // 📴 OFFLINE-FIRST: Verificar si hay sesión offline válida
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const canOperateOffline = !isOnline && hasValidOfflineSession();

  const query = useQuery({
    queryKey: ['parkingLots', filters],
    queryFn: async () => {
      // 📴 OFFLINE-FIRST: Si estamos offline, ir directo al caché sin verificar Auth0
      if (connectionService.considerOffline() || !isOnline) {
        const cached = await getCachedParkingLots();
        if (cached && cached.length > 0) {
          setIsFromCache(true);
          console.log('📴 [useParkingLots] Cargando desde caché offline:', cached.length, 'parqueaderos');
          return cached;
        }
        // Si no hay caché y estamos offline, lanzar error descriptivo
        throw new Error('Sin conexión y no hay datos en caché');
      }

      // Online pero no autenticado - no podemos hacer nada
      if (!isAuthenticated) {
        return [];
      }

      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No se pudo obtener el token de autenticación');
        }

        const response = await parkingLotService.getParkingLots(token, filters);

        if (response.error) {
          throw new Error(response.error);
        }

        if (response.data && Array.isArray(response.data)) {
          await cacheParkingLots(response.data);

          response.data.forEach(lot => {
            if (lot.id) {
              saveTariffs(lot.id, lot);
            }
          });
        }

        setIsFromCache(false);
        return response.data;
      } catch (error) {
        if (isNetworkError(error)) {
          const cached = await getCachedParkingLots();

          if (cached && cached.length > 0) {
            setIsFromCache(true);
            return cached;
          }
        }

        throw error;
      }
    },
    // 📴 OFFLINE-FIRST: Habilitar query si está autenticado O si puede operar offline
    enabled: (isAuthenticated || canOperateOffline) && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutos por defecto
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: (failureCount, error) => {
      // No reintentar errores de red (ya usamos caché)
      if (isNetworkError(error)) {
        return false;
      }
      return failureCount < 2;
    }
  });

  return {
    ...query,
    parkingLots: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFromCache // ✅ Nuevo: indica si los datos vienen del caché
  };
};

/**
 * Hook para obtener un parking lot específico por ID
 */
export const useParkingLot = (id: string, options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const query = useQuery({
    queryKey: ['parkingLot', id],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.getParkingLotById(token, id);

      if (response.error) {
        throw new Error(response.error);
      }

      // 💾 OFFLINE: Cachear tarifas en localStorage
      if (response.data && response.data.id) {
        saveTariffs(response.data.id, response.data);
      }

      return response.data;
    },
    enabled: isAuthenticated && !!id && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60 * 10, // 10 minutos para datos específicos
    retry: false
  });

  return {
    ...query,
    parkingLot: query.data,
    isLoading: query.isLoading,
    error: query.error
  };
};

/**
 * Hook para obtener estadísticas de un parking lot
 */
export const useParkingLotStats = (id: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const query = useQuery({
    queryKey: ['parkingLotStats', id],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.getParkingLotStats(token, id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isAuthenticated && !!id && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2, // 2 minutos para stats (datos más dinámicos)
    refetchInterval: options?.refetchInterval ?? 1000 * 60 * 5, // Actualizar cada 5 minutos
    retry: false
  });

  return {
    ...query,
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error
  };
};

// ===============================
// MUTATION HOOKS
// ===============================

/**
 * Hook para crear un nuevo parking lot
 * Consolida funcionalidad de src/api/hooks/useCreateParking.ts
 */
export const useCreateParkingLot = (options?: {
  onSuccess?: (data: ParkingLot) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<ParkingLot, Error, Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'>> => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parkingLotData) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.createParkingLot(token, parkingLotData);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar cache de parking lots
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });
      // 🔥 FIX LOOP: Removido invalidateQueries de adminProfile - no es necesario y causaba loops

      options?.onSuccess?.(data);
    },
    onError: options?.onError
  });
};

/**
 * Hook para registrar un parking lot durante onboarding
 */
export const useRegisterParkingLot = (options?: {
  onSuccess?: (data: ParkingLot) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<ParkingLot, Error, Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'>> => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parkingLotData) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.registerParkingLot(token, parkingLotData);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });
      // 🔥 FIX LOOP: Removido invalidateQueries de adminProfile - causaba loops
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });

      options?.onSuccess?.(data);
    },
    onError: options?.onError
  });
};

/**
 * Hook para actualizar un parking lot existente
 */
export const useUpdateParkingLot = (options?: {
  onSuccess?: (data: ParkingLot) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ParkingLot> }) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.updateParkingLot(token, id, updates);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache específico y general
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingLot', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['parkingLotStats', variables.id] });

      options?.onSuccess?.(data);
    },
    onError: options?.onError
  });
};

/**
 * Hook para cambiar el estado de un parking lot
 */
export const useUpdateParkingLotStatus = (options?: {
  onSuccess?: (data: ParkingLot) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ParkingLot['status'] }) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.updateParkingLotStatus(token, id, status);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingLot', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['parkingLotStats', variables.id] });

      options?.onSuccess?.(data);
    },
    onError: options?.onError
  });
};

/**
 * Hook para eliminar un parking lot
 */
export const useDeleteParkingLot = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.deleteParkingLot(token, id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (_, id) => {
      // Limpiar cache del parking lot eliminado
      queryClient.removeQueries({ queryKey: ['parkingLot', id] });
      queryClient.removeQueries({ queryKey: ['parkingLotStats', id] });
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });

      options?.onSuccess?.();
    },
    onError: options?.onError
  });
};

// ===============================
// BÚSQUEDA PÚBLICA
// ===============================

/**
 * Hook para búsqueda pública de parking lots (para usuarios finales)
 */
export const useSearchParkingLots = (filters: ParkingLotFilters, options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const query = useQuery({
    queryKey: ['publicParkingLots', filters],
    queryFn: async () => {
      const response = await parkingLotService.searchPublicParkingLots(filters);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 3, // 3 minutos para búsquedas públicas
    retry: false
  });

  return {
    ...query,
    parkingLots: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
};
