import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { parkingLotService } from '@/services/parking/parkingLotService';
import {
  ParkingLot,
  ParkingLotFilters
} from '@/services/parking/types';

// ===============================
// QUERY HOOKS
// ===============================

/**
 * Hook para obtener parking lots del administrador autenticado
 * Consolida funcionalidad de src/api/hooks/useParkingSpots.ts
 */
export const useParkingLots = (filters?: ParkingLotFilters, options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const query = useQuery({
    queryKey: ['parkingLots', filters],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.getParkingLots(token, filters);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutos por defecto
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: (failureCount, error) => {
      // No reintentar errores de red
      if (error.message.includes('ERR_NETWORK') || error.message.includes('ERR_CONNECTION_REFUSED')) {
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
    refetch: query.refetch
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
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] }); // Puede afectar perfil del admin

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
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
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
