import { useEffect, useState, useMemo } from 'react';
import {
  LuBuilding2,
  LuMapPin,
  LuDollarSign,
  LuActivity,
  LuCheck,
  LuTrendingUp,
  LuPlus,
  LuSettings,
  LuEye,
  LuRefreshCw,
  LuFileText,
  LuClock,
  LuTriangle
} from 'react-icons/lu';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  calculateKPIs,
  generateAlerts,
  formatCurrency,
  formatDuration
} from './hooks/useRealDashboardData';
import { useParkingLots } from '../../hooks/parking/useParkingLots';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ===================================
// CONFIGURACIÓN
// ===================================

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

  const queriedIds = selectedParkingLot ? [selectedParkingLot] : [];
  const dashboardStats = useDashboardStats(queriedIds);

  const selectedParkingStats = selectedParkingLot
    ? dashboardStats.multipleParkingStats.data[0]
    : null;

  // Solo usar realtimeStats si necesitamos actualizaciones más frecuentes
  // Por ahora, usamos los datos del cache para evitar llamadas duplicadas
  const realtimeStats = {
    stats: selectedParkingStats || null,
    loading: dashboardStats.isLoading,
    error: dashboardStats.isError ? undefined : null,
    refetch: dashboardStats.refetchAll
  };

  const friendlyError = (() => {
    // Here we could read role from a centralized profile hook if available
    // For now, show friendly message when there is an error loading stats
    if (!dashboardStats.isError) return null;
    return 'Vista limitada: tu cuenta temporal no tiene permisos para estadísticas. Puedes navegar el resto del sistema mientras completes la verificación.';
  })();

  const hasError = dashboardStats.isError || Boolean(realtimeStats.error);

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
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard ParkiU</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy • HH:mm", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
              realtimeEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="hidden sm:inline">{realtimeEnabled ? 'Tiempo Real' : 'Manual'}</span>
          </button>
          <button
            onClick={() => {
              dashboardStats.refetchAll();
              realtimeStats.refetch();
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            disabled={dashboardStats.isLoading || isLoadingParkingLots}
          >
            <LuRefreshCw className={`w-4 h-4 ${(dashboardStats.isLoading || isLoadingParkingLots) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
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
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {/* Total Parqueaderos */}
        <div className="bg-gradient-to-br from-white to-parkiu-50 overflow-hidden shadow-md rounded-2xl border border-parkiu-200 hover:shadow-lg transition-shadow">
          <div className="p-3 sm:p-5 lg:p-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-parkiu-500 to-parkiu-600 rounded-xl flex items-center justify-center shadow-md">
                  <LuBuilding2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="sm:ml-4 flex-1">
                <dl>
                  <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Parqueaderos
                  </dt>
                  <dd className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {dashboardStats.isLoading ? '...' : dashboardStats.aggregatedStats.totalParkings}
                  </dd>
                  <dd className="text-xs sm:text-sm text-green-600 font-medium mt-0.5">
                    {dashboardStats.aggregatedStats.activeParkings} activos
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Ocupación General */}
        <div className="bg-gradient-to-br from-white to-green-50 overflow-hidden shadow-md rounded-2xl border border-green-200 hover:shadow-lg transition-shadow">
          <div className="p-3 sm:p-5 lg:p-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <LuMapPin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="sm:ml-4 flex-1">
                <dl>
                  <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Ocupación
                  </dt>
                  <dd className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {dashboardStats.isLoading ? '...' : `${dashboardStats.aggregatedStats.occupancyRate}%`}
                  </dd>
                  <dd className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">
                    {dashboardStats.aggregatedStats.occupiedSpaces}/{dashboardStats.aggregatedStats.totalSpaces}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Ingresos Hoy */}
        <div className="bg-gradient-to-br from-white to-purple-50 overflow-hidden shadow-md rounded-2xl border border-purple-200 hover:shadow-lg transition-shadow col-span-2 sm:col-span-1">
          <div className="p-3 sm:p-5 lg:p-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                  <LuDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="sm:ml-4 flex-1">
                <dl>
                  <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Ingresos Hoy
                  </dt>
                  <dd className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                    {dashboardStats.isLoading ? '...' : formatCurrency(dashboardStats.aggregatedStats.todayRevenue)}
                  </dd>
                  <dd className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">
                    {dashboardStats.aggregatedStats.activeVehicles} vehículos
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="bg-gradient-to-br from-white to-blue-50 overflow-hidden shadow-md rounded-2xl border border-blue-200 hover:shadow-lg transition-shadow col-span-2 sm:col-span-1">
          <div className="p-3 sm:p-5 lg:p-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex-shrink-0 mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <LuActivity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="sm:ml-4 flex-1">
                <dl>
                  <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Sistema
                  </dt>
                  <dd className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    Operativo
                  </dd>
                  <dd className="text-xs sm:text-sm text-green-600 font-medium mt-0.5">
                    {realtimeEnabled ? '● En vivo' : 'Manual'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Parqueadero Seleccionado - Vista Detallada */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Parqueadero Seleccionado</h3>
              <Link
                to="/parking"
                className="text-parkiu-600 hover:text-parkiu-700 text-sm font-medium flex items-center gap-1"
              >
                <LuEye className="w-4 h-4" />
                <span className="hidden sm:inline">Ver todos</span>
              </Link>
            </div>

            {/* Selector de parqueadero */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Parqueadero
              </label>
              <select
                value={selectedParkingLot}
                onChange={(e) => setSelectedParkingLot(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-parkiu-500 focus:border-parkiu-500 text-sm"
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
                      {lot.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Estadísticas del parqueadero seleccionado */}
            {realtimeStats.loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LuRefreshCw className="w-8 h-8 animate-spin text-parkiu-500 mb-3" />
                <span className="text-gray-500 text-sm">Cargando estadísticas...</span>
              </div>
            ) : hasError ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  {friendlyError || 'No se pudieron cargar las estadísticas en este momento.'}
                </p>
              </div>
            ) : realtimeStats.stats ? (
              <div className="space-y-4">
                {/* Ocupación Visual */}
                <div className="bg-gradient-to-br from-parkiu-50 to-blue-50 rounded-xl p-4 sm:p-5 border border-parkiu-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Ocupación Actual</span>
                    <span className="text-xl sm:text-2xl font-bold text-parkiu-600">
                      {realtimeStats.stats.occupancy_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-parkiu-500 to-parkiu-600 h-2.5 sm:h-3 rounded-full transition-all duration-500"
                      style={{ width: `${realtimeStats.stats.occupancy_rate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
                    <span>{realtimeStats.stats.occupied_spots} ocupados</span>
                    <span>{realtimeStats.stats.available_spots} disponibles</span>
                  </div>
                </div>

                {/* Grid de Métricas */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-100">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                      <LuDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-900">Hoy</span>
                    </div>
                    <div className="text-sm sm:text-base lg:text-lg font-bold text-purple-900">
                      {formatCurrency(realtimeStats.stats.revenue_today)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                      <LuTrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">Mes</span>
                    </div>
                    <div className="text-sm sm:text-base lg:text-lg font-bold text-blue-900">
                      {formatCurrency(realtimeStats.stats.revenue_month)}
                    </div>
                  </div>
                </div>

                {/* KPIs adicionales */}
                {kpis && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t">
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <LuClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Estadía Promedio</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatDuration(realtimeStats.stats.avg_stay_duration)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <LuDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-600">Por Espacio</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(kpis.revenuePerSpace)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Resumen del Sistema */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Sistema</h3>

            {/* Estadísticas Globales */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-parkiu-50 to-blue-50 rounded-lg border border-parkiu-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-parkiu-100 rounded-lg flex items-center justify-center">
                    <LuBuilding2 className="w-4 h-4 sm:w-5 sm:h-5 text-parkiu-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Parqueaderos</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{dashboardStats.aggregatedStats.totalParkings}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600 font-medium">{dashboardStats.aggregatedStats.activeParkings} activos</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <LuMapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Espacios Totales</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{dashboardStats.aggregatedStats.totalSpaces}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">{dashboardStats.aggregatedStats.occupiedSpaces} ocupados</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <LuDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Ingresos del Día</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(dashboardStats.aggregatedStats.todayRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* Estado del Sistema */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getHealthColor('good').split(' ')[1]}`} />
                    <span className="text-sm font-medium text-gray-700">Sistema Operativo</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {realtimeEnabled ? 'Actualización automática' : 'Modo manual'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Link
              to="/parking"
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-parkiu-50 to-blue-50 hover:from-parkiu-100 hover:to-blue-100 rounded-xl transition-all duration-200 group border border-parkiu-100"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-parkiu-500 group-hover:bg-parkiu-600 rounded-lg flex items-center justify-center transition-colors">
                <LuPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-xs sm:text-sm">Nuevo Parqueadero</div>
                <div className="text-xs text-gray-600 hidden sm:block">Crear parqueadero</div>
              </div>
            </Link>

            <Link
              to="/vehicles/entry"
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all duration-200 group border border-green-100"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 group-hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors">
                <LuMapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-xs sm:text-sm">Registrar Entrada</div>
                <div className="text-xs text-gray-600 hidden sm:block">Nuevo vehículo</div>
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all duration-200 group border border-purple-100"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-500 group-hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors">
                <LuFileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-xs sm:text-sm">Ver Reportes</div>
                <div className="text-xs text-gray-600 hidden sm:block">Análisis detallado</div>
              </div>
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 rounded-xl transition-all duration-200 group border border-gray-200"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-500 group-hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                <LuSettings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-xs sm:text-sm">Configuración</div>
                <div className="text-xs text-gray-600 hidden sm:block">Ajustes del sistema</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
