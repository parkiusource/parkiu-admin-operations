import { useQuery } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { getAdminProfile } from '@/services/profile';
import { ProfileResponse } from '@/types/common';

/**
 * Hook centralizado para obtener el perfil del administrador
 * Evita duplicación de queries y requests infinitos
 */
export const useAdminProfileCentralized = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  return useQuery<ProfileResponse>({
    queryKey: ['adminProfile', 'centralized'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return getAdminProfile(token);
    },
    // Evitar fetch continuo cuando no hay conexión
    enabled: isAuthenticated && typeof navigator !== 'undefined' && navigator.onLine,
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
};

/**
 * Hook ligero para componentes que solo necesitan el estado del perfil
 * sin hacer requests adicionales
 */
export const useAdminProfileStatus = () => {
  const { data, isLoading, error } = useAdminProfileCentralized();

  return {
    profile: data?.profile,
    status: data?.profile?.status,
    isLoading,
    error,
    isAuthenticated: !!data?.profile,
  };
};
