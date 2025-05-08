import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { createParking } from '../services/admin';

interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  total_spots: number;
  price_per_hour: number;
}

interface UseCreateParkingOptions {
  onSuccess?: (data: ParkingLot) => void;
}

export const useCreateParking = ({ onSuccess }: UseCreateParkingOptions = {}): UseMutationResult<ParkingLot, Error, ParkingLot> => {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (data: ParkingLot) => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('No authentication token available');
      }
      return createParking(token, data);
    },
    onSuccess,
  });
};
