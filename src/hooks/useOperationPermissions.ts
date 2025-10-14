import { useMemo } from 'react';
import { useAdminProfileStatus } from './useAdminProfileCentralized';

/**
 * Hook para gestionar permisos de operaciones basados en el rol del usuario
 *
 * Roles:
 * - global_admin: Acceso completo a todas las operaciones
 * - local_admin: Operaciones del parqueadero (entrada/salida/búsqueda)
 * - temp_admin: Operaciones limitadas mientras espera verificación
 * - viewer: Solo lectura (futuro)
 */
export const useOperationPermissions = () => {
  const { profile, status } = useAdminProfileStatus();

  const permissions = useMemo(() => {
    const role = profile?.role;
    const userStatus = status;

    // Usuario no autenticado o sin perfil
    if (!role || !userStatus) {
      return {
        canRegisterEntry: false,
        canRegisterExit: false,
        canSearchVehicles: false,
        canViewTransactions: false,
        canExportData: false,
        canEditPricing: false,
        canManageUsers: false,
        canManageSettings: false,
        canDeleteTransactions: false,
        canVoidTransactions: false,
      };
    }

    // Global Admin - Acceso completo
    if (role === 'global_admin') {
      return {
        canRegisterEntry: true,
        canRegisterExit: true,
        canSearchVehicles: true,
        canViewTransactions: true,
        canExportData: true,
        canEditPricing: true,
        canManageUsers: true,
        canManageSettings: true,
        canDeleteTransactions: true,
        canVoidTransactions: true,
      };
    }

    // Local Admin - Operaciones del parqueadero
    if (role === 'local_admin') {
      return {
        canRegisterEntry: true,
        canRegisterExit: true,
        canSearchVehicles: true,
        canViewTransactions: true,
        canExportData: true,
        canEditPricing: true,
        canManageUsers: false,
        canManageSettings: true,
        canDeleteTransactions: false,
        canVoidTransactions: true,
      };
    }

    // Temp Admin - Operaciones limitadas
    if (role === 'temp_admin' && userStatus === 'pending_verify') {
      return {
        canRegisterEntry: true,
        canRegisterExit: true,
        canSearchVehicles: true,
        canViewTransactions: true,
        canExportData: true,
        canEditPricing: false, // No puede cambiar precios hasta ser verificado
        canManageUsers: false,
        canManageSettings: false,
        canDeleteTransactions: false,
        canVoidTransactions: false,
      };
    }

    // Por defecto, no tiene permisos
    return {
      canRegisterEntry: false,
      canRegisterExit: false,
      canSearchVehicles: false,
      canViewTransactions: false,
      canExportData: false,
      canEditPricing: false,
      canManageUsers: false,
      canManageSettings: false,
      canDeleteTransactions: false,
      canVoidTransactions: false,
    };
  }, [profile?.role, status]);

  return {
    ...permissions,
    role: profile?.role,
    status,
    isGlobalAdmin: profile?.role === 'global_admin',
    isLocalAdmin: profile?.role === 'local_admin',
    isTempAdmin: profile?.role === 'temp_admin',
  };
};
