import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { parkingLotService } from '@/services/parking/parkingLotService';

interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  status?: 'maintenance' | 'active' | 'inactive' | 'pending';
  total_spots?: number;
  price_per_hour?: number;
  opening_time?: string;
  closing_time?: string;
}

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
 * Hook para obtener estadísticas reales del overview de parqueaderos
 * Combina datos de parqueaderos con espacios reales de cada uno
 */
export function useRealParkingOverview(parkingLots: ParkingLot[]): ParkingOverviewStats {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  // Obtener espacios reales de todos los parqueaderos
  const spacesQueries = useQueries({
    queries: parkingLots
      .filter(lot => lot.id && lot.status === 'active') // Solo parqueaderos activos con ID
      .map(lot => ({
        queryKey: ['realParkingSpaces', lot.id],
        queryFn: async () => {
          if (!lot.id) return [];

          const token = await getAccessTokenSilently();
          const response = await parkingLotService.getParkingSpaces(token, lot.id);

          if (response.error) {
            console.warn(`Error loading spaces for ${lot.name}:`, response.error);
            return [];
          }

          return response.data || [];
        },
        enabled: isAuthenticated && !!lot.id,
        staleTime: 1000 * 60 * 2, // 2 minutos
        retry: 1,
      }))
  });

  // Calcular estadísticas combinadas
  const stats = useMemo(() => {
    const totalParkingLots = parkingLots.length;
    const activeParkingLots = parkingLots.filter(p => p.status === 'active').length;

    // Calcular promedio de precios (siempre disponible del backend)
    const validPrices = parkingLots.filter(p => p.price_per_hour && p.price_per_hour > 0);
    const averagePrice = validPrices.length > 0
      ? Math.round(validPrices.reduce((sum, p) => sum + (p.price_per_hour || 0), 0) / validPrices.length)
      : 0;

    // Verificar si tenemos datos reales de espacios
    const loadingSpaces = spacesQueries.some(q => q.isLoading);
    const hasSpaceData = spacesQueries.some(q => q.data && q.data.length > 0);

    let totalSpaces = 0;
    let availableSpaces = 0;
    let occupiedSpaces = 0;

    if (hasSpaceData) {
      // Usar datos reales de espacios
      spacesQueries.forEach(query => {
        if (query.data && Array.isArray(query.data)) {
          const spaces = query.data;
          totalSpaces += spaces.length;
          availableSpaces += spaces.filter(s => s.status === 'available').length;
          occupiedSpaces += spaces.filter(s => s.status === 'occupied').length;
        }
      });
    } else {
      // Fallback a total_spots del backend si no hay espacios reales
      totalSpaces = parkingLots.reduce((total, p) => total + (p.total_spots || 0), 0);
      // No podemos calcular disponibles/ocupados sin datos reales
      availableSpaces = 0;
      occupiedSpaces = 0;
    }

    return {
      totalParkingLots,
      activeParkingLots,
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      averagePrice,
      hasRealSpaceData: hasSpaceData,
      loadingSpaces,
    };
  }, [parkingLots, spacesQueries]);

  return stats;
}
