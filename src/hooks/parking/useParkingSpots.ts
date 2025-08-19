import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ParkingSpot } from '@/db/schema';
import { parkingSpotService, ParkingSpotFilters } from '@/services/parking/parkingSpotService';

// ===============================
// QUERY HOOKS
// ===============================

/**
 * Hook mejorado para obtener espacios de parqueo disponibles
 * Migrado y mejorado desde src/hooks/useParkingSpots.ts
 */
export const useAvailableParkingSpots = (filters?: ParkingSpotFilters, options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}) => {
  const query = useQuery({
    queryKey: ['parkingSpots', 'available', filters],
    queryFn: async () => {
      const response = await parkingSpotService.getAvailableSpots(filters);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 2, // 2 minutos para disponibilidad
    refetchInterval: options?.refetchInterval ?? 1000 * 30, // Refrescar cada 30 segundos
    retry: (failureCount, error) => {
      console.warn('Error fetching available parking spots:', error);
      return failureCount < 1; // Solo 1 reintento para IndexedDB
    }
  });

  return {
    ...query,
    availableSpots: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};

/**
 * Hook para obtener todos los espacios de parqueo con filtros
 */
export const useParkingSpots = (filters?: ParkingSpotFilters, options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const query = useQuery({
    queryKey: ['parkingSpots', 'all', filters],
    queryFn: async () => {
      const response = await parkingSpotService.listSpots(filters);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutos para listado completo
    retry: false
  });

  return {
    ...query,
    parkingSpots: query.data || [],
    isLoading: query.isLoading,
    error: query.error
  };
};

/**
 * Hook para obtener un espacio específico por ID
 */
export const useParkingSpot = (id: number | string, options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const query = useQuery({
    queryKey: ['parkingSpot', id],
    queryFn: async () => {
      const response = await parkingSpotService.getSpotById(id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: !!id && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60 * 10, // 10 minutos para datos específicos
    retry: false
  });

  return {
    ...query,
    parkingSpot: query.data,
    isLoading: query.isLoading,
    error: query.error
  };
};

/**
 * Hook para obtener estadísticas de ocupación
 */
export const useParkingOccupancyStats = (options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) => {
  const query = useQuery({
    queryKey: ['parkingOccupancy'],
    queryFn: async () => {
      const response = await parkingSpotService.getOccupancyStats();

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 1, // 1 minuto para estadísticas dinámicas
    refetchInterval: options?.refetchInterval ?? 1000 * 60 * 2, // Actualizar cada 2 minutos
    retry: false
  });

  return {
    ...query,
    occupancyStats: query.data,
    isLoading: query.isLoading,
    error: query.error
  };
};

// ===============================
// MUTATION HOOKS
// ===============================

/**
 * Hook para crear un nuevo espacio de parqueo
 */
export const useCreateParkingSpot = (options?: {
  onSuccess?: (data: ParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spotData: Omit<ParkingSpot, 'id' | 'created_at' | 'updated_at' | 'syncStatus'>) => {
      const response = await parkingSpotService.createSpot(spotData);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar todas las queries relacionadas con parking spots
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error creating parking spot:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * Hook para actualizar un espacio de parqueo
 */
export const useUpdateParkingSpot = (options?: {
  onSuccess?: (data: ParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number | string; updates: Partial<ParkingSpot> }) => {
      const response = await parkingSpotService.updateSpot(id, updates);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Actualizar cache específico
      queryClient.setQueryData(['parkingSpot', variables.id], data);

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error updating parking spot:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * Hook para actualizar solo el estado de un espacio
 */
export const useUpdateSpotStatus = (options?: {
  onSuccess?: (data: ParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number | string; status: ParkingSpot['status'] }) => {
      const response = await parkingSpotService.updateSpotStatus(id, status);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Actualizar cache específico
      queryClient.setQueryData(['parkingSpot', variables.id], data);

      // Invalidar queries que dependen del estado
      queryClient.invalidateQueries({ queryKey: ['parkingSpots', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error updating spot status:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * Hook para ocupar un espacio de parqueo
 */
export const useOccupySpot = (options?: {
  onSuccess?: (data: ParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await parkingSpotService.occupySpot(id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data, id) => {
      // Actualizar cache
      queryClient.setQueryData(['parkingSpot', id], data);

      // Invalidar queries de disponibilidad
      queryClient.invalidateQueries({ queryKey: ['parkingSpots', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      // También invalidar transacciones si están relacionadas
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error occupying parking spot:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * Hook para liberar un espacio de parqueo
 */
export const useReleaseSpot = (options?: {
  onSuccess?: (data: ParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await parkingSpotService.releaseSpot(id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data, id) => {
      // Actualizar cache
      queryClient.setQueryData(['parkingSpot', id], data);

      // Invalidar queries de disponibilidad
      queryClient.invalidateQueries({ queryKey: ['parkingSpots', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      // También invalidar transacciones
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error releasing parking spot:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * Hook para eliminar un espacio de parqueo
 */
export const useDeleteParkingSpot = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await parkingSpotService.deleteSpot(id);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (_, id) => {
      // Limpiar cache del spot eliminado
      queryClient.removeQueries({ queryKey: ['parkingSpot', id] });

      // Invalidar queries generales
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('Error deleting parking spot:', error);
      options?.onError?.(error);
    }
  });
};

// ===============================
// UTILIDADES Y ACCIONES
// ===============================

/**
 * Hook para sincronizar espacios pendientes con el backend
 */
export const useSyncParkingSpots = (options?: {
  onSuccess?: (count: number) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await parkingSpotService.syncPendingSpots();

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (count) => {
      // Invalidar todas las queries después de la sincronización
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });

      options?.onSuccess?.(count);
    },
    onError: (error) => {
      console.error('Error syncing parking spots:', error);
      options?.onError?.(error);
    }
  });
};
