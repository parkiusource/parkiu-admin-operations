import { useEffect, useState, useMemo } from 'react';
import {
  LuBuilding2,
  LuMapPin,
  LuCar,
  LuDollarSign,
  LuActivity,
  LuTriangle,
  LuCheck,
  LuTrendingUp,
  LuPlus,
  LuSettings,
  LuEye,
  LuRefreshCw
} from 'react-icons/lu';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  useRealtimeStats,
  calculateKPIs,
  generateAlerts,
  formatCurrency,
  formatDuration
} from './hooks/useRealDashboardData';
import { useParkingLots } from '../../hooks/parking/useParkingLots';

// ===================================
// CONFIGURACIÓN
// ===================================

// Datos mock para actividad reciente (hasta implementar endpoint)
const mockRecentActivity = [
  {
    id: '1',
    type: 'high_occupancy',
    message: 'Ocupación alta detectada en Centro Comercial Plaza',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: 'warning' as const
  },
  {
    id: '2',
    type: 'revenue_milestone',
    message: 'Meta de ingresos diarios alcanzada',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: 'success' as const
  },
  {
    id: '3',
    type: 'system_info',
    message: '45 nuevos vehículos registrados hoy',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    status: 'info' as const
  }
];

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export default function DashboardWithRealData() {
  // Estados locales primero (orden consistente)
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [selectedParkingLot, setSelectedParkingLot] = useState<string>('');
  const [alerts, setAlerts] = useState<Array<{
    type: 'warning' | 'danger' | 'success' | 'info';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // ✅ Obtener parqueaderos reales usando el hook existente
  const { parkingLots, isLoading: isLoadingParkingLots, error: parkingLotsError } = useParkingLots();

  // Extraer IDs de parqueaderos (memoizado para evitar re-renders)
  const parkingLotIds = useMemo(() =>
    parkingLots.map(lot => lot.id).filter((id): id is string => Boolean(id)),
    [parkingLots]
  );

  // Establecer el primer parqueadero como seleccionado por defecto
  useEffect(() => {
    if (parkingLotIds.length > 0 && !selectedParkingLot) {
      setSelectedParkingLot(parkingLotIds[0]);
    }
  }, [parkingLotIds, selectedParkingLot]);

  // Hooks para datos reales (siempre en el mismo orden)
  // Optimized: Reduce update frequency to avoid performance issues
  const dashboardStats = useDashboardStats(parkingLotIds);
  const realtimeStats = useRealtimeStats(selectedParkingLot, realtimeEnabled ? 60000 : 0); // Increased to 60s

  // Generar alertas cuando cambien las estadísticas (optimizado)
  useEffect(() => {
    if (realtimeStats.stats) {
      const updateAlerts = () => {
        if (realtimeStats.stats) {
          const newAlerts = generateAlerts(realtimeStats.stats);
          setAlerts(newAlerts);
          setLastUpdate(new Date());
        }
      };

      // Use requestIdleCallback for non-critical UI updates
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(updateAlerts);
      } else {
        updateAlerts();
      }
    }
  }, [realtimeStats.stats]);

  // Calcular KPIs adicionales
  const kpis = realtimeStats.stats ? calculateKPIs(realtimeStats.stats) : null;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)} días`;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-parkiu-600 bg-parkiu-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <LuCheck className="w-5 h-5" />;
      case 'good': return <LuActivity className="w-5 h-5" />;
      case 'warning': return <LuTriangle className="w-5 h-5" />;
      case 'critical': return <LuTriangle className="w-5 h-5" />;
      default: return <LuActivity className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard ParkiU</h1>
          <p className="text-gray-600">
            Sistema en tiempo real • Última actualización: {lastUpdate.toLocaleTimeString('es-CO')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              realtimeEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            {realtimeEnabled ? 'Tiempo Real ON' : 'Tiempo Real OFF'}
          </button>
          <button
            onClick={() => {
              dashboardStats.refetchAll();
              realtimeStats.refetch();
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={dashboardStats.isLoading || isLoadingParkingLots}
          >
            <LuRefreshCw className={`w-4 h-4 ${(dashboardStats.isLoading || isLoadingParkingLots) ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                alert.type === 'danger' ? 'bg-red-50 border-red-400 text-red-800' :
                alert.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                'bg-parkiu-50 border-parkiu-400 text-parkiu-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <LuTriangle className="w-5 h-5" />
                <span className="font-medium">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Parqueaderos */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-parkiu-100 rounded-lg flex items-center justify-center">
                  <LuBuilding2 className="h-6 w-6 text-parkiu-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Parqueaderos
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardStats.isLoading ? '...' : dashboardStats.aggregatedStats.totalParkings}
                  </dd>
                  <dd className="text-sm text-green-600">
                    {dashboardStats.aggregatedStats.activeParkings} activos
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Ocupación General */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <LuMapPin className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ocupación General
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardStats.isLoading ? '...' : `${dashboardStats.aggregatedStats.occupancyRate}%`}
                  </dd>
                  <dd className="text-sm text-gray-600">
                    {dashboardStats.aggregatedStats.occupiedSpaces} de {dashboardStats.aggregatedStats.totalSpaces} espacios
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Ingresos Hoy */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <LuDollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ingresos Hoy
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardStats.isLoading ? '...' : formatCurrency(dashboardStats.aggregatedStats.todayRevenue)}
                  </dd>
                  <dd className="text-sm text-gray-600">
                    {dashboardStats.aggregatedStats.activeVehicles} vehículos activos
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getHealthColor('good')}`}>
                  {getHealthIcon('good')}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Estado del Sistema
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    Operativo
                  </dd>
                  <dd className="text-sm text-gray-600">
                    {realtimeEnabled ? 'Tiempo real activo' : 'Modo manual'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parqueaderos Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Parqueaderos en Tiempo Real</h3>
              <Link
                to="/parking"
                className="text-parkiu-600 hover:text-parkiu-700 text-sm font-medium flex items-center gap-1"
              >
                Ver todos <LuEye className="w-4 h-4" />
              </Link>
            </div>

            {/* Selector de parqueadero para vista detallada */}
            <div className="mb-4">
              <select
                value={selectedParkingLot}
                onChange={(e) => setSelectedParkingLot(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-parkiu-500 focus:border-parkiu-500"
                disabled={isLoadingParkingLots}
              >
                {isLoadingParkingLots ? (
                  <option>Cargando parqueaderos...</option>
                ) : parkingLotsError ? (
                  <option>Error cargando parqueaderos</option>
                ) : parkingLots.length === 0 ? (
                  <option>No hay parqueaderos disponibles</option>
                ) : (
                  parkingLots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.name} - {lot.address}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Estadísticas del parqueadero seleccionado */}
            {realtimeStats.loading ? (
              <div className="flex items-center justify-center py-8">
                <LuRefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Cargando estadísticas...</span>
              </div>
            ) : realtimeStats.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error: {realtimeStats.error}</p>
              </div>
            ) : realtimeStats.stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Ocupación</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {realtimeStats.stats.occupancy_rate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {realtimeStats.stats.occupied_spots}/{realtimeStats.stats.total_spots} espacios
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Ingresos Hoy</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(realtimeStats.stats.revenue_today)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Mes: {formatCurrency(realtimeStats.stats.revenue_month)}
                    </div>
                  </div>
                </div>

                {/* KPIs adicionales */}
                {kpis && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-600">Estadía Promedio</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatDuration(realtimeStats.stats.avg_stay_duration)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Ingresos/Espacio</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(kpis.revenuePerSpace)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Actividad Reciente</h3>
            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    'bg-parkiu-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/parking"
              className="flex items-center gap-3 p-4 bg-parkiu-50 hover:bg-parkiu-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-parkiu-100 group-hover:bg-parkiu-200 rounded-lg flex items-center justify-center">
                <LuPlus className="w-5 h-5 text-parkiu-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Nuevo Parqueadero</div>
                <div className="text-sm text-gray-600">Crear parqueadero</div>
              </div>
            </Link>

            <Link
              to="/vehicles/entry"
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center">
                <LuCar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Registrar Entrada</div>
                <div className="text-sm text-gray-600">Nuevo vehículo</div>
              </div>
            </Link>

            <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
              <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center">
                <LuTrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Ver Reportes</div>
                <div className="text-sm text-gray-600">Análisis detallado</div>
              </div>
            </button>

            <Link
              to="/settings"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center">
                <LuSettings className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Configuración</div>
                <div className="text-sm text-gray-600">Ajustes del sistema</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
