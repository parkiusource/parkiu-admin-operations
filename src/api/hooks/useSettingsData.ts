import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getAdminProfileForSettings,
  updateAdminProfile,
  getAdminParkingLotsForSettings,
  updateParkingLot,
  getParkingLotPricing,
  updateParkingLotPricing,
  getParkingLotSchedule,
  updateParkingLotSchedule
} from '@/api/services/admin';

// ===== PERFIL DEL ADMIN =====

export const useAdminProfileSettings = () => {
  const { getAccessTokenSilently } = useAuth();

  return useQuery({
    queryKey: ['admin-profile-settings'],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        const result = await getAdminProfileForSettings(token);
        return result;
      } catch (error) {
        console.error('Error cargando perfil de configuración:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: (failureCount, error: Error & { code?: string }) => {
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('ERR_CONNECTION_REFUSED')) return false;
      return failureCount < 2;
    },
    // 🔥 FIX INFINITE LOOP: Removido navigator.onLine - React Query maneja network state
    networkMode: 'always',
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useUpdateAdminProfile = () => {
  const { getAccessTokenSilently } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<{
      name: string;
      contact_phone: string;
      nit: string;
      avatar_url: string;
    }>) => {
      const token = await getAccessTokenSilently();
      return updateAdminProfile(token, updates);
    },
    onSuccess: (updatedProfile) => {
      // Actualizar cache del perfil
      queryClient.setQueryData(['admin-profile-settings'], updatedProfile);
      // También invalidar otros caches relacionados
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
    },
  });
};

// ===== PARQUEADEROS =====

export const useAdminParkingLotsSettings = () => {
  const { getAccessTokenSilently } = useAuth();

  return useQuery({
    queryKey: ['admin-parking-lots-settings'],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        const result = await getAdminParkingLotsForSettings(token);
        return result;
      } catch (error) {
        console.error('Error cargando parqueaderos de configuración:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: (failureCount, error: Error & { code?: string }) => {
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('ERR_CONNECTION_REFUSED')) return false;
      return failureCount < 2;
    },
    // 🔥 FIX INFINITE LOOP: Removido navigator.onLine - React Query maneja network state
    networkMode: 'always',
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useUpdateParkingLot = () => {
  const { getAccessTokenSilently } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parkingLotId, updates }: {
      parkingLotId: string;
      updates: Partial<{
        name: string;
        address: string;
        contact_phone: string;
        tax_id: string;
      }>;
    }) => {
      const token = await getAccessTokenSilently();
      return updateParkingLot(token, parkingLotId, updates);
    },
    onSuccess: (updatedLot, { parkingLotId }) => {
      // Actualizar cache de la lista de parqueaderos
      queryClient.setQueryData(['admin-parking-lots-settings'], (oldData: unknown) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((lot: typeof updatedLot) =>
          lot.id === parkingLotId ? updatedLot : lot
        );
      });
      // Invalidar otros caches relacionados
      queryClient.invalidateQueries({ queryKey: ['parking-lots'] });
    },
  });
};

// ===== TARIFAS =====

export const useParkingLotPricing = (parkingLotId: string | null) => {
  const { getAccessTokenSilently } = useAuth();

  return useQuery({
    queryKey: ['parking-lot-pricing', parkingLotId],
    queryFn: async () => {
      if (!parkingLotId) throw new Error('Parking lot ID is required');
      const token = await getAccessTokenSilently();
      return getParkingLotPricing(token, parkingLotId);
    },
    // 🔥 FIX INFINITE LOOP: Removido navigator.onLine de enabled
    enabled: !!parkingLotId,
    networkMode: 'always',
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount, error: Error & { code?: string }) => {
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('ERR_CONNECTION_REFUSED')) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useUpdateParkingLotPricing = () => {
  const { getAccessTokenSilently } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parkingLotId, updates }: {
      parkingLotId: string;
      updates: Partial<{
        car_rate_per_minute: number;
        motorcycle_rate_per_minute: number;
        bicycle_rate_per_minute: number;
        truck_rate_per_minute: number;
        fixed_rate_car: number;
        fixed_rate_motorcycle: number;
        fixed_rate_bicycle: number;
        fixed_rate_truck: number;
        fixed_rate_threshold_minutes: number;
        hourly_rate: number;
      }>;
    }) => {
      const token = await getAccessTokenSilently();
      return updateParkingLotPricing(token, parkingLotId, updates);
    },
    onSuccess: (updatedPricing, { parkingLotId }) => {
      // Actualizar cache de las tarifas específicas
      queryClient.setQueryData(['parking-lot-pricing', parkingLotId], updatedPricing);

      // Invalidar todos los caches relacionados para reflejar los cambios inmediatamente
      queryClient.invalidateQueries({ queryKey: ['parking-lots'] });
      queryClient.invalidateQueries({ queryKey: ['parkingLots'] });
      queryClient.invalidateQueries({ queryKey: ['admin-parking-lots-settings'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces', parkingLotId] });
      queryClient.invalidateQueries({ queryKey: ['parkingLot', parkingLotId] });
    },
  });
};

// ===== HORARIOS =====

export const useParkingLotSchedule = (parkingLotId: string | null) => {
  const { getAccessTokenSilently } = useAuth();

  return useQuery({
    queryKey: ['parking-lot-schedule', parkingLotId],
    queryFn: async () => {
      if (!parkingLotId) throw new Error('Parking lot ID is required');
      const token = await getAccessTokenSilently();
      return getParkingLotSchedule(token, parkingLotId);
    },
    // 🔥 FIX INFINITE LOOP: Removido navigator.onLine de enabled
    enabled: !!parkingLotId,
    networkMode: 'always',
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount, error: Error & { code?: string }) => {
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('ERR_CONNECTION_REFUSED')) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useUpdateParkingLotSchedule = () => {
  const { getAccessTokenSilently } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parkingLotId, updates }: {
      parkingLotId: string;
      updates: {
        opening_time?: string;
        closing_time?: string;
        is_24h?: boolean;
        is_closed?: boolean;
        weekly_schedule?: Record<string, {
          is_24h: boolean;
          is_closed: boolean;
          opening_time: string;
          closing_time: string;
        }>;
      };
    }) => {
      const token = await getAccessTokenSilently();
      return updateParkingLotSchedule(token, parkingLotId, updates);
    },
    onSuccess: (updatedSchedule, { parkingLotId }) => {
      // Actualizar cache de los horarios
      queryClient.setQueryData(['parking-lot-schedule', parkingLotId], updatedSchedule);
    },
  });
};
