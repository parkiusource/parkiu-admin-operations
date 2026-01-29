import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';
import { VehicleService } from '../services/vehicleService';
import {
  VehicleEntry,
  VehicleExit,
  VehicleEntryResponse,
  VehicleExitResponse,
  ActiveVehicle,
  CostCalculation,
  VehicleType,
  ParkingLot
} from '@/types/parking';
import { connectionService } from '@/services/connectionService';
import { enqueueOperation, generateIdempotencyKey } from '@/services/offlineQueue';

// ===============================
// UTILITY HOOKS
// ===============================

/**
 * 🔍 Hook personalizado para debounce
 */
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ===============================
// QUERY HOOKS
// ===============================

/**
 * 📋 Hook para obtener vehículos activos en un parqueadero específico
 */
export const useActiveVehicles = (parkingLotId: string, options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  return useQuery({
    queryKey: ['vehicles', 'active', parkingLotId],
    queryFn: async () => {
      try {
        if (!isAuthenticated) {
          return []; // Retornar array vacío en lugar de fallar
        }

        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10,
        });

        const response = await VehicleService.getActiveVehicles(token, parkingLotId);

        if (response.error) {
          return []; // Retornar array vacío en lugar de fallar
        }

        return response.data || [];
      } catch (error) {
        console.error('🚨 Error en useActiveVehicles:', error);
        return []; // Siempre retornar array vacío para no romper la UI
      }
    },
    enabled: (options?.enabled ?? true) && !!parkingLotId,
    staleTime: options?.staleTime ?? 1000 * 60 * 1, // 1 minuto - datos en tiempo real
    refetchInterval: options?.refetchInterval ?? 1000 * 30, // 30 segundos
    retry: 1, // Solo 1 reintento
  });
};

/**
 * 📊 Hook para obtener historial de transacciones de un parqueadero
 */
export const useTransactionHistory = (
  parkingLotId: string,
  filters?: {
    limit?: number;
    offset?: number;
    date_from?: string;
    date_to?: string;
    plate?: string;
    status?: 'active' | 'completed';
    payment_method?: 'cash' | 'card' | 'digital';
  },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['vehicles', 'transactions', parkingLotId, filters],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await VehicleService.getTransactionHistory(token, parkingLotId, filters);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    enabled: (options?.enabled ?? true) && !!parkingLotId,
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutos
    retry: (failureCount, error: Error & { code?: string }) => {
      if (error?.code === 'ERR_NETWORK') {
        return false;
      }
      return failureCount < 2;
    }
  });
};

/**
 * 🔍 Hook para buscar un vehículo específico por placa (con debounce)
 * ✅ Con soporte offline: busca en caché local cuando el backend no responde
 */
