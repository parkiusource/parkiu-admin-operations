import { Navigate, Outlet } from 'react-router-dom';
import { useAdminProfileCentralized } from '@/hooks/useAdminProfileCentralized';

interface RoleGuardProps {
  allowed: Array<'global_admin' | 'local_admin' | 'operator' | 'temp_admin'>;
  redirectTo?: string;
}

export const RoleGuard = ({ allowed, redirectTo = '/onboarding' }: RoleGuardProps) => {
  const { data, isLoading } = useAdminProfileCentralized();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const role = data?.profile?.role as RoleGuardProps['allowed'][number] | undefined;
  const status = data?.profile?.status;

  // Permitir solo si el rol está en la lista permitida y el estado habilita acceso general
  const isAllowed = !!role && allowed.includes(role) && (status === 'active' || (role === 'temp_admin' && status === 'pending_verify'));

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
