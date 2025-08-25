import { useQuery, QueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { client } from '../client';
import { ParkingLot } from '@/types/parking';

interface UseParkingLotsOptions {
  queryClient?: QueryClient;
  enabled?: boolean;
  staleTime?: number;
}

export const useParkingLots = ({ queryClient, ...options }: UseParkingLotsOptions = {}) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const query = useQuery<ParkingLot[]>({
    queryKey: ['parkingLots'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      const token = await getAccessTokenSilently();
      const response = await client.get('/parking-lots/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // ✅ Mapeo correcto del API response a nuestro tipo frontend
      return response.data.map((lot: {
        id?: string;
        name: string;
        address: string;
        latitude?: number;
        longitude?: number;
        location?: { latitude: number; longitude: number };
        total_spots: number;
        hourly_rate?: number;
        price_per_hour?: number;
        admin_uuid?: string;
        description?: string;
        opening_time?: string;
        closing_time?: string;
        daily_rate?: number;
        monthly_rate?: number;
        contact_name?: string;
        contact_phone?: string;
      }) => ({
        id: lot.id,
        name: lot.name,
        address: lot.address,
        location: {
          latitude: lot.latitude || lot.location?.latitude,
          longitude: lot.longitude || lot.location?.longitude,
        },
        total_spots: lot.total_spots,
        price_per_hour: lot.hourly_rate || lot.price_per_hour,
        admin_uuid: lot.admin_uuid,
        description: lot.description,
        opening_time: lot.opening_time,
        closing_time: lot.closing_time,
        daily_rate: lot.daily_rate,
        monthly_rate: lot.monthly_rate,
        contact_name: lot.contact_name,
        contact_phone: lot.contact_phone,
      }));
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutos
    ...options,
  });

  const invalidate = () => {
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });
    }
  };

  return {
    ...query,
    parkingLots: query.data || [],
    invalidate
  };
};
