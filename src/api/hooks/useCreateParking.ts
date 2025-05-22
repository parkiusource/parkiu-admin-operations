import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { createParking } from '../services/admin';

interface ParkingLotAPI {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  hourly_rate: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  daily_rate?: number;
  monthly_rate?: number;
  contact_name?: string;
  contact_phone?: string;
}

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
