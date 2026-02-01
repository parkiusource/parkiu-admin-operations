import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAdminProfileCentralized } from '@/hooks/useAdminProfileCentralized';

/**
 * Componente que maneja la redirección inteligente desde la ruta raíz (/)
 * Redirige a dashboard si el usuario está activo, o a onboarding si necesita completar el proceso
 */
export const RootRedirect = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { data: profileData, isLoading: isProfileLoading, error } = useAdminProfileCentralized();

  // Mostrar loading mientras se verifica autenticación y perfil
  if (isAuthLoading || (isAuthenticated && isProfileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-parkiu-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-parkiu-500 to-parkiu-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Verificando acceso...</h2>
          <p className="text-gray-600">Un momento por favor</p>
        </div>
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

  // Si tenemos datos del perfil, verificar su estado para redirección inteligente
  if (profileData?.profile) {
    const status = profileData.profile.status;
    const role = profileData.profile.role;

    // Si es admin activo (cualquier rol), ir directo al dashboard
    if (status === 'active') {
      return <Navigate to="/dashboard" replace />;
    }

    // Si es temp_admin con pending_verify, puede ir al dashboard (con limitaciones)
    // El status pending_verify significa que ya completó el onboarding (perfil + parqueadero)
    if (role === 'temp_admin' && status === 'pending_verify') {
      return <Navigate to="/dashboard" replace />;
    }

    // En cualquier otro caso, necesita completar onboarding
    return <Navigate to="/onboarding" replace />;
  } else if (!error) {
    // Si no hay perfil y no hay error, es un usuario nuevo que necesita onboarding
    return <Navigate to="/onboarding" replace />;
  }

  // Fallback: si hay error de conexión, ir a onboarding que manejará el error
  return <Navigate to="/onboarding" replace />;
};
