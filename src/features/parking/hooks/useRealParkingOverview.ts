import { useMemo } from 'react';
import { ParkingLot } from '@/services/parking/types';

interface ParkingOverviewStats {
  totalParkingLots: number;
  activeParkingLots: number;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  averagePrice: number;
  hasRealSpaceData: boolean;
  loadingSpaces: boolean;
}

/**
 * ✅ Hook optimizado que usa SOLO los datos del endpoint /parking-lots/
 * Sin llamadas adicionales innecesarias a /parking-spaces/lot/{id}
 */
export function useRealParkingOverview(parkingLots: ParkingLot[]): ParkingOverviewStats {

  const stats = useMemo(() => {
    const totalParkingLots = parkingLots.length;
    const activeParkingLots = parkingLots.filter(p => p.status === 'active').length;

    let totalSpaces = 0;
    let availableSpaces = 0;
    let totalValidPrices = 0;
    let sumPrices = 0;
    let hasAnyAvailabilityData = false;

    parkingLots.forEach(parking => {
      // Usar total_spots del parqueadero
      if (parking.total_spots) {
        totalSpaces += parking.total_spots;
      }

      // ✅ USAR available_spaces que YA viene del endpoint /parking-lots/
      if (typeof parking.available_spaces === 'number') {
        availableSpaces += parking.available_spaces;
        hasAnyAvailabilityData = true;
      }

      // Calcular precio promedio
      if (typeof parking.price_per_hour === 'number' && parking.price_per_hour > 0) {
        sumPrices += parking.price_per_hour;
        totalValidPrices++;
      }
    });

    const occupiedSpaces = Math.max(0, totalSpaces - availableSpaces);
    const averagePrice = totalValidPrices > 0 ? Math.round(sumPrices / totalValidPrices) : 0;

    return {
      totalParkingLots,
      activeParkingLots,
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      averagePrice,
      hasRealSpaceData: hasAnyAvailabilityData,
      loadingSpaces: false, // Ya no hay loading porque no hacemos llamadas adicionales
    };
  }, [parkingLots]);

  return stats;
}