export const useSearchVehicle = (
  parkingLotId: string,
  plate: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    debounceMs?: number;
  }
) => {
  const { getAccessTokenSilently } = useAuth0();
  const normalizedPlate = (plate || '').trim().toUpperCase();

  // 🚀 Aplicar debounce a la placa para evitar demasiadas peticiones
  const debouncedPlate = useDebounce(normalizedPlate, options?.debounceMs ?? 500);

  return useQuery({
    queryKey: ['vehicles', 'search', parkingLotId, debouncedPlate],
    queryFn: async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Searching vehicle with plate:', debouncedPlate);
      }

      try {
        const token = await getAccessTokenSilently();
        const response = await VehicleService.searchVehicle(token, parkingLotId, debouncedPlate);

        if (response.error) {
          throw new Error(response.error);
        }

        // 💾 Si encontramos vehículo, cachearlo para uso offline
        if (response.data) {
          const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
          await cacheVehicleEntry(
            parkingLotId,
            response.data.plate,
            response.data.vehicle_type,
            response.data.spot_number
          );
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Vehicle found:', response.data);
        }

        return response.data;
      } catch (error) {
        // 📦 FALLBACK: Buscar en caché local en estos casos:
        // 1. Error de red (backend no disponible)
        // 2. 404 (vehículo no encontrado en backend, pero podría estar en caché local)
        // 3. Cualquier error si estamos offline
        const { isNetworkError } = await import('@/services/offlineCache');
        const { connectionService } = await import('@/services/connectionService');

        const is404 = (error as any)?.response?.status === 404;
        const shouldCheckCache = isNetworkError(error) || is404 || connectionService.isOffline();

        if (shouldCheckCache) {
          const reason = is404 ? 'Vehículo no en backend' : 'Backend no disponible';
          console.log(`🔄 ${reason}, buscando vehículo en caché...`);

          const { findCachedVehicle } = await import('@/services/activeVehiclesCache');
          const cached = await findCachedVehicle(parkingLotId, debouncedPlate);

          if (cached) {
            console.log(`✅ Vehículo encontrado en caché: ${cached.plate}`);
            return cached;
          } else {
            console.log('❌ Vehículo no encontrado en caché');
          }
        }

        // Si no es un caso para buscar en caché o no hay caché, propagar error
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Vehicle search error:', error);
        }
        throw new Error('Error buscando vehículo');
      }
    },
    enabled: (options?.enabled ?? true) && !!parkingLotId && !!debouncedPlate && debouncedPlate.length >= 3,
    staleTime: options?.staleTime ?? 1000 * 60 * 1, // 1 minuto para búsquedas
    retry: false,
    // Evitar refetch automático para búsquedas
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
};

// ===============================
// MUTATION HOOKS
// ===============================

/**
 * 🚗 Hook para registrar entrada de vehículo
 * ✅ Funciona completamente offline: cachea vehículo y encola para sincronizar
 */
