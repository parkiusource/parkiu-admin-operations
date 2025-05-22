import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import {
  getAdminProfile,
  completeAdminProfile,
  getParkingLots,
  registerParkingLot,
  getOnboardingStatus,
  updateOnboardingStep,
} from '../services/admin';

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

interface AdminProfile {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: string | null;
  parkingLots: ParkingLot[];
}

interface ApiError {
  message: string;
  status: number;
}

export interface AdminProfilePayload {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  role: string;
  photo_url: string;
}

// Hook para obtener el perfil del administrador
export const useAdminProfile = () => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery<AdminProfile | null, ApiError>({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      if (!token) {
        return null;
      }
      return getAdminProfile(token);
    },
  });
};

// Hook para obtener los parqueaderos del administrador
export const useAdminParkingLots = () => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery<ParkingLot[], ApiError>({
    queryKey: ['adminParkingLots'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      if (!token) {
        return [];
      }
      return getParkingLots(token);
    },
  });
};

// Hook para obtener el estado del onboarding
export const useOnboardingStatus = () => {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery<{ step: number; completed: boolean }, ApiError>({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      if (!token) {
        return { step: 1, completed: false };
      }
      return getOnboardingStatus(token);
    },
  });
};

// Hook para completar el perfil del administrador
export const useCompleteProfile = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation<AdminProfile, ApiError, AdminProfilePayload>({
    mutationFn: async (payload) => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('No authentication token available');
      }
      return completeAdminProfile(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
    },
  });
};

// Hook para Administrar un nuevo parqueadero
export const useRegisterParkingLot = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation<ParkingLot, ApiError, ParkingLot>({
    mutationFn: async (data) => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('No authentication token available');
      }
      return registerParkingLot(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminParkingLots'] });
    },
  });
};

// Hook para actualizar el paso del onboarding
export const useUpdateOnboardingStep = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  return useMutation<{ step: number; completed: boolean }, ApiError, number>({
    mutationFn: async (step) => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('No authentication token available');
      }
      return updateOnboardingStep(step, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
    },
  });
};
