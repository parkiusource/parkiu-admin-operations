import { useQuery } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import {
  SystemStatsResponse,
  ParkingOverviewResponse,
  RecentActivityResponse,
  OccupancyStats,
  RevenueStats,
  SystemHealthResponse,
  UserStats,
  DashboardStatsParams,
  ParkingOverviewParams,
  RecentActivityParams,
  OccupancyStatsParams
} from '../types/api';

// ===================================
// CONFIGURACIÓN BASE
// ===================================

const API_BASE_URL = import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:8080';

const defaultQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
  refetchOnWindowFocus: false,
  retry: 2,
};

// ===================================
// FUNCIONES DE FETCH
// ===================================
// Token vía Auth0 (nunca localStorage: riesgo XSS). Ver docs/OFFLINE_STORAGE.md

async function fetchWithAuth<T>(url: string, getToken: () => Promise<string>): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new Error('No se pudo obtener el token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ===================================
// HOOKS PARA ESTADÍSTICAS DEL SISTEMA
// ===================================

export const useSystemStats = (params: DashboardStatsParams = {}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryParams = new URLSearchParams();
  if (params.timeRange) queryParams.set('timeRange', params.timeRange);
  if (params.timezone) queryParams.set('timezone', params.timezone);

  return useQuery<SystemStatsResponse>({
    queryKey: ['dashboard', 'system-stats', params],
    queryFn: () => fetchWithAuth<SystemStatsResponse>(`/api/dashboard/stats?${queryParams.toString()}`, getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
    staleTime: 2 * 60 * 1000, // 2 minutos para stats críticas
  });
};

// ===================================
// HOOKS PARA PARQUEADEROS
// ===================================

export const useParkingOverview = (params: ParkingOverviewParams = {}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.status) queryParams.set('status', params.status);
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  return useQuery<ParkingOverviewResponse>({
    queryKey: ['dashboard', 'parking-overview', params],
    queryFn: () => fetchWithAuth<ParkingOverviewResponse>(`/api/dashboard/parkings?${queryParams.toString()}`, getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
  });
};

// ===================================
// HOOKS PARA ACTIVIDAD RECIENTE
// ===================================

export const useRecentActivity = (params: RecentActivityParams = {}) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.types) queryParams.set('types', params.types.join(','));
  if (params.since) queryParams.set('since', params.since);

  return useQuery<RecentActivityResponse>({
    queryKey: ['dashboard', 'recent-activity', params],
    queryFn: () => fetchWithAuth<RecentActivityResponse>(`/api/dashboard/activity?${queryParams.toString()}`, getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
    staleTime: 1 * 60 * 1000, // 1 minuto para actividad reciente
  });
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DE OCUPACIÓN
// ===================================

export const useOccupancyStats = (params: OccupancyStatsParams) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryParams = new URLSearchParams();
  queryParams.set('timeRange', params.timeRange);
  if (params.parkingId) queryParams.set('parkingId', params.parkingId);
  if (params.timezone) queryParams.set('timezone', params.timezone);

  return useQuery<OccupancyStats>({
    queryKey: ['dashboard', 'occupancy-stats', params],
    queryFn: () => fetchWithAuth<OccupancyStats>(`/api/dashboard/occupancy?${queryParams.toString()}`, getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
    staleTime: 3 * 60 * 1000, // 3 minutos
  });
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DE INGRESOS
// ===================================

export const useRevenueStats = (timeRange: 'today' | 'week' | 'month' | 'year' = 'today') => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryParams = new URLSearchParams();
  queryParams.set('timeRange', timeRange);

  return useQuery<RevenueStats>({
    queryKey: ['dashboard', 'revenue-stats', timeRange],
    queryFn: () => fetchWithAuth<RevenueStats>(`/api/dashboard/revenue?${queryParams.toString()}`, getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
  });
};

// ===================================
// HOOKS PARA SALUD DEL SISTEMA
// ===================================

export const useSystemHealth = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  return useQuery<SystemHealthResponse>({
    queryKey: ['dashboard', 'system-health'],
    queryFn: () => fetchWithAuth<SystemHealthResponse>('/api/dashboard/health', getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
    staleTime: 1 * 60 * 1000, // 1 minuto para salud del sistema
    refetchInterval: 2 * 60 * 1000, // Auto-refresh cada 2 minutos
  });
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DE USUARIOS
// ===================================

export const useUserStats = (timeRange: 'today' | 'week' | 'month' = 'month') => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryParams = new URLSearchParams();
  queryParams.set('timeRange', timeRange);

  return useQuery<UserStats>({
    queryKey: ['dashboard', 'user-stats', timeRange],
    queryFn: () => fetchWithAuth<UserStats>(`/api/dashboard/users?${queryParams.toString()}`, getAccessTokenSilently),
    enabled: isAuthenticated,
    ...defaultQueryConfig,
  });
};

// ===================================
// HOOK COMBINADO PARA EL DASHBOARD COMPLETO
// ===================================

export const useDashboardData = (params: {
  statsParams?: DashboardStatsParams;
  parkingParams?: ParkingOverviewParams;
  activityParams?: RecentActivityParams;
} = {}) => {
  const systemStats = useSystemStats(params.statsParams);
  const parkingOverview = useParkingOverview(params.parkingParams);
  const recentActivity = useRecentActivity(params.activityParams);
  const systemHealth = useSystemHealth();

  return {
    systemStats,
    parkingOverview,
    recentActivity,
    systemHealth,
    isLoading: systemStats.isLoading || parkingOverview.isLoading || recentActivity.isLoading,
    isError: systemStats.isError || parkingOverview.isError || recentActivity.isError,
    refetchAll: () => {
      systemStats.refetch();
      parkingOverview.refetch();
      recentActivity.refetch();
      systemHealth.refetch();
    },
  };
};

// ===================================
// UTILIDADES PARA MANEJO DE ERRORES
// ===================================

export const getDashboardErrorMessage = (error: unknown): string => {
  const maybeResponse = (error as { response?: { status?: number } })?.response;
  const status = maybeResponse?.status;

  if (status === 401) {
    return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
  }
  if (status === 403) {
    return 'No tienes permisos para acceder a esta información.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Error del servidor. Por favor, intenta más tarde.';
  }
  const message = (error as { message?: string })?.message;
  return message || 'Error desconocido al cargar los datos.';
};

// ===================================
// CONFIGURACIÓN DE INVALIDACIÓN DE CACHÉ
// ===================================

export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'] as const,
  systemStats: (params?: DashboardStatsParams) => ['dashboard', 'system-stats', params] as const,
  parkingOverview: (params?: ParkingOverviewParams) => ['dashboard', 'parking-overview', params] as const,
  recentActivity: (params?: RecentActivityParams) => ['dashboard', 'recent-activity', params] as const,
  occupancyStats: (params: OccupancyStatsParams) => ['dashboard', 'occupancy-stats', params] as const,
  revenueStats: (timeRange: string) => ['dashboard', 'revenue-stats', timeRange] as const,
  systemHealth: () => ['dashboard', 'system-health'] as const,
  userStats: (timeRange: string) => ['dashboard', 'user-stats', timeRange] as const,
};
