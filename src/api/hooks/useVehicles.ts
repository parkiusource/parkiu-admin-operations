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

      const token = await getAccessTokenSilently();
      const response = await VehicleService.searchVehicle(token, parkingLotId, debouncedPlate);

      if (response.error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Vehicle search error:', response.error);
        }
        throw new Error(response.error);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Vehicle found:', response.data);
      }

      return response.data;
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
        // OFFLINE: encolar y retornar respuesta temporal para permitir impresión de ticket
        if (!connectionService.isOnline()) {
          const idempotencyKey = generateIdempotencyKey(`entry-${vehicleData.plate}`);
          await enqueueOperation({
            type: 'entry',
            parkingLotId,
            plate: vehicleData.plate,
            payload: { ...vehicleData, idempotencyKey },
            idempotencyKey,
          });
          const now = new Date().toISOString();
          return {
            transaction_id: Date.now(),
            entry_time: now,
            spot_number: vehicleData.space_number || vehicleData.spot_number || vehicleData.parking_space_number || '',
            estimated_cost: 0,
          } as VehicleEntryResponse;
        }

        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10
        });

        const response = await VehicleService.registerEntry(token, parkingLotId, vehicleData);

        if (response.error) {
          throw new Error(response.error);
        }

        return response.data!;
      } catch (error) {
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

      // OFFLINE: encolar y devolver respuesta temporal para permitir impresión del recibo
      if (!connectionService.isOnline()) {
        const idempotencyKey = generateIdempotencyKey(`exit-${vehicleData.plate}`);
        await enqueueOperation({
          type: 'exit',
          parkingLotId,
          plate: vehicleData.plate,
          payload: { ...vehicleData, idempotencyKey },
          idempotencyKey,
        });
        const now = new Date().toISOString();
        const tmp: VehicleExitResponse = {
          transaction_id: Date.now(),
          total_cost: vehicleData.payment_amount,
          duration_minutes: 0,
          receipt: JSON.stringify({
            plate: vehicleData.plate,
            exit_time: now,
            total_cost: vehicleData.payment_amount,
          })
        };
        return tmp;
      }

      const token = await getAccessTokenSilently({
        timeoutInSeconds: 10,
      });

      const response = await VehicleService.registerExit(token, parkingLotId, vehicleData);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
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
