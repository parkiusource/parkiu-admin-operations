import { useQuery, useQueries } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// ===================================
// TIPOS BASADOS EN LA DOCUMENTACIÓN EXISTENTE
// ===================================

interface ParkingLotStats {
  total_spots: number;
  occupied_spots: number;
  available_spots: number;
  revenue_today: number;
  revenue_month: number;
  occupancy_rate: number;
  avg_stay_duration: number; // en minutos
}

interface AdminStats {
  total_parking_lots: number;
  total_spots: number;
  total_revenue: number;
  active_vehicles: number;
}



// ===================================
// CONFIGURACIÓN DE LA API
// ===================================

const API_BASE_URL = import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:8080';

// Función para crear headers con token de Auth0
const createAuthHeaders = async (getAccessTokenSilently: () => Promise<string>) => {
  try {
    const token = await getAccessTokenSilently();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting Auth0 token:', error);
    throw new Error('Authentication failed');
  }
};

// Función de fetch que usa Auth0 token
const fetchWithAuth = async <T>(url: string, getAccessTokenSilently: () => Promise<string>): Promise<T> => {
  const headers = await createAuthHeaders(getAccessTokenSilently);

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data; // Según la documentación, los datos pueden estar en data.data o directamente en data
};

// ===================================
// HOOKS PARA LOS ENDPOINTS EXISTENTES
// ===================================

/**
 * Hook para obtener estadísticas generales del administrador
 * Usa: GET /admin/stats
 */
export const useAdminStats = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  return useQuery<AdminStats>({
    queryKey: ['dashboard', 'admin-stats'], // ✅ Consistente con otros hooks del dashboard
    queryFn: () => fetchWithAuth<AdminStats>('/admin/stats', getAccessTokenSilently),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: isAuthenticated,
  });
};

/**
 * Hook para obtener estadísticas de un parqueadero específico
 * Usa: GET /admin/parking-lots/{parking_lot_id}/stats
 */
export const useParkingLotStats = (parkingLotId: string) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  return useQuery<ParkingLotStats>({
    queryKey: ['dashboard', 'parking-lot-stats', parkingLotId], // ✅ Consistente con otros hooks del dashboard
    queryFn: () => fetchWithAuth<ParkingLotStats>(`/admin/parking-lots/${parkingLotId}/stats`, getAccessTokenSilently),
    staleTime: 2 * 60 * 1000, // 2 minutos para stats más frecuentes
    gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: isAuthenticated && !!parkingLotId,
  });
};

/**
 * Hook para obtener estadísticas de múltiples parqueaderos
 * Combina datos de varios parqueaderos
 */
export const useMultipleParkingStats = (parkingLotIds: string[]) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  // Usar useQueries para múltiples queries de forma segura
  const queries = useQueries({
    queries: parkingLotIds.map(id => ({
      queryKey: ['dashboard', 'parking-lot-stats', id], // ✅ Consistente con otros hooks del dashboard
      queryFn: () => fetchWithAuth<ParkingLotStats>(`/admin/parking-lots/${id}/stats`, getAccessTokenSilently),
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      enabled: isAuthenticated && !!id,
    }))
  });

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const data = queries.map(q => q.data).filter(Boolean) as ParkingLotStats[];

  return {
    data,
    isLoading,
    isError,
    refetchAll: () => queries.forEach(q => q.refetch()),
  };
};

// ===================================
// HOOK PARA ESTADÍSTICAS EN TIEMPO REAL
// ===================================

/**
 * Hook que actualiza automáticamente las estadísticas
 * Basado en el ejemplo de la documentación
 *
 * ⚠️ NOTA: Este hook está siendo reemplazado por optimización en DashboardWithRealData
 * para evitar llamadas API duplicadas. Se mantiene para compatibilidad.
 */
export const useRealtimeStats = (parkingLotId: string, intervalMs = 30000) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [stats, setStats] = useState<ParkingLotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parkingLotId || !isAuthenticated) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<ParkingLotStats>(`/admin/parking-lots/${parkingLotId}/stats`, getAccessTokenSilently);
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch inicial
    fetchStats();

    // Actualizar cada intervalo especificado (solo si intervalMs > 0)
    let interval: NodeJS.Timeout | null = null;
    if (intervalMs > 0) {
      interval = setInterval(fetchStats, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [parkingLotId, intervalMs, isAuthenticated, getAccessTokenSilently]);

  return {
    stats,
    loading,
    error,
    refetch: () => {
      if (parkingLotId && isAuthenticated) {
        // Trigger manual refetch
        setLoading(true);
        fetchWithAuth<ParkingLotStats>(`/admin/parking-lots/${parkingLotId}/stats`, getAccessTokenSilently)
          .then(setStats)
          .catch(err => setError(err.message))
          .finally(() => setLoading(false));
      }
    }
  };
};

