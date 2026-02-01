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
import { useStore } from '@/store/useStore';

const ONLINE_TIMEOUT_MS = 5000;
const EXIT_SAFETY_TIMEOUT_MS = 12000; // Máximo tiempo de espera para salida (evita "Procesando..." eterno)
const AUTH_TIMEOUT_SECONDS = 4;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ]);
}

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
 * Offline: deshabilitado para no llamar al backend; se muestran datos en caché o vacíos.
 */
export const useActiveVehicles = (parkingLotId: string, options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const isOffline = useStore((s) => s.isOffline);

  return useQuery({
    queryKey: ['vehicles', 'active', parkingLotId],
    queryFn: async () => {
      try {
        if (!isAuthenticated) {
          return [];
        }

        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10,
        });

        const response = await VehicleService.getActiveVehicles(token, parkingLotId);

        if (response.error) {
          return [];
        }

        return response.data || [];
      } catch (error) {
        console.error('🚨 Error en useActiveVehicles:', error);
        return [];
      }
    },
    enabled: (options?.enabled ?? true) && !!parkingLotId && !isOffline,
    staleTime: options?.staleTime ?? 1000 * 60 * 1,
    refetchInterval: isOffline ? false : (options?.refetchInterval ?? 1000 * 30),
    retry: 1,
  });
};

