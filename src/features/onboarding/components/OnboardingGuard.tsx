import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import { getAdminProfile } from '@/services/profile';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

interface ProfileResponse {
  profile: {
    id: number;
    auth0_uuid: string;
    email: string;
    name: string;
    nit: string;
    photo_url: string;
    contact_phone: string;
    role: string;
    status: 'initial' | 'pending_profile' | 'pending_parking' | 'pending_verify' | 'active' | 'rejected' | 'suspended' | 'inactive';
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  // Query para obtener el perfil del admin
  const { data: profileData, isLoading: isProfileLoading, error } = useQuery<ProfileResponse>({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return getAdminProfile(token);
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  useEffect(() => {
    // Solo proceder si no está cargando
    if (!isAuthLoading && !isProfileLoading) {
      // Si no está autenticado, ir a login
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }

      // Si hay un error al obtener el perfil, permitir onboarding
      if (error) {
        console.log('Error al obtener perfil:', error);
        return;
      }

      // Si tenemos el perfil, validar su estado
      if (profileData?.profile) {
        console.log('Estado del perfil:', profileData.profile.status);

        // Si el perfil está activo, ir al dashboard
        if (profileData.profile.status === 'active') {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Si el perfil está en un estado que requiere onboarding, permitirlo
        if (['initial', 'pending_profile', 'pending_parking', 'pending_verify'].includes(profileData.profile.status)) {
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
