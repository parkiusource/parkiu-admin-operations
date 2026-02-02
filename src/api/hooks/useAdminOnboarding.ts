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
import { AdminProfile as BaseAdminProfile, AdminProfilePayload, ApiError } from '@/types/common';

// Extend base interface for this specific use case
interface AdminProfile extends BaseAdminProfile {
  parkingLots: ParkingLot[];
}

// Hook para obtener el perfil del administrador
export const useAdminProfile = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  return useQuery<AdminProfile | null, ApiError>({
    queryKey: ['adminProfile', 'hook'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      if (!token) {
        return null;
      }
      const profile = await getAdminProfile(token);
      return profile ? { ...profile, parkingLots: profile.parkingLots.map(fromParkingLotAPI) } : null;
    },
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      // No retry para errores de conexión
      if (error?.message?.includes('ERR_NETWORK') || error?.message?.includes('ERR_CONNECTION_REFUSED')) {
        return false;
      }
      return failureCount < 1; // Solo 1 retry para otros errores
    },
    // 🔥 FIX INFINITE LOOP: networkMode 'always' evita cancelaciones/reintentos por estado de red
    networkMode: 'always',
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
      // Invalidar todas las queries de adminProfile (incluye centralized)
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
