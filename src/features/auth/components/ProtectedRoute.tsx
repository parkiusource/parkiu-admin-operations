import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAdminProfileCentralized } from '@/hooks/useAdminProfileCentralized';
import { getOfflineSessionWithStatus } from '@/services/offlineSession';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { data: profileData, isLoading: isProfileLoading, error } = useAdminProfileCentralized();

  // 🔐 OFFLINE-FIRST: Verificar si hay sesión offline válida
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const sessionStatus = !isOnline ? getOfflineSessionWithStatus() : { session: null, expired: false, hoursRemaining: 0 };
  const hasValidOfflineSession = sessionStatus.session !== null;
  const sessionExpired = sessionStatus.expired;

  // 🚨 SESIÓN EXPIRADA: Mostrar mensaje de seguridad
  if (!isOnline && sessionExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sesión Offline Expirada</h2>
          <p className="text-gray-600 mb-4">
            Por seguridad, la sesión offline tiene un límite de <strong>24 horas</strong>.
            Tu sesión ha expirado.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>🔒 Medida anti-fraude:</strong> Este límite protege contra el uso no autorizado
              del sistema en caso de pérdida o robo del dispositivo.
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            Conéctate a internet para renovar tu sesión y continuar operando.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-parkiu-600 hover:bg-parkiu-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  // 📴 MODO OFFLINE: Si estamos offline y hay sesión válida, permitir acceso
  if (!isOnline && hasValidOfflineSession) {
    console.log('📴 [ProtectedRoute] Modo offline con sesión válida - Permitiendo acceso');
    return <Outlet />;
  }

  // Mostrar loading mientras se verifica autenticación y perfil (solo si online)
  if (isAuthLoading || (isAuthenticated && isProfileLoading && isOnline)) {
    // 📴 Si está offline y Auth0 está cargando indefinidamente, verificar sesión offline
    if (!isOnline && hasValidOfflineSession) {
      console.log('📴 [ProtectedRoute] Auth0 loading pero hay sesión offline - Permitiendo acceso');
      return <Outlet />;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no está autenticado, verificar sesión offline antes de redirigir
  if (!isAuthenticated) {
    // 📴 Última verificación: si hay sesión offline válida, permitir acceso
    if (!isOnline && hasValidOfflineSession) {
      console.log('📴 [ProtectedRoute] No autenticado pero hay sesión offline - Permitiendo acceso');
      return <Outlet />;
    }
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

    // Permitir acceso al dashboard solo si:
    // 1. Status es 'active' (admins completos con todo verificado, cualquier rol)
    // 2. Es temp_admin con status 'pending_verify' (ya completó onboarding, esperando verificación)
    const canAccessDashboard = (
      status === 'active' ||
      (role === 'temp_admin' && status === 'pending_verify')
    );

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