export const useRegisterVehicleEntry = (options?: {
  onSuccess?: (data: VehicleEntryResponse, entryData: { parkingLotId: string; vehicleData: VehicleEntry }) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parkingLotId, vehicleData }: { parkingLotId: string; vehicleData: VehicleEntry }) => {
      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado');
      }

      try {
        const now = new Date().toISOString();
        const spotNumber = vehicleData.space_number || vehicleData.spot_number || vehicleData.parking_space_number || '';

        // OFFLINE: funcionar completamente sin conexión
        if (!connectionService.isOnline()) {
          console.log('📴 Modo offline: Registrando entrada localmente');

          const idempotencyKey = generateIdempotencyKey(`entry-${vehicleData.plate}`);

          // 1. Encolar operación para sincronizar después
          await enqueueOperation({
            type: 'entry',
            parkingLotId,
            plate: vehicleData.plate,
            payload: {
              ...vehicleData,
              client_entry_time: now,
              idempotencyKey
            },
            idempotencyKey,
          });

          // 2. Cachear vehículo activo localmente
          const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
          await cacheVehicleEntry(
            parkingLotId,
            vehicleData.plate,
            vehicleData.vehicle_type,
            spotNumber
          );

          // 3. Retornar respuesta temporal para que la UI funcione
          return {
            transaction_id: Date.now(), // ID temporal
            entry_time: now,
            spot_number: spotNumber,
            estimated_cost: 0,
          } as VehicleEntryResponse;
        }

        // ONLINE: intentar registrar en backend
        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10
        });

        const response = await VehicleService.registerEntry(token, parkingLotId, vehicleData);

        if (response.error) {
          throw new Error(response.error);
        }

        // ✅ Cachear vehículo para uso offline posterior
        const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
        await cacheVehicleEntry(
          parkingLotId,
          vehicleData.plate,
          vehicleData.vehicle_type,
          response.data!.spot_number,
          response.data!.transaction_id
        );

        return response.data!;
      } catch (error) {
        // Si falla por error de red, intentar offline
        const { isNetworkError } = await import('@/services/offlineCache');
        if (isNetworkError(error)) {
          console.log('🔄 Error de red, usando modo offline...');
          const now = new Date().toISOString();
          const spotNumber = vehicleData.space_number || vehicleData.spot_number || vehicleData.parking_space_number || '';
          const idempotencyKey = generateIdempotencyKey(`entry-${vehicleData.plate}`);

          await enqueueOperation({
            type: 'entry',
            parkingLotId,
            plate: vehicleData.plate,
            payload: {
              ...vehicleData,
              client_entry_time: now,
              idempotencyKey
            },
            idempotencyKey,
          });

          const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
          await cacheVehicleEntry(
            parkingLotId,
            vehicleData.plate,
            vehicleData.vehicle_type,
            spotNumber
          );

          return {
            transaction_id: Date.now(),
            entry_time: now,
            spot_number: spotNumber,
            estimated_cost: 0,
          } as VehicleEntryResponse;
        }

        throw error as Error;
      }
    },
    onSuccess: (data, variables) => {
      // 🚀 OPTIMIZACIÓN: Actualizar cache de vehículos activos directamente
      const newActiveVehicle: ActiveVehicle = {
        plate: variables.vehicleData.plate,
        vehicle_type: variables.vehicleData.vehicle_type,
        spot_number: data.spot_number,
        entry_time: data.entry_time,
        duration_minutes: 0,
        current_cost: 0
      };

      queryClient.setQueryData(['vehicles', 'active', variables.parkingLotId], (oldData: ActiveVehicle[] | undefined) => {
        return oldData ? [...oldData, newActiveVehicle] : [newActiveVehicle];
      });

      // 🚀 OPTIMIZACIÓN: Actualizar estado del espacio a 'occupied' en el cache
      const spotNumber = data.spot_number || variables.vehicleData.space_number || variables.vehicleData.spot_number;
      if (spotNumber) {
        queryClient.setQueryData(['realParkingSpaces', variables.parkingLotId], (oldSpaces: unknown) => {
          if (!oldSpaces || !Array.isArray(oldSpaces)) return oldSpaces;
          return oldSpaces.map((space: { number?: string; status?: string }) =>
            space.number === spotNumber
              ? { ...space, status: 'occupied', last_status_change: new Date().toISOString() }
              : space
          );
        });

        // También actualizar cache de espacios con vehículos
        queryClient.setQueryData(['realParkingSpacesWithVehicles', variables.parkingLotId], (oldSpaces: unknown) => {
          if (!oldSpaces || !Array.isArray(oldSpaces)) return oldSpaces;
          return oldSpaces.map((space: { number?: string; status?: string }) =>
            space.number === spotNumber
              ? { ...space, status: 'occupied', last_status_change: new Date().toISOString() }
              : space
          );
        });
      }

      const debounceKey = `vehicle-entry-${variables.parkingLotId}`;
      const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
      const timeoutId = globalDebounce[debounceKey];

      if (timeoutId) clearTimeout(timeoutId);

      globalDebounce[debounceKey] = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['vehicles', 'transactions', variables.parkingLotId],
          refetchType: 'none'
        });
        queryClient.invalidateQueries({
          queryKey: ['parkingLotStats', variables.parkingLotId],
          refetchType: 'none'
        });
        // Refetch parking spaces to update occupied/available status and sync with backend
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpaces', variables.parkingLotId],
          refetchType: 'active'
        });
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpacesWithVehicles', variables.parkingLotId],
          refetchType: 'active'
        });

        delete globalDebounce[debounceKey];
      }, 200);

      options?.onSuccess?.(data as VehicleEntryResponse, variables);
    },
    onError: (error) => {
      options?.onError?.(error);
    }
  });
};

/**
 * 🚪 Hook para registrar salida de vehículo
 * ✅ Funciona completamente offline: calcula costo, elimina del caché, encola
 */
