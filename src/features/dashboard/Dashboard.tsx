import { useEffect, useState } from 'react';
import { LuCar, LuMapPin, LuTrendingUp, LuUsers } from 'react-icons/lu';
import { CircleParking } from 'lucide-react';
import { ParkingMap } from './ParkingMap';
import { mockParkingSpots } from './mockParkingSpots';

interface ParkingSpot {
  id: number;
  status: 'available' | 'occupied' | string;
}

interface DashboardStats {
  totalVehicles: number;
  availableSpots: number;
  occupiedSpots: number;
  todayTransactions: number;
}

// Datos simulados para las métricas (fallback)
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
  const [metrics, setMetrics] = useState(mockMetrics);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Import dinámico solo si existe el archivo y es entorno local
        const dbModule = await import('../../db/schema');
        const ParkiuDB = dbModule.ParkiuDB;
        const db = new ParkiuDB();
        const [
          vehicles,
          spots,
          transactions
        ] = await Promise.all([
          db.vehicles?.where?.('status').equals('parked').count() ?? 0,
          db.parkingSpots?.toArray?.() ?? [],
          db.transactions?.where?.('entryTime')
            .between(
              new Date(new Date().setHours(0, 0, 0, 0)),
              new Date(new Date().setHours(23, 59, 59, 999))
            )
            .count() ?? 0
        ]);
        const availableSpots = (spots as ParkingSpot[]).filter((spot) => spot.status === 'available').length;
        const occupiedSpots = (spots as ParkingSpot[]).filter((spot) => spot.status === 'occupied').length;
        if (isMounted) {
          setStats({
            totalVehicles: vehicles,
            availableSpots,
            occupiedSpots,
            todayTransactions: transactions,
          });
        }
        // Aquí podrías calcular weeklyStats y popularHours reales si tienes datos
      } catch {
        // Si falla el import dinámico o la DB, usar mock
        setStats({
          totalVehicles: 25,
          availableSpots: 15,
          occupiedSpots: 10,
          todayTransactions: 30,
        });
        setMetrics(mockMetrics);
        // Opcional: console.warn('Fallo la carga de datos reales, usando mock');
      }
    })();
    return () => { isMounted = false; };
  }, []);

  return (
    <>
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

      {/* Visualizador tipo mapa */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapa de Parqueadero</h3>
        <ParkingMap spots={mockParkingSpots} onSpotClick={(spot) => alert(`Espacio ${spot.number}: ${spot.status}`)} />
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Occupancy Chart */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary">Ocupación Semanal</h3>
            <div className="flex items-center space-x-2 text-sm text-muted">
              <LuTrendingUp className="w-4 h-4" />
              <span>+12% vs semana anterior</span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {metrics.weeklyStats.map((stat) => (
              <div key={stat.day} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary/10 rounded-t-lg transition-all duration-300 hover:bg-primary/20"
                  style={{ height: `${stat.value}%` }}
                />
                <span className="mt-2 text-xs text-muted">{stat.day}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Popular Hours */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary">Horas Populares</h3>
            <div className="flex items-center space-x-2 text-sm text-muted">
              <LuUsers className="w-4 h-4" />
              <span>Promedio diario</span>
            </div>
          </div>
          <div className="space-y-4">
            {metrics.popularHours.map((hour) => (
              <div key={hour.hour} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{hour.hour}</span>
                  <span className="text-secondary font-medium">{hour.occupancy}%</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
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
          <h3 className="text-lg leading-6 font-medium text-secondary">
            Acciones Rápidas
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              className="btn"
              onClick={() => alert('Registrar Entrada (lógica pendiente)')}
            >
              Registrar Entrada
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => alert('Registrar Salida (lógica pendiente)')}
            >
              Registrar Salida
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => alert('Buscar Vehículo (lógica pendiente)')}
            >
              Buscar Vehículo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
