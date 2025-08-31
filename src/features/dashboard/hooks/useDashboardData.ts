import { useQuery } from '@tanstack/react-query';
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

const fetchWithAuth = async (url: string): Promise<any> => {
  const token = localStorage.getItem('auth_token'); // Ajustar según tu implementación

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DEL SISTEMA
// ===================================

export const useSystemStats = (params: DashboardStatsParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.timeRange) queryParams.set('timeRange', params.timeRange);
  if (params.timezone) queryParams.set('timezone', params.timezone);

  return useQuery<SystemStatsResponse>({
    queryKey: ['dashboard', 'system-stats', params],
    queryFn: () => fetchWithAuth(`/api/dashboard/stats?${queryParams.toString()}`),
    ...defaultQueryConfig,
    staleTime: 2 * 60 * 1000, // 2 minutos para stats críticas
  });
};

// ===================================
// HOOKS PARA PARQUEADEROS
// ===================================

export const useParkingOverview = (params: ParkingOverviewParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.status) queryParams.set('status', params.status);
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  return useQuery<ParkingOverviewResponse>({
    queryKey: ['dashboard', 'parking-overview', params],
    queryFn: () => fetchWithAuth(`/api/dashboard/parkings?${queryParams.toString()}`),
    ...defaultQueryConfig,
  });
};

// ===================================
// HOOKS PARA ACTIVIDAD RECIENTE
// ===================================

export const useRecentActivity = (params: RecentActivityParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.types) queryParams.set('types', params.types.join(','));
  if (params.since) queryParams.set('since', params.since);

  return useQuery<RecentActivityResponse>({
    queryKey: ['dashboard', 'recent-activity', params],
    queryFn: () => fetchWithAuth(`/api/dashboard/activity?${queryParams.toString()}`),
    ...defaultQueryConfig,
    staleTime: 1 * 60 * 1000, // 1 minuto para actividad reciente
  });
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DE OCUPACIÓN
// ===================================

export const useOccupancyStats = (params: OccupancyStatsParams) => {
  const queryParams = new URLSearchParams();
  queryParams.set('timeRange', params.timeRange);
  if (params.parkingId) queryParams.set('parkingId', params.parkingId);
  if (params.timezone) queryParams.set('timezone', params.timezone);

  return useQuery<OccupancyStats>({
    queryKey: ['dashboard', 'occupancy-stats', params],
    queryFn: () => fetchWithAuth(`/api/dashboard/occupancy?${queryParams.toString()}`),
    ...defaultQueryConfig,
    staleTime: 3 * 60 * 1000, // 3 minutos
  });
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DE INGRESOS
// ===================================

export const useRevenueStats = (timeRange: 'today' | 'week' | 'month' | 'year' = 'today') => {
  const queryParams = new URLSearchParams();
  queryParams.set('timeRange', timeRange);

  return useQuery<RevenueStats>({
    queryKey: ['dashboard', 'revenue-stats', timeRange],
    queryFn: () => fetchWithAuth(`/api/dashboard/revenue?${queryParams.toString()}`),
    ...defaultQueryConfig,
  });
};

// ===================================
// HOOKS PARA SALUD DEL SISTEMA
// ===================================

export const useSystemHealth = () => {
  return useQuery<SystemHealthResponse>({
    queryKey: ['dashboard', 'system-health'],
    queryFn: () => fetchWithAuth('/api/dashboard/health'),
    ...defaultQueryConfig,
    staleTime: 1 * 60 * 1000, // 1 minuto para salud del sistema
    refetchInterval: 2 * 60 * 1000, // Auto-refresh cada 2 minutos
  });
};

// ===================================
// HOOKS PARA ESTADÍSTICAS DE USUARIOS
// ===================================

export const useUserStats = (timeRange: 'today' | 'week' | 'month' = 'month') => {
  const queryParams = new URLSearchParams();
  queryParams.set('timeRange', timeRange);

  return useQuery<UserStats>({
    queryKey: ['dashboard', 'user-stats', timeRange],
    queryFn: () => fetchWithAuth(`/api/dashboard/users?${queryParams.toString()}`),
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

export const getDashboardErrorMessage = (error: any): string => {
  if (error?.response?.status === 401) {
    return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
  }
  if (error?.response?.status === 403) {
    return 'No tienes permisos para acceder a esta información.';
  }
  if (error?.response?.status >= 500) {
    return 'Error del servidor. Por favor, intenta más tarde.';
  }
  return error?.message || 'Error desconocido al cargar los datos.';
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
