import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import { getAdminProfile } from '@/services/profile';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  // Query para obtener el perfil del admin
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return getAdminProfile(token);
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthLoading && !isProfileLoading && profile) {
      switch (profile.status) {
        case 'initial':
        case 'pending_profile':
        case 'pending_parking':
        case 'pending_verify':
          // Permitir onboarding
          break;
        case 'active':
          navigate('/dashboard', { replace: true });
          break;
        default:
          // Manejar otros estados (rejected, suspended, inactive)
          navigate('/login', { replace: true });
      }
    }
  }, [isAuthLoading, isProfileLoading, profile, navigate]);

  // Mostrar loading mientras se verifica el estado
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si está autenticado pero no tiene parqueaderos, mostrar el onboarding
  return <>{children}</>;
};
