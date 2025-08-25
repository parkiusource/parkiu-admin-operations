import { useQuery } from '@tanstack/react-query';
import { ParkingSpotService } from '../services/api/parkingSpotService';
import { Vehicle } from '../db/schema';

const parkingSpotService = new ParkingSpotService();

export const useAvailableParkingSpots = (type?: Vehicle['type']) => {
  const { data: availableSpots, isLoading, error } = useQuery({
    queryKey: ['parkingSpots', 'available', type],
    queryFn: async () => {
      const response = await parkingSpotService.getAvailableSpots(type);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    }
  });

  return {
    availableSpots,
    isLoading,
    error
  };
};
