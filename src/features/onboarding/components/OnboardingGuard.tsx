import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAdminProfileCentralized } from '@/hooks/useAdminProfileCentralized';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const navigate = useNavigate();

  // Query centralizada para obtener el perfil del admin
  const { data: profileData, isLoading: isProfileLoading, error } = useAdminProfileCentralized();

  useEffect(() => {
    // Solo proceder si no está cargando
    if (!isAuthLoading && !isProfileLoading) {
      // Si no está autenticado, ir a login
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }

      // Si hay un error al obtener el perfil
      if (error) {
        // Si es error de conexión, mostrar mensaje específico
        if ((error as Error & { code?: string })?.code === 'ERR_NETWORK' ||
            (error as Error & { code?: string })?.code === 'ERR_CONNECTION_REFUSED') {
          // Para errores de conexión, permitir onboarding offline
          console.warn('Backend no disponible - continuando con onboarding offline');
        }
        return;
      }

      // Si tenemos el perfil, validar su estado
      if (profileData?.profile) {

        // Si el perfil está activo, ir al dashboard
        if (profileData.profile.status === 'active') {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Si el perfil está en un estado que requiere onboarding, permitirlo
        if (profileData.profile.status && ['initial', 'pending_profile', 'pending_parking', 'pending_verify'].includes(profileData.profile.status)) {
          return;
        }

        // Para otros estados (rejected, suspended, inactive), ir a login
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthLoading, isProfileLoading, profileData, error, isAuthenticated, navigate]);

  // Mostrar loading mientras se verifica el estado
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si llegamos aquí, significa que el usuario necesita onboarding
  return <>{children}</>;
};