export const useRegisterVehicleExit = (options?: {
  onSuccess?: (data: VehicleExitResponse, exitData: { parkingLotId: string; vehicleData: VehicleExit }) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parkingLotId, vehicleData }: { parkingLotId: string; vehicleData: VehicleExit }) => {
      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado');
      }

      const now = new Date().toISOString();

      // OFFLINE: funcionar completamente sin conexión
      if (!connectionService.isOnline()) {
        console.log('📴 Modo offline: Registrando salida localmente');

        const idempotencyKey = generateIdempotencyKey(`exit-${vehicleData.plate}`);

        // 1. Obtener vehículo del caché para calcular duración
        const { findCachedVehicle, removeVehicleFromCache } = await import('@/services/activeVehiclesCache');
        const cachedVehicle = await findCachedVehicle(parkingLotId, vehicleData.plate);

        const durationMinutes = cachedVehicle
          ? Math.floor((new Date().getTime() - new Date(cachedVehicle.entry_time).getTime()) / (1000 * 60))
          : 0;

        // 2. Encolar operación para sincronizar después
        await enqueueOperation({
          type: 'exit',
          parkingLotId,
          plate: vehicleData.plate,
          payload: {
            ...vehicleData,
            client_exit_time: now,
            idempotencyKey
          },
          idempotencyKey,
        });

        // 3. Eliminar vehículo del caché local
        await removeVehicleFromCache(parkingLotId, vehicleData.plate);

        // 4. Retornar respuesta temporal
        return {
          transaction_id: Date.now(),
          total_cost: vehicleData.payment_amount,
          duration_minutes: durationMinutes,
          receipt: JSON.stringify({
            plate: vehicleData.plate,
            exit_time: now,
            entry_time: cachedVehicle?.entry_time || now,
            total_cost: vehicleData.payment_amount,
            duration_minutes: durationMinutes,
            payment_method: vehicleData.payment_method,
            offline: true
          })
        } as VehicleExitResponse;
      }

      // ONLINE: intentar registrar en backend
      try {
        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10,
        });

        const response = await VehicleService.registerExit(token, parkingLotId, vehicleData);

        if (response.error) {
          throw new Error(response.error);
        }

        // ✅ Eliminar vehículo del caché tras salida exitosa
        const { removeVehicleFromCache } = await import('@/services/activeVehiclesCache');
        await removeVehicleFromCache(parkingLotId, vehicleData.plate);

        return response.data!;
      } catch (error) {
        // Si falla por error de red, intentar offline
        const { isNetworkError } = await import('@/services/offlineCache');
        if (isNetworkError(error)) {
          console.log('🔄 Error de red, usando modo offline para salida...');

          const idempotencyKey = generateIdempotencyKey(`exit-${vehicleData.plate}`);
          const { findCachedVehicle, removeVehicleFromCache } = await import('@/services/activeVehiclesCache');
          const cachedVehicle = await findCachedVehicle(parkingLotId, vehicleData.plate);

          const durationMinutes = cachedVehicle
            ? Math.floor((new Date().getTime() - new Date(cachedVehicle.entry_time).getTime()) / (1000 * 60))
            : 0;

          await enqueueOperation({
            type: 'exit',
            parkingLotId,
            plate: vehicleData.plate,
            payload: {
              ...vehicleData,
              client_exit_time: now,
              idempotencyKey
            },
            idempotencyKey,
          });

          await removeVehicleFromCache(parkingLotId, vehicleData.plate);

          return {
            transaction_id: Date.now(),
            total_cost: vehicleData.payment_amount,
            duration_minutes: durationMinutes,
            receipt: JSON.stringify({
              plate: vehicleData.plate,
              exit_time: now,
              entry_time: cachedVehicle?.entry_time || now,
              total_cost: vehicleData.payment_amount,
              duration_minutes: durationMinutes,
              payment_method: vehicleData.payment_method,
              offline: true
            })
          } as VehicleExitResponse;
        }

        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // 🚀 OPTIMIZACIÓN: Remover vehículo del cache de activos directamente y obtener su espacio
      let exitedVehicleSpot: string | undefined;
      queryClient.setQueryData(['vehicles', 'active', variables.parkingLotId], (oldData: ActiveVehicle[] | undefined) => {
        if (!oldData) return [];
        const exitedVehicle = oldData.find(vehicle => vehicle.plate === variables.vehicleData.plate);
        exitedVehicleSpot = exitedVehicle?.spot_number;
        return oldData.filter(vehicle => vehicle.plate !== variables.vehicleData.plate);
      });

      // 🚀 OPTIMIZACIÓN: Actualizar estado del espacio a 'available' en el cache
      if (exitedVehicleSpot) {
        queryClient.setQueryData(['realParkingSpaces', variables.parkingLotId], (oldSpaces: unknown) => {
          if (!oldSpaces || !Array.isArray(oldSpaces)) return oldSpaces;
          return oldSpaces.map((space: { number?: string; status?: string }) =>
            space.number === exitedVehicleSpot
              ? { ...space, status: 'available', last_status_change: new Date().toISOString() }
              : space
          );
        });

        // También actualizar cache de espacios con vehículos
        queryClient.setQueryData(['realParkingSpacesWithVehicles', variables.parkingLotId], (oldSpaces: unknown) => {
          if (!oldSpaces || !Array.isArray(oldSpaces)) return oldSpaces;
          return oldSpaces.map((space: { number?: string; status?: string }) =>
            space.number === exitedVehicleSpot
              ? { ...space, status: 'available', last_status_change: new Date().toISOString() }
              : space
          );
        });
      }

      // Debounce para invalidaciones secundarias
      const debounceKey = `vehicle-exit-${variables.parkingLotId}`;
      const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
      const timeoutId = globalDebounce[debounceKey];

      if (timeoutId) clearTimeout(timeoutId);

      globalDebounce[debounceKey] = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['vehicles', 'transactions', variables.parkingLotId],
          refetchType: 'none'
        });
        queryClient.invalidateQueries({
          queryKey: ['parkingLotStats', variables.parkingLotId],
          refetchType: 'none'
        });

        // Refetch parking spaces to update occupied/available status and sync with backend
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpaces', variables.parkingLotId],
          refetchType: 'active'
        });
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpacesWithVehicles', variables.parkingLotId],
          refetchType: 'active'
        });

        delete globalDebounce[debounceKey];
      }, 200);

      // Salida de vehículo optimizada
      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      console.error('Error registering vehicle exit:', error);
      options?.onError?.(error);
    }
  });
};