/**
 * 📊 Hook para obtener historial de transacciones de un parqueadero
 * Offline: deshabilitado para no llamar al backend.
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
  const isOffline = useStore((s) => s.isOffline);

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
    enabled: (options?.enabled ?? true) && !!parkingLotId && !isOffline,
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
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
      }

      const addPendingExitFlag = async (v: ActiveVehicle | null): Promise<(ActiveVehicle & { __pendingExit?: boolean }) | null> => {
        if (!v) return null;
        const { getPendingExitPlates } = await import('@/services/offlineQueue');
        const pending = await getPendingExitPlates(parkingLotId);
        return { ...v, __pendingExit: pending.has((v.plate || '').toUpperCase()) };
      };

      // OFFLINE-FIRST: navigator.onLine o store offline → ir directo al caché sin llamar al backend
      if (connectionService.considerOffline()) {
        const { findCachedVehicle } = await import('@/services/activeVehiclesCache');
        const cached = await findCachedVehicle(parkingLotId, debouncedPlate);
        if (cached) {
          return addPendingExitFlag(cached);
        }
        throw new Error('Error buscando vehículo');
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
        }

        return addPendingExitFlag(response.data ?? null);
      } catch (error) {
        // 📦 FALLBACK: Buscar en caché local en estos casos:
        // 1. Error de red (backend no disponible)
        // 2. 404 (vehículo no encontrado en backend, pero podría estar en caché local)
        const { isNetworkError } = await import('@/services/offlineCache');

        const is404 = (error as { response?: { status?: number } })?.response?.status === 404;
        const shouldCheckCache = isNetworkError(error) || is404;

        if (shouldCheckCache) {
          const reason = is404 ? 'Vehículo no en backend' : 'Backend no disponible';

          const { findCachedVehicle } = await import('@/services/activeVehiclesCache');
          const cached = await findCachedVehicle(parkingLotId, debouncedPlate);

          if (cached) {
            return addPendingExitFlag(cached);
          }
        }

        if (process.env.NODE_ENV === 'development') {
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

        const runOfflineEntry = async () => {
          const idempotencyKey = generateIdempotencyKey(`entry-${vehicleData.plate}`);
          await enqueueOperation({
            type: 'entry',
            parkingLotId,
            plate: vehicleData.plate,
            payload: { ...vehicleData, client_entry_time: now, idempotencyKey },
            idempotencyKey,
          });
          const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
          await cacheVehicleEntry(parkingLotId, vehicleData.plate, vehicleData.vehicle_type, spotNumber);
          return {
            transaction_id: Date.now(),
            entry_time: now,
            spot_number: spotNumber,
            estimated_cost: 0,
            __offline: true,
          } as VehicleEntryResponse & { __offline?: boolean };
        };

        // OFFLINE: navigator.onLine o store offline → ir directo a local sin llamar backend
        if (connectionService.considerOffline()) {
          return runOfflineEntry();
        }

        // ONLINE: intentar backend con timeout para no colgar "Registrando..." si la red falla
        try {
          const result = await withTimeout(
            (async () => {
              if (connectionService.considerOffline()) {
                return runOfflineEntry();
              }
              const token = await getAccessTokenSilently({ timeoutInSeconds: AUTH_TIMEOUT_SECONDS });
              if (connectionService.considerOffline()) {
                return runOfflineEntry();
              }
              const response = await VehicleService.registerEntry(token, parkingLotId, vehicleData);
              if (response.error) throw new Error(response.error);
              const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
              await cacheVehicleEntry(
                parkingLotId,
                vehicleData.plate,
                vehicleData.vehicle_type,
                response.data!.spot_number,
                response.data!.transaction_id
              );
              return response.data!;
            })(),
            ONLINE_TIMEOUT_MS
          );
          return result;
        } catch (onlineError) {
          const { isNetworkError } = await import('@/services/offlineCache');
          if (isNetworkError(onlineError)) {
            connectionService.setOffline(true);
            return runOfflineEntry();
          }
          throw onlineError as Error;
        }
      } catch (error) {
        const { isNetworkError } = await import('@/services/offlineCache');
        if (isNetworkError(error)) {
          connectionService.setOffline(true);
          const now = new Date().toISOString();
          const spotNumber = vehicleData.space_number || vehicleData.spot_number || vehicleData.parking_space_number || '';
          const idempotencyKey = generateIdempotencyKey(`entry-${vehicleData.plate}`);
          await enqueueOperation({
            type: 'entry',
            parkingLotId,
            plate: vehicleData.plate,
            payload: { ...vehicleData, client_entry_time: now, idempotencyKey },
            idempotencyKey,
          });
          const { cacheVehicleEntry } = await import('@/services/activeVehiclesCache');
          await cacheVehicleEntry(parkingLotId, vehicleData.plate, vehicleData.vehicle_type, spotNumber);
          return {
            transaction_id: Date.now(),
            entry_time: now,
            spot_number: spotNumber,
            estimated_cost: 0,
            __offline: true,
          } as VehicleEntryResponse & { __offline?: boolean };
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

      // 💾 Cachear en IndexedDB al registrar entrada (online o offline) para que la búsqueda offline encuentre el vehículo
      if (spotNumber) {
        import('@/services/activeVehiclesCache').then(({ cacheVehicleEntry }) =>
          cacheVehicleEntry(
            variables.parkingLotId,
            variables.vehicleData.plate,
            variables.vehicleData.vehicle_type,
            spotNumber,
            data.transaction_id
          )
        );
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
        // Offline: no refetch (evitar llamadas al backend). Online: refetch para sincronizar.
        const spacesRefetchType = connectionService.isOffline() ? 'none' : 'active';
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpaces', variables.parkingLotId],
          refetchType: spacesRefetchType
        });
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpacesWithVehicles', variables.parkingLotId],
          refetchType: spacesRefetchType
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
    mutationFn: async ({
      parkingLotId,
      vehicleData,
      frozenExitTime
    }: {
      parkingLotId: string;
      vehicleData: VehicleExit;
      frozenExitTime?: string;
    }) => {
      if (!isAuthenticated) {
        throw new Error('Usuario no autenticado');
      }

      // Usar el tiempo de salida congelado si está disponible, o la hora actual
      const now = frozenExitTime || new Date().toISOString();

      const runOfflineExit = async (): Promise<VehicleExitResponse> => {
        const idempotencyKey = generateIdempotencyKey(`exit-${vehicleData.plate}`);
        const { findCachedVehicle, removeVehicleFromCache } = await import('@/services/activeVehiclesCache');
        const cachedVehicle = await findCachedVehicle(parkingLotId, vehicleData.plate);
        // Calcular duración usando el tiempo congelado, no la hora actual
        const exitTimestamp = new Date(now).getTime();
        const durationMinutes = cachedVehicle
          ? Math.floor((exitTimestamp - new Date(cachedVehicle.entry_time).getTime()) / (1000 * 60))
          : 0;
        await enqueueOperation({
          type: 'exit',
          parkingLotId,
          plate: vehicleData.plate,
          payload: { ...vehicleData, client_exit_time: now, idempotencyKey },
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
          }),
          __offline: true,
        } as VehicleExitResponse & { __offline?: boolean };
      };

      // OFFLINE: navigator.onLine o store offline → ir directo a local
      if (connectionService.considerOffline()) {
        return runOfflineExit();
      }

      // ONLINE con timeout de seguridad: si algo cuelga (token, red), tras EXIT_SAFETY_TIMEOUT_MS forzar offline
      try {
        const result = await withTimeout(
          (async () => {
            try {
              if (connectionService.considerOffline()) return runOfflineExit();
              const token = await getAccessTokenSilently({ timeoutInSeconds: AUTH_TIMEOUT_SECONDS });
              if (connectionService.considerOffline()) return runOfflineExit();
              // Enviar el timestamp congelado al backend para que use ese momento exacto
              const response = await VehicleService.registerExit(
                token,
                parkingLotId,
                vehicleData,
                { clientTime: now }
              );
              if (response.error) throw new Error(response.error);
              const { removeVehicleFromCache } = await import('@/services/activeVehiclesCache');
              await removeVehicleFromCache(parkingLotId, vehicleData.plate);
              return response.data!;
            } catch (inner) {
              const { isNetworkError } = await import('@/services/offlineCache');
              if (isNetworkError(inner)) {
                connectionService.setOffline(true);
                return runOfflineExit();
              }
              throw inner;
            }
          })(),
          EXIT_SAFETY_TIMEOUT_MS
        );
        return result;
      } catch (onlineError) {
        const { isNetworkError } = await import('@/services/offlineCache');
        if (isNetworkError(onlineError)) {
          connectionService.setOffline(true);
          return runOfflineExit();
        }
        throw onlineError;
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

        // Offline: no refetch (evitar llamadas al backend). Online: refetch para sincronizar.
        const spacesRefetchType = connectionService.isOffline() ? 'none' : 'active';
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpaces', variables.parkingLotId],
          refetchType: spacesRefetchType
        });
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpacesWithVehicles', variables.parkingLotId],
          refetchType: spacesRefetchType
        });

        delete globalDebounce[debounceKey];
      }, 200);

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
