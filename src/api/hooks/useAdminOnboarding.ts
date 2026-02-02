import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import {
  completeAdminProfile,
  getParkingLots,
  registerParkingLot,
  getOnboardingStatus,
  updateOnboardingStep,
} from '../services/admin';
import { ParkingLot, toParkingLotAPI, fromParkingLotAPI } from '@/types/parking';
import { AdminProfile as BaseAdminProfile, AdminProfilePayload, ApiError } from '@/types/common';
import { useAdminProfileCentralized, useRefreshAdminProfile } from '@/hooks/useAdminProfileCentralized';

// Extend base interface for this specific use case
interface AdminProfile extends BaseAdminProfile {
  parkingLots: ParkingLot[];
}

/**
 * 🔥 DEPRECADO: Usar useAdminProfileCentralized en su lugar
 * Este hook ahora redirige al hook centralizado para evitar solicitudes duplicadas
 */
export const useAdminProfile = () => {
  const result = useAdminProfileCentralized();

  // Los datos del perfil centralizado ya vienen transformados
  // Solo necesitamos extraer y retornar en el formato esperado
  const parkingLotsRaw = result.data?.profile?.parkingLots;
  const parkingLots: ParkingLot[] = Array.isArray(parkingLotsRaw)
    ? parkingLotsRaw as ParkingLot[]
    : [];

  return {
    ...result,
    data: result.data ? {
      ...result.data.profile,
      parkingLots
    } : null,
  };
};

// Hook para obtener los parqueaderos del administrador
export const useAdminParkingLots = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();

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
    // 🔥 FIX: Solo habilitar cuando Auth0 está listo
    enabled: !isAuthLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    networkMode: 'always',
  });
};

// Hook para obtener el estado del onboarding
export const useOnboardingStatus = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();

  return useQuery<{ step: number; completed: boolean }, ApiError>({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      if (!token) {
        return { step: 1, completed: false };
      }
      return getOnboardingStatus(token);
    },
    // 🔥 FIX: Solo habilitar cuando Auth0 está listo
    enabled: !isAuthLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    networkMode: 'always',
  });
};

// Hook para completar el perfil del administrador
export const useCompleteProfile = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { refreshProfile } = useRefreshAdminProfile();

  return useMutation<AdminProfile, ApiError, AdminProfilePayload>({
    mutationFn: async (payload) => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('No authentication token available');
      }
      const profile = await completeAdminProfile(token, payload);
      return { ...profile, parkingLots: profile.parkingLots.map(fromParkingLotAPI) };
    },
    onSuccess: async () => {
      // 🔥 FIX: Usar el hook de refresh controlado en lugar de invalidar todas las queries
      await refreshProfile();
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
