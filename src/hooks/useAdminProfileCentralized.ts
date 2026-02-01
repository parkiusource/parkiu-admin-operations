import { useQuery } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { getAdminProfile } from '@/services/profile';
import { ProfileResponse } from '@/types/common';
import { useToken } from './useToken';

/**
 * Hook centralizado para obtener el perfil del administrador
 * Evita duplicación de queries y requests infinitos
 */
export const useAdminProfileCentralized = () => {
  const { isAuthenticated } = useAuth0();
  const { getAuthToken } = useToken();

  return useQuery<ProfileResponse>({
    queryKey: ['adminProfile', 'centralized'],
    queryFn: async () => {
      console.log('[useAdminProfileCentralized] Fetching profile...');
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const result = await getAdminProfile(token);
      console.log('[useAdminProfileCentralized] Profile fetched successfully');
      return result;
    },
    // Configuración ESTRICTA para evitar múltiples peticiones
    enabled: isAuthenticated && typeof navigator !== 'undefined' && navigator.onLine,
    retry: false,
    staleTime: Infinity, // Cache infinito - solo se actualiza manualmente o al reconectar
    gcTime: 1000 * 60 * 30, // Garbage collection después de 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // 🔥 FIX LOOP: Desactivar refetch al reconectar
    // Evitar refetch automático
    refetchInterval: false,
    refetchIntervalInBackground: false,
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