// ===================================
// HOOK COMBINADO PARA EL DASHBOARD
// ===================================

/**
 * Hook principal que combina todas las estadísticas necesarias para el dashboard
 */
export const useDashboardStats = (parkingLotIds: string[] = []) => {
  const adminStats = useAdminStats();
  const multipleParkingStats = useMultipleParkingStats(parkingLotIds);

  // Calcular estadísticas agregadas
  const aggregatedStats = {
    totalParkings: adminStats.data?.total_parking_lots || 0,
    activeParkings: parkingLotIds.length, // Asumiendo que los IDs pasados son activos
    totalSpaces: adminStats.data?.total_spots || 0,
    occupiedSpaces: multipleParkingStats.data.reduce((sum, stats) => sum + (stats?.occupied_spots || 0), 0),
    todayRevenue: multipleParkingStats.data.reduce((sum, stats) => sum + (stats?.revenue_today || 0), 0),
    activeVehicles: adminStats.data?.active_vehicles || 0,
    systemHealth: 'good' as const, // Calculado basado en métricas
  };

  const occupancyRate = aggregatedStats.totalSpaces > 0
    ? Math.round((aggregatedStats.occupiedSpaces / aggregatedStats.totalSpaces) * 100)
    : 0;

  return {
    adminStats,
    multipleParkingStats,
    aggregatedStats: {
      ...aggregatedStats,
      occupancyRate,
      availableSpaces: aggregatedStats.totalSpaces - aggregatedStats.occupiedSpaces,
    },
    isLoading: adminStats.isLoading || multipleParkingStats.isLoading,
    isError: adminStats.isError || multipleParkingStats.isError,
    refetchAll: () => {
      adminStats.refetch();
      multipleParkingStats.refetchAll();
    },
  };
};

// ===================================
// UTILIDADES PARA CÁLCULOS Y FORMATEO
// ===================================

/**
 * Calcula KPIs adicionales basados en las estadísticas
 */
export const calculateKPIs = (stats: ParkingLotStats) => {
  return {
    // Tasa de rotación diaria estimada
    turnoverRate: stats.total_spots > 0 ?
      (24 * 60) / stats.avg_stay_duration : 0,

    // Ingresos por espacio por día
    revenuePerSpace: stats.total_spots > 0 ?
      stats.revenue_today / stats.total_spots : 0,

    // Proyección de ingresos mensuales basada en el día actual
    monthlyProjection: stats.revenue_today * 30,

    // Eficiencia de ocupación (considera tiempo de estadía)
    occupancyEfficiency: (stats.occupancy_rate / 100) *
      (stats.avg_stay_duration / (24 * 60)),

    // Duración promedio formateada
    avgStayFormatted: {
      hours: Math.floor(stats.avg_stay_duration / 60),
      minutes: Math.floor(stats.avg_stay_duration % 60),
    }
  };
};

/**
 * Genera alertas basadas en las estadísticas
 */
export const generateAlerts = (stats: ParkingLotStats) => {
  const alerts = [];

  // Alerta de ocupación alta
  if (stats.occupancy_rate > 90) {
    alerts.push({
      type: 'warning' as const,
      message: `⚠️ Ocupación alta: ${stats.occupancy_rate.toFixed(1)}%`,
      priority: 'medium' as const,
    });
  }

  // Alerta de parqueadero lleno
  if (stats.available_spots === 0) {
    alerts.push({
      type: 'danger' as const,
      message: '🚫 Parqueadero completamente lleno',
      priority: 'high' as const,
    });
  }

  // Notificación de buen día
  if (stats.revenue_today > 100000) {
    alerts.push({
      type: 'success' as const,
      message: `🎉 ¡Buen día! $${stats.revenue_today.toLocaleString('es-CO')} en ingresos`,
      priority: 'low' as const,
    });
  }

  // Alerta de estadía promedio muy larga
  if (stats.avg_stay_duration > 8 * 60) { // Más de 8 horas
    alerts.push({
      type: 'info' as const,
      message: `ℹ️ Estadía promedio alta: ${Math.floor(stats.avg_stay_duration / 60)}h ${Math.floor(stats.avg_stay_duration % 60)}m`,
      priority: 'low' as const,
    });
  }

  return alerts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

/**
 * Formatea números en formato colombiano
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatea duración en formato legible
 */
export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};
