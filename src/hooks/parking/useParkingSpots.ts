import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react'; // ✅ Agregar para espacios reales
import { ParkingSpot } from '@/db/schema';
import { ParkingSpot as BackendParkingSpot } from '@/services/parking/types'; // ✅ Usar tipos del backend para espacios reales
import { parkingSpotService, ParkingSpotFilters } from '@/services/parking/parkingSpotService';
import { parkingLotService } from '@/services/parking/parkingLotService'; // ✅ Agregar para espacios reales

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
 * 🚀 Hook OPTIMIZADO para actualizar solo el estado de un espacio (IndexedDB)
 * NOTA: Este hook es para datos locales, evitar usar junto con useUpdateRealParkingSpaceStatus
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
      // 🚀 OPTIMIZACIÓN: Actualizar múltiples queries en el cache directamente
      queryClient.setQueryData(['parkingSpot', variables.id], data);

      // Actualizar lista de espacios disponibles directamente en cache
      queryClient.setQueryData(['parkingSpots', 'available'], (oldData: ParkingSpot[] | undefined) => {
        if (!oldData) return oldData;

        if (variables.status === 'available') {
          // Agregar a disponibles si no existe
          const exists = oldData.some(spot => spot.id === data.id);
          return exists ? oldData.map(spot => spot.id === data.id ? data : spot) : [...oldData, data];
        } else {
          // Remover de disponibles si cambió a otro status
          return oldData.filter(spot => spot.id !== data.id);
        }
      });

      // Invalidar solo stats con debounce para evitar calls innecesarios
      const debounceKey = 'local-occupancy';
      const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
      const timeoutId = globalDebounce[debounceKey];

      if (timeoutId) clearTimeout(timeoutId);

      globalDebounce[debounceKey] = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['parkingOccupancy'],
          refetchType: 'none'
        });
        delete globalDebounce[debounceKey];
      }, 300);

      console.log(`⚡ Espacio local ${data.id} actualizado OPTIMIZADO a ${data.status}`);
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

// ===============================
// HOOKS PARA ESPACIOS REALES DEL BACKEND
// ===============================

/**
 * ✅ Hook para obtener espacios REALES de un parking lot específico desde el backend
 * Endpoint: GET /parking-spaces/lot/{id}
 */
export const useRealParkingSpaces = (
  parkingLotId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['realParkingSpaces', parkingLotId],
    queryFn: async () => {
      if (!parkingLotId) {
        throw new Error('Parking lot ID is required');
      }
      // Offline fallback: leer de IndexedDB sin llamar al backend
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const local = await parkingSpotService.listSpots();
        if (local.error) return [] as BackendParkingSpot[];
        // Map de Dexie ParkingSpot -> BackendParkingSpot minimal
        return (local.data as unknown as Array<{
          id: number | string;
          number?: string;
          status: string;
          type?: string;
        }>).map((s) => ({
          id: s.id,
          number: s.number,
          status: s.status,
          type: s.type,
        })) as BackendParkingSpot[];
      }

      const token = await getAccessTokenSilently();
      const response = await parkingLotService.getParkingSpaces(token, parkingLotId);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!parkingLotId,
    staleTime: options?.staleTime ?? 1000 * 60 * 1, // 1 minuto - espacios cambian frecuentemente
    refetchInterval: options?.refetchInterval ?? 1000 * 30, // Refrescar cada 30 segundos
    retry: (failureCount, error: Error & { code?: string }) => {
      // No retry en errores de autenticación o conexión
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED') {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * ✅ Hook para obtener espacios con vehículo activo incluido
 * Endpoint: GET /parking-spaces/lot/{id}/with-vehicles (público)
 */
export const useRealParkingSpacesWithVehicles = (
  parkingLotId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['realParkingSpacesWithVehicles', parkingLotId],
    queryFn: async () => {
      if (!parkingLotId) throw new Error('Parking lot ID is required');
      // Offline fallback: usar IndexedDB sin vehículos activos
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const local = await parkingSpotService.listSpots();
        if (local.error) return [] as BackendParkingSpot[];
        return (local.data as unknown as Array<{
          id: number | string;
          number?: string;
          status: string;
          type?: string;
        }>).map((s) => ({
          id: s.id,
          number: s.number,
          status: s.status,
          type: s.type,
        })) as BackendParkingSpot[];
      }
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.getParkingSpacesWithVehicles(token, parkingLotId);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!parkingLotId,
    staleTime: options?.staleTime ?? 1000 * 30,
    refetchInterval: options?.refetchInterval ?? 1000 * 30,
    retry: false,
  });
};

/**
 * ✅ Hook OPTIMIZADO para actualizar el estado de un espacio real del backend
 * Endpoint: PUT /parking-spaces/{spaceId}
 * 🚀 OPTIMIZACIÓN: Usa setQueryData + invalidación selectiva para evitar llamadas duplicadas
 */