// ===============================
// UTILIDADES Y HOOKS COMPUESTOS
// ===============================

/**
 * 📊 Hook compuesto para obtener estadísticas de vehículos
 */
export const useVehicleStats = (parkingLotId: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) => {
  const { data: activeVehicles = [], ...activeQuery } = useActiveVehicles(
    parkingLotId,
    {
      enabled: options?.enabled,
      refetchInterval: options?.refetchInterval,
    }
  );

  const stats = {
    totalActive: activeVehicles.length,
    byType: activeVehicles.reduce((acc, vehicle) => {
      acc[vehicle.vehicle_type] = (acc[vehicle.vehicle_type] || 0) + 1;
      return acc;
    }, {} as Record<VehicleType, number>),
    totalRevenue: activeVehicles.reduce((sum, vehicle) => sum + vehicle.current_cost, 0),
    averageDuration: activeVehicles.length > 0
      ? Math.round(
          activeVehicles
            .map(v => v.duration_minutes)
            .reduce((sum, duration) => sum + duration, 0) / activeVehicles.length
        )
      : 0,
  };

  return {
    ...activeQuery,
    activeVehicles,
    stats,
  };
};

/**
 * 🧮 Hook para calculadora de costos en tiempo real
 * Útil para mostrar estimaciones y costos actuales
 */
export const useCostCalculator = (parkingLot: ParkingLot) => {
  const calculateCost = (entryTime: string, vehicleType: VehicleType): CostCalculation => {
    return VehicleService.calculateCurrentCost(entryTime, vehicleType, parkingLot);
  };

  const estimateCost = (durationMinutes: number, vehicleType: VehicleType): CostCalculation => {
    return VehicleService.estimateCost(durationMinutes, vehicleType, parkingLot);
  };

  return {
    calculateCost,
    estimateCost,
  };
};
