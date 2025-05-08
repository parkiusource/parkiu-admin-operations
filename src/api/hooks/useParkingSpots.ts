import { useQuery, QueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { client } from '../client';

interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  total_spots: number;
  available_spots: number;
  price_per_hour: number;
}

interface UseParkingSpotsOptions {
  queryClient?: QueryClient;
  enabled?: boolean;
}

export const useParkingSpots = ({ queryClient, ...options }: UseParkingSpotsOptions = {}) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const query = useQuery<ParkingSpot[]>({
    queryKey: ['parkingSpots'],
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
      return response.data.map((parking: ParkingSpot) => ({
        ...parking,
        available_spots: parking.total_spots - (parking.available_spots || 0),
      }));
    },
    enabled: isAuthenticated && options?.enabled,
    staleTime: Infinity,
    ...options,
  });

  const invalidate = () => {
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
    }
  };

  return { ...query, parkingSpots: query.data || [], invalidate };
};
