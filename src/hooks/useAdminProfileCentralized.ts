import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { getAdminProfile } from '@/services/profile';
import { ProfileResponse } from '@/types/common';
import { useToken } from './useToken';
import { useCallback, useEffect } from 'react';
import { saveOfflineSession, getOfflineSession } from '@/services/offlineSession';

// 🔥 SINGLETON: Variable global para rastrear si hay una solicitud en curso
// Esto previene solicitudes duplicadas incluso entre diferentes instancias del hook
let isRequestInFlight = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 segundos mínimo entre solicitudes

/**
 * Hook centralizado para obtener el perfil del administrador
 * Evita duplicación de queries y requests infinitos
 *
 * ✅ OPTIMIZACIONES IMPLEMENTADAS:
 * - Singleton para prevenir solicitudes duplicadas
 * - Throttling de 5 segundos entre solicitudes
 * - Cache infinito con staleTime
 * - No retry automático
 * - No refetch en window focus, mount, o reconnect
 */
export const useAdminProfileCentralized = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { getAuthToken } = useToken();

  return useQuery<ProfileResponse>({
    queryKey: ['adminProfile', 'centralized'],
    queryFn: async () => {
      // 🔥 THROTTLE: Evitar solicitudes demasiado frecuentes
      const now = Date.now();
      if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        throw new Error('Solicitud bloqueada por throttle');
      }

      // 🔥 SINGLETON: Evitar solicitudes duplicadas en vuelo
      if (isRequestInFlight) {
        throw new Error('Solicitud ya en curso');
      }

      isRequestInFlight = true;
      lastRequestTime = now;

      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No se pudo obtener el token de autenticación');
        }
        const result = await getAdminProfile(token);
        return result;
      } finally {
        isRequestInFlight = false;
      }
    },
    // 🔥 CRITICAL: Solo habilitar cuando Auth0 terminó de cargar Y el usuario está autenticado
    // Esto previene solicitudes mientras Auth0 aún está inicializándose
    enabled: !isAuthLoading && isAuthenticated,
    retry: false, // No reintentar errores
    networkMode: 'always', // Intentar incluso offline (fallará rápido sin red)
    staleTime: Infinity, // Cache infinito - solo se actualiza manualmente
    gcTime: 1000 * 60 * 30, // Garbage collection después de 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 🔥 CRITICAL: No refetch al montar nuevas instancias
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    // 🔥 Estructura de selección para evitar renders innecesarios
    structuralSharing: true,
  });
};

/**
 * Hook para forzar un refetch del perfil de forma controlada
 * Usar solo cuando sea absolutamente necesario (ej: después de completar onboarding)
 */
export const useRefreshAdminProfile = () => {
  const queryClient = useQueryClient();

  const refreshProfile = useCallback(async () => {
    // Reset el singleton para permitir una nueva solicitud
    isRequestInFlight = false;
    lastRequestTime = 0;

    // Invalidar y refetch
    await queryClient.invalidateQueries({
      queryKey: ['adminProfile', 'centralized'],
      refetchType: 'active'
    });
  }, [queryClient]);

  return { refreshProfile };
};

/**
 * Hook ligero para componentes que solo necesitan el estado del perfil
 * sin hacer requests adicionales
 *
 * ✅ OFFLINE-FIRST: Guarda sesión offline cuando el perfil se carga exitosamente
 */
export const useAdminProfileStatus = () => {
  const { data, isLoading, error } = useAdminProfileCentralized();

  // 📴 OFFLINE-FIRST: Guardar sesión cuando el perfil se carga exitosamente
  useEffect(() => {
    if (data?.profile && !error) {
      const profile = data.profile;
      // Solo guardar si tenemos datos válidos
      if (profile.id && profile.email && profile.role) {
        // Extraer IDs de parkingLots si existen
        const parkingLotIds = (profile.parkingLots || [])
          .map((lot) => (lot as { id?: string })?.id)
          .filter((id): id is string => !!id);

        saveOfflineSession({
          userId: String(profile.id),
          email: profile.email,
          role: profile.role,
          status: profile.status || 'active',
          parkingLotIds
        });
      }
    }
  }, [data?.profile, error]);

  // 📴 OFFLINE-FIRST: Si estamos offline y no hay datos del servidor, usar sesión offline
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const offlineSession = !isOnline && !data?.profile ? getOfflineSession() : null;

  // Construir perfil desde sesión offline si es necesario
  // El perfil offline tiene campos mínimos pero suficientes para operar
  const offlineProfile = offlineSession ? {
    id: parseInt(offlineSession.userId, 10) || 0,
    email: offlineSession.email,
    name: offlineSession.email.split('@')[0], // Usar parte del email como nombre
    nit: '',
    contact_phone: '',
    role: offlineSession.role,
    status: offlineSession.status as 'active' | 'initial' | 'pending_profile' | 'pending_parking' | 'pending_verify' | 'rejected' | 'suspended' | 'inactive',
    parkingLots: offlineSession.parkingLotIds.map(id => ({ id })),
    __offline: true // Marcador para indicar que viene de sesión offline
  } : undefined;

  const effectiveProfile = data?.profile || offlineProfile;

  return {
    profile: effectiveProfile,
    status: effectiveProfile?.status,
    isLoading: isOnline ? isLoading : false, // No mostrar loading si estamos offline con sesión
    error: isOnline ? error : null, // No mostrar error si estamos offline con sesión
    isAuthenticated: !!effectiveProfile,
    isOfflineSession: !!offlineSession
  };
};
