import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { createParking } from '../services/admin';
import { ParkingLotAPI } from '@/types/parking';

interface UseCreateParkingOptions {
  onSuccess?: (data: ParkingLotAPI) => void;
}

export const useCreateParking = ({ onSuccess }: UseCreateParkingOptions = {}): UseMutationResult<ParkingLotAPI, Error, ParkingLotAPI> => {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (data: ParkingLotAPI) => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('No authentication token available');
      }
      return createParking(token, data);
    },
    onSuccess,
  });
};