export const useUpdateRealParkingSpaceStatus = (options?: {
  onSuccess?: (updatedSpace: BackendParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceId,
      status
    }: {
      spaceId: number;
      status: 'available' | 'occupied' | 'maintenance' | 'reserved';
    }) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.updateParkingSpaceStatus(token, spaceId, status);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (_backendResponse, variables) => {
      // 🚀 OPTIMIZACIÓN CORREGIDA: Solo usar los datos de 'variables' (lo que enviamos)
      // porque el backend solo retorna "success", no el objeto completo

      // Buscar en TODAS las queries de realParkingSpaces para actualizar la correcta
      let updatedParkingLotId: string | undefined;

      queryClient.getQueriesData({ queryKey: ['realParkingSpaces'] }).forEach(([queryKey, data]) => {
        if (data && Array.isArray(data)) {
          const spaces = data as BackendParkingSpot[];
          const spaceExists = spaces.some(space => space.id === variables.spaceId);

          if (spaceExists) {
            updatedParkingLotId = queryKey[1] as string; // Extraer parkingLotId del queryKey

            // 🚀 ACTUALIZAR CACHE DIRECTAMENTE usando solo los variables (datos enviados)
            queryClient.setQueryData(queryKey,
              spaces.map(space =>
                space.id === variables.spaceId
                  ? {
                      ...space,
                      status: variables.status,
                      last_status_change: new Date().toISOString()
                    }
                  : space
              )
            );
          }
        }
      });

      // ✅ Actualizar también caches de with-vehicles para que el color cambie de inmediato
      queryClient.getQueriesData({ queryKey: ['realParkingSpacesWithVehicles'] }).forEach(([queryKey, data]) => {
        if (data && Array.isArray(data)) {
          const spaces = data as BackendParkingSpot[];
          const spaceExists = spaces.some(space => space.id === variables.spaceId);

          if (spaceExists) {
            const lotIdFromKey = queryKey[1] as string | undefined;
            if (!updatedParkingLotId) {
              updatedParkingLotId = lotIdFromKey;
            }

            queryClient.setQueryData(queryKey,
              spaces.map(space =>
                space.id === variables.spaceId
                  ? {
                      ...space,
                      status: variables.status,
                      last_status_change: new Date().toISOString()
                    }
                  : space
              )
            );
          }
        }
      });

      // Si encontramos el parking lot, invalidar queries secundarias
      if (updatedParkingLotId) {
        // 🚀 OPTIMIZACIÓN 2: Solo invalidar queries específicas que NO actualizamos directamente
        queryClient.invalidateQueries({
          queryKey: ['parkingLotStats', updatedParkingLotId],
          refetchType: 'none'
        });

        // 🚀 OPTIMIZACIÓN 3: Debounce invalidaciones de ocupancy
        const debounceKey = `occupancy-${updatedParkingLotId}`;
        const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
        const timeoutId = globalDebounce[debounceKey];

        if (timeoutId) clearTimeout(timeoutId);

        globalDebounce[debounceKey] = setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ['parkingOccupancy', updatedParkingLotId],
            refetchType: 'none'
          });
          delete globalDebounce[debounceKey];
        }, 500);

        console.log(`⚡ Espacio ${variables.spaceId} actualizado OPTIMIZADO a ${variables.status} (backend: success)`);
      } else {
        console.warn(`⚠️ No se pudo encontrar el espacio ${variables.spaceId} en el cache`);
      }

      // Pasar los variables al callback del usuario, no el backendResponse con placeholders
      options?.onSuccess?.({
        id: variables.spaceId,
        status: variables.status,
        number: `${variables.spaceId}`, // Mostrar el ID real
        last_status_change: new Date().toISOString()
      } as BackendParkingSpot);
    },
    onError: (error) => {
      console.error('Error updating real parking space:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * ✅ Hook para crear un nuevo espacio real en el backend
 * Endpoint: POST /parking-spaces/
 */
export const useCreateRealParkingSpace = (options?: {
  onSuccess?: (createdSpace: BackendParkingSpot) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceData,
      parkingLotId
    }: {
      spaceData: Omit<BackendParkingSpot, 'id' | 'created_at' | 'updated_at' | 'syncStatus' | 'last_status_change'>;
      parkingLotId: string;
    }) => {
      const token = await getAccessTokenSilently();
      const response = await parkingLotService.createParkingSpace(token, spaceData, parkingLotId);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (createdSpace) => {
      // Invalidar las queries de espacios reales para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['realParkingSpaces'] });

      console.log(`✅ Espacio ${createdSpace.number} creado exitosamente`);
      options?.onSuccess?.(createdSpace);
    },
    onError: (error) => {
      console.error('Error creating real parking space:', error);
      options?.onError?.(error);
    }
  });
};
