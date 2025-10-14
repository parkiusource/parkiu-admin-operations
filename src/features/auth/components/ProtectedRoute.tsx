import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAdminProfileCentralized } from '@/hooks/useAdminProfileCentralized';
import { AdminProfile } from '@/types/common';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { data: profileData, isLoading: isProfileLoading, error } = useAdminProfileCentralized();

  // Mostrar loading mientras se verifica autenticación y perfil (solo si online)
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (isAuthLoading || (isAuthenticated && isProfileLoading && isOnline)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no está autenticado, ir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay error al obtener el perfil y no es error de conexión, ir a login
  if (error && !((error as Error & { code?: string })?.code === 'ERR_NETWORK' ||
                 (error as Error & { code?: string })?.code === 'ERR_CONNECTION_REFUSED')) {
    return <Navigate to="/login" replace />;
  }

  // Si tenemos datos del perfil, verificar su estado
  if (profileData?.profile) {
    const status = profileData.profile.status;
    const role = profileData.profile.role;

    // Verificar si el perfil está completo y tiene los datos necesarios
    const hasCompleteProfile = status && status !== 'initial' && status !== 'pending_profile';
    const profileWithLots = profileData.profile as AdminProfile & { parkingLots?: unknown[] };
    const hasParkingLot = profileWithLots.parkingLots && profileWithLots.parkingLots.length > 0;

    // Permitir acceso al dashboard solo si:
    // 1. Status es 'active' (admins completos con todo verificado, cualquier rol)
    // 2. Es temp_admin con status 'pending_verify' (ya completó onboarding, esperando verificación)
    const canAccessDashboard = (
      status === 'active' ||
      (role === 'temp_admin' && status === 'pending_verify')
    );

    // Logging adicional para casos específicos
    if (status === 'active') {
      console.log('Active admin - allowing dashboard access');
    }
    if (role === 'temp_admin' && status === 'pending_verify') {
      console.log('temp_admin with pending_verify - allowing dashboard access');
    }

    // Logging para debug
    console.log('ProtectedRoute - Profile check:', {
      status,
      role,
      hasCompleteProfile,
      hasParkingLot,
      canAccessDashboard,
      parkingLotsCount: profileWithLots.parkingLots?.length || 0,
      parkingLotsData: profileWithLots.parkingLots,
      fullProfile: profileData.profile
    });

    // Si no puede acceder al dashboard, necesita completar onboarding
    if (!canAccessDashboard) {
      return <Navigate to="/onboarding" replace />;
    }
  } else if (!error) {
    // Si no hay perfil y no hay error, es un usuario nuevo que necesita onboarding
    return <Navigate to="/onboarding" replace />;
  }

  // Si llegamos aquí, el usuario está autenticado y puede acceder al dashboard
  return <Outlet />;
};
