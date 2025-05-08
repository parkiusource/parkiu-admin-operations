import { useEffect, useState } from 'react';
import { LuCar, LuMapPin, LuTrendingUp, LuUsers } from 'react-icons/lu';
import { CircleParking } from 'lucide-react';

interface DashboardStats {
  totalVehicles: number;
  availableSpots: number;
  occupiedSpots: number;
  todayTransactions: number;
}

// Datos simulados para las métricas (temporal hasta tener el backend)
const mockMetrics = {
  weeklyStats: [
    { day: 'Lun', value: 85 },
    { day: 'Mar', value: 92 },
    { day: 'Mie', value: 78 },
    { day: 'Jue', value: 95 },
    { day: 'Vie', value: 88 },
    { day: 'Sab', value: 72 },
    { day: 'Dom', value: 65 },
  ],
  popularHours: [
    { hour: '8:00', occupancy: 75 },
    { hour: '12:00', occupancy: 90 },
    { hour: '16:00', occupancy: 85 },
    { hour: '20:00', occupancy: 60 },
  ],
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableSpots: 0,
    occupiedSpots: 0,
    todayTransactions: 0,
  });

  // TODO: Reemplazar con llamadas reales al backend
  useEffect(() => {
    // Simulación de carga de datos
    const loadStats = async () => {
      // Aquí irían las llamadas al backend
      setStats({
        totalVehicles: 25,
        availableSpots: 15,
        occupiedSpots: 10,
        todayTransactions: 30,
      });
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Vehículos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LuCar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Vehículos en Parqueadero
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalVehicles}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Espacios Disponibles */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LuMapPin className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Espacios Disponibles
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.availableSpots}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Espacios Ocupados */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CircleParking className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Espacios Ocupados
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.occupiedSpots}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Transacciones Hoy */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LuTrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Transacciones Hoy
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.todayTransactions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Occupancy Chart */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ocupación Semanal</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <LuTrendingUp className="w-4 h-4" />
              <span>+12% vs semana anterior</span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {mockMetrics.weeklyStats.map((stat) => (
              <div key={stat.day} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-100 rounded-t-lg transition-all duration-300 hover:bg-blue-200"
                  style={{ height: `${stat.value}%` }}
                />
                <span className="mt-2 text-xs text-gray-500">{stat.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Hours */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Horas Populares</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <LuUsers className="w-4 h-4" />
              <span>Promedio diario</span>
            </div>
          </div>
          <div className="space-y-4">
            {mockMetrics.popularHours.map((hour) => (
              <div key={hour.hour} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{hour.hour}</span>
                  <span className="text-gray-900 font-medium">{hour.occupancy}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${hour.occupancy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Acciones Rápidas
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {/* TODO: Implementar registro de entrada */}}
            >
              Registrar Entrada
            </button>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {/* TODO: Implementar registro de salida */}}
            >
              Registrar Salida
            </button>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {/* TODO: Implementar búsqueda */}}
            >
              Buscar Vehículo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
