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
import { ParkingLot, toParkingLotAPI, fromParkingLotAPI } from '@/types/parking';

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
      const profile = await getAdminProfile(token);
      return profile ? { ...profile, parkingLots: profile.parkingLots.map(fromParkingLotAPI) } : null;
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
      const lots = await getParkingLots(token);
      return lots.map(fromParkingLotAPI);
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
      const profile = await completeAdminProfile(token, payload);
      return { ...profile, parkingLots: profile.parkingLots.map(fromParkingLotAPI) };
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
      const apiData = toParkingLotAPI(data);
      const result = await registerParkingLot(token, apiData);
      return fromParkingLotAPI(result);
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
