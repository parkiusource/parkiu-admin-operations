import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { VehicleService } from '../services/vehicleService';
import { VehicleEntry, VehicleExit, VehicleTransaction } from '@/types/parking';

// ===============================
// QUERY HOOKS
// ===============================

/**
 * ✅ Hook para obtener vehículos activos (estacionados)
 */
export const useActiveVehicles = (parkingLotId?: string, options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}) => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['vehicles', 'active', parkingLotId],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await VehicleService.getActiveVehicles(token, parkingLotId);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 2, // 2 minutos
    refetchInterval: options?.refetchInterval ?? 1000 * 30, // 30 segundos
    retry: (failureCount, error: Error & { code?: string }) => {
      if (error?.code === 'ERR_NETWORK') {
        return false;
      }
      return failureCount < 2;
    }
  });
};

/**
 * ✅ Hook para obtener historial de transacciones
 */
export const useTransactionHistory = (filters?: {
  parking_lot_id?: string;
  plate?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}, options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['vehicles', 'transactions', filters],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await VehicleService.getTransactionHistory(token, filters);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    enabled: options?.enabled ?? true,
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
 * ✅ Hook para buscar un vehículo específico
 */
export const useSearchVehicle = (plate: string, parkingLotId?: string, options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['vehicles', 'search', plate, parkingLotId],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await VehicleService.searchVehicle(token, plate, parkingLotId);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!plate && plate.length >= 3,
    staleTime: options?.staleTime ?? 1000 * 60 * 1, // 1 minuto para búsquedas
    retry: false
  });
};

// ===============================
// MUTATION HOOKS
// ===============================

/**
 * ✅ Hook para registrar entrada de vehículo
 */
export const useRegisterVehicleEntry = (options?: {
  onSuccess?: (data: VehicleTransaction) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryData: VehicleEntry) => {
      const token = await getAccessTokenSilently();
      const response = await VehicleService.registerEntry(token, entryData);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
    onSuccess: (data, variables) => {
      // 🚀 OPTIMIZACIÓN: Actualizar cache de vehículos activos directamente
      queryClient.setQueryData(['vehicles', 'active', variables.parking_lot_id], (oldData: VehicleTransaction[] | undefined) => {
        return oldData ? [...oldData, data] : [data];
      });

      // Solo invalidar queries que realmente necesitan refetch con debounce
      const debounceKey = `vehicle-entry-${variables.parking_lot_id}`;
      const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
      const timeoutId = globalDebounce[debounceKey];

      if (timeoutId) clearTimeout(timeoutId);

      globalDebounce[debounceKey] = setTimeout(() => {
        // Invalidar transacciones y stats con refetchType: 'none' para evitar calls innecesarios
        queryClient.invalidateQueries({
          queryKey: ['vehicles', 'transactions'],
          refetchType: 'none'
        });
        queryClient.invalidateQueries({
          queryKey: ['parkingLotStats', variables.parking_lot_id],
          refetchType: 'none'
        });

        // IMPORTANTE: NO invalidar realParkingSpaces aquí ya que se actualiza desde otro hook
        delete globalDebounce[debounceKey];
      }, 200);

      console.log(`⚡ Entrada de vehículo ${data.plate} OPTIMIZADA`);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error registering vehicle entry:', error);
      options?.onError?.(error);
    }
  });
};

/**
 * ✅ Hook para registrar salida de vehículo
 */
export const useRegisterVehicleExit = (options?: {
  onSuccess?: (data: VehicleTransaction) => void;
  onError?: (error: Error) => void;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exitData: VehicleExit) => {
      const token = await getAccessTokenSilently();
      const response = await VehicleService.registerExit(token, exitData);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
    onSuccess: (data, variables) => {
      // 🚀 OPTIMIZACIÓN: Remover vehículo del cache de activos directamente
      queryClient.setQueryData(['vehicles', 'active', variables.parking_lot_id], (oldData: VehicleTransaction[] | undefined) => {
        return oldData ? oldData.filter(vehicle => vehicle.plate !== data.plate) : [];
      });

      // Debounce para invalidaciones secundarias
      const debounceKey = `vehicle-exit-${variables.parking_lot_id}`;
      const globalDebounce = globalThis as unknown as Record<string, NodeJS.Timeout>;
      const timeoutId = globalDebounce[debounceKey];

      if (timeoutId) clearTimeout(timeoutId);

      globalDebounce[debounceKey] = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['vehicles', 'transactions'],
          refetchType: 'none'
        });
        queryClient.invalidateQueries({
          queryKey: ['parkingLotStats', variables.parking_lot_id],
          refetchType: 'none'
        });

        delete globalDebounce[debounceKey];
      }, 200);

      console.log(`⚡ Salida de vehículo ${data.plate} OPTIMIZADA`);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('Error registering vehicle exit:', error);
      options?.onError?.(error);
    }
  });
};

// ===============================
// UTILIDADES Y HELPERS
// ===============================

/**
 * ✅ Hook compuesto para obtener estadísticas de vehículos
 */
export const useVehicleStats = (parkingLotId?: string, options?: {
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
    }, {} as Record<string, number>),
    averageDuration: activeVehicles.length > 0
      ? Math.round(
          activeVehicles
            .map(v => {
              const entryTime = new Date(v.entry_time).getTime();
              const now = Date.now();
              return (now - entryTime) / (1000 * 60); // minutos
            })
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
