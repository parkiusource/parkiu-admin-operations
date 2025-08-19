// Barrel export para todos los hooks de parking
// Exportación centralizada de hooks React Query para servicios de parking

// Imports internos para el hook combinado
import {
  useParkingLots
} from './useParkingLots';
import {
  useParkingSpots,
  useParkingOccupancyStats
} from './useParkingSpots';

// ===============================
// PARKING LOTS HOOKS
// ===============================
export {
  // Query hooks
  useParkingLots,
  useParkingLot,
  useParkingLotStats,

  // Mutation hooks
  useCreateParkingLot,
  useRegisterParkingLot,
  useUpdateParkingLot,
  useUpdateParkingLotStatus,
  useDeleteParkingLot,

  // Public search
  useSearchParkingLots
} from './useParkingLots';

// ===============================
// PARKING SPOTS HOOKS
// ===============================
export {
  // Query hooks
  useAvailableParkingSpots,
  useParkingSpots,
  useParkingSpot,
  useParkingOccupancyStats,

  // Mutation hooks
  useCreateParkingSpot,
  useUpdateParkingSpot,
  useUpdateSpotStatus,
  useOccupySpot,
  useReleaseSpot,
  useDeleteParkingSpot,

  // Utilities
  useSyncParkingSpots
} from './useParkingSpots';

// ===============================
// CONVENIO/COMPATIBILITY EXPORTS
// ===============================

/**
 * @deprecated Use useAvailableParkingSpots instead
 * Maintained for backward compatibility with existing code
 */
export { useAvailableParkingSpots as useParkingSpotsOriginal } from './useParkingSpots';

/**
 * @deprecated Use useCreateParkingLot instead
 * Maintained for backward compatibility with existing code
 */
export { useCreateParkingLot as useCreateParking } from './useParkingLots';

// ===============================
// COMBINACIONES ÚTILES
// ===============================

/**
 * Hook combinado para obtener datos completos de parking
 * Útil para dashboards y vistas generales
 */
export function useParkingOverview(parkingLotId?: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const parkingLotsQuery = useParkingLots(
    parkingLotId ? { status: 'active' } : undefined,
    { enabled: options?.enabled ?? true }
  );

  const spotsQuery = useParkingSpots(
    undefined, // Sin filtros por ahora ya que parking_lot_id no existe en el esquema actual
    { enabled: options?.enabled ?? true }
  );

  const occupancyQuery = useParkingOccupancyStats(
    {
      enabled: options?.enabled ?? true,
      refetchInterval: options?.refetchInterval ?? 1000 * 60 * 2
    }
  );

  return {
    // Data
    parkingLots: parkingLotsQuery.parkingLots,
    parkingSpots: spotsQuery.parkingSpots,
    occupancyStats: occupancyQuery.occupancyStats,

    // Loading states
    isLoading: parkingLotsQuery.isLoading || spotsQuery.isLoading || occupancyQuery.isLoading,
    isLoadingParkingLots: parkingLotsQuery.isLoading,
    isLoadingSpots: spotsQuery.isLoading,
    isLoadingStats: occupancyQuery.isLoading,

    // Error states
    error: parkingLotsQuery.error || spotsQuery.error || occupancyQuery.error,
    hasError: !!parkingLotsQuery.error || !!spotsQuery.error || !!occupancyQuery.error,

    // Refetch functions
    refetchAll: () => {
      parkingLotsQuery.refetch();
      spotsQuery.refetch();
      occupancyQuery.refetch();
    },
    refetchParkingLots: parkingLotsQuery.refetch,
    refetchSpots: spotsQuery.refetch,
    refetchStats: occupancyQuery.refetch
  };
}

// ===============================
// RE-EXPORTS DE TIPOS
// ===============================
export type {
  ParkingLot,
  ParkingSpot,
  ParkingLotFilters,
  ParkingSpotFilters,
  ParkingLotStats
} from '@/services/parking/types';
