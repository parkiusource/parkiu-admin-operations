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
      // Iniciando mutación

      if (!isAuthenticated) {
        console.error('❌ useRegisterVehicleEntry - Usuario NO autenticado');
        throw new Error('Usuario no autenticado');
      }

      // Usuario autenticado, obteniendo token

      try {
        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10
        });

        // Token obtenido, llamando servicio

        const response = await VehicleService.registerEntry(token, parkingLotId, vehicleData);

        // Respuesta del servicio

        if (response.error) {
          console.error('❌ useRegisterVehicleEntry - Error del servicio:', response.error);
          throw new Error(response.error);
        }

        // Registro exitoso
        return response.data!;
      } catch (error) {
        // Error completo
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

      // Solo invalidar queries que realmente necesitan refetch con debounce
      const debounceKey = `vehicle-entry-${variables.parkingLotId}`;
      const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
      const timeoutId = globalDebounce[debounceKey];

      if (timeoutId) clearTimeout(timeoutId);

      globalDebounce[debounceKey] = setTimeout(() => {
        // Invalidar transacciones y stats con refetchType: 'none' para evitar calls innecesarios
        queryClient.invalidateQueries({
          queryKey: ['vehicles', 'transactions', variables.parkingLotId],
          refetchType: 'none'
        });
        queryClient.invalidateQueries({
          queryKey: ['parkingLotStats', variables.parkingLotId],
          refetchType: 'none'
        });

        // Invalidar espacios disponibles para actualizar disponibilidad
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpaces', variables.parkingLotId],
          refetchType: 'none'
        });

        delete globalDebounce[debounceKey];
      }, 200);

      // Entrada de vehículo optimizada
      options?.onSuccess?.(data as VehicleEntryResponse, variables);
    },
    onError: (error) => {
      // onError ejecutado
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

      try {
        const token = await getAccessTokenSilently({
          timeoutInSeconds: 10,
        });

        const response = await VehicleService.registerExit(token, parkingLotId, vehicleData);

        if (response.error) {
          throw new Error(response.error);
        }

        return response.data!;
      } catch (error) {
        console.error('🚨 Error en registro de salida:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // 🚀 OPTIMIZACIÓN: Remover vehículo del cache de activos directamente
      queryClient.setQueryData(['vehicles', 'active', variables.parkingLotId], (oldData: ActiveVehicle[] | undefined) => {
        return oldData ? oldData.filter(vehicle => vehicle.plate !== variables.vehicleData.plate) : [];
      });

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

        // Invalidar espacios para liberar el espacio ocupado
        queryClient.invalidateQueries({
          queryKey: ['realParkingSpaces', variables.parkingLotId],
          refetchType: 'none'
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
