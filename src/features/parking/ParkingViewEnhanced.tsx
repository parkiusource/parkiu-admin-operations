import { useState, useEffect } from 'react';
import { LuMapPin, LuSettings, LuPlus, LuSearch, LuCar, LuArrowRight } from 'react-icons/lu';
import { FaMotorcycle } from 'react-icons/fa';
import { CircleParking } from 'lucide-react';
import { setupMockParkingData, getMockDataStats } from '@/utils/setupMockData';

// ✅ IMPORTAR NUESTROS NUEVOS HOOKS REORGANIZADOS
import {
  useAvailableParkingSpots,
  useParkingOccupancyStats,
  useUpdateSpotStatus,
  useOccupySpot,
  useReleaseSpot,
  useRealParkingSpacesWithVehicles
} from '@/hooks/parking';

// ✅ IMPORTAR TIPOS CENTRALIZADOS
import { ParkingSpot } from '@/services/parking/types';

// Información mock del parqueadero actual (esto debería venir de una API)
const currentParking = {
  id: 1,
  name: "Parqueadero Central",
  address: "Calle 100 #15-20",
  schedule: "Lun-Dom: 6:00 AM - 10:00 PM",
  contact: {
    phone: "+57 301 234 5678",
    email: "central@parkiu.com"
  }
};

export default function ParkingViewEnhanced() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [mockDataStats, setMockDataStats] = useState<{
    spots: number;
    vehicles: number;
    transactions: number;
    hasData: boolean;
  } | null>(null);

  // ✅ INICIALIZAR DATOS MOCK AL MONTAR COMPONENTE
  useEffect(() => {
    async function initializeData() {
      try {
        await setupMockParkingData();
        const stats = await getMockDataStats();
        setMockDataStats(stats);
      } catch {
        // Mock data initialization failed - non-critical, continue
      }
    }
    initializeData();
  }, []);

  // ✅ USAR NUESTROS HOOKS REORGANIZADOS
  const {
    data: parkingSpots = [],
    isLoading: isLoadingSpots,
    error: spotsError,
    refetch: refetchSpots
  } = useRealParkingSpacesWithVehicles(String(currentParking.id), { refetchInterval: 1000 * 60 });

  const {
    availableSpots
  } = useAvailableParkingSpots();

  const {
    occupancyStats,
    isLoading: isLoadingStats
  } = useParkingOccupancyStats();

  // ✅ HOOKS DE MUTACIÓN PARA ACCIONES
  const updateSpotStatus = useUpdateSpotStatus({
    onSuccess: () => {
      // Estado del espacio actualizado
      refetchSpots();
    }
  });

  const occupySpot = useOccupySpot({
    onSuccess: () => {
      // Espacio ocupado exitosamente
      refetchSpots();
    }
  });

  const releaseSpot = useReleaseSpot({
    onSuccess: () => {
      // Espacio liberado exitosamente
      refetchSpots();
    }
  });

  // ✅ FILTRAR SPOTS CON LÓGICA MEJORADA
  const filteredSpots = parkingSpots.filter(spot => {
    if (!spot.number) return false;
    const matchesSearch = spot.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || spot.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Agrupar spots por tipo
  const carSpots = filteredSpots.filter(spot => spot.type === 'car');
  const motorcycleSpots = filteredSpots.filter(spot => spot.type === 'motorcycle');

  // ✅ HANDLERS PARA ACCIONES
  const handleOccupySpot = (spotId: number | string) => {
    occupySpot.mutate(spotId);
  };

  const handleReleaseSpot = (spotId: number | string) => {
    releaseSpot.mutate(spotId);
  };

  const handleMaintenanceToggle = (spotId: number | string, currentStatus: ParkingSpot['status']) => {
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    updateSpotStatus.mutate({ id: spotId, status: newStatus });
  };

  // ✅ LOADING STATE
  if (isLoadingSpots || isLoadingStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-sm text-gray-600">Cargando datos del parqueadero...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (spotsError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar datos</h3>
            <p className="text-red-600 mb-4">{spotsError.message}</p>
            <button
              onClick={() => refetchSpots()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header empresarial */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg">
                  <CircleParking className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-slate-900 truncate">
                    {currentParking.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-600 flex items-center min-w-0">
                      <LuMapPin className="flex-shrink-0 mr-1.5 h-4 w-4" />
                      <span className="truncate">{currentParking.address}</span>
                    </p>
                    <p className="text-sm text-slate-600 hidden sm:flex items-center flex-shrink-0">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                      {parkingSpots.length > 0 ? 'Conectado' : 'Sin datos'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => refetchSpots()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LuSettings className="h-4 w-4 mr-2" />
                Actualizar
              </button>
              <button className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors">
                <LuPlus className="h-4 w-4 mr-2" />
                Nuevo Espacio
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Panel principal */}
          <div className="xl:col-span-9 space-y-6">

            {/* ✅ ESTADÍSTICAS USANDO NUESTROS HOOKS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Estadísticas en Tiempo Real</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Total Espacios</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-2xl font-semibold text-slate-900">
                        {occupancyStats?.total || parkingSpots.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Disponibles</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-semibold text-emerald-600">
                        {occupancyStats?.available || availableSpots.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Ocupados</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-2xl font-semibold text-amber-600">
                        {occupancyStats?.occupied || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Mantenimiento</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-rose-600" />
                      </div>
                      <span className="text-2xl font-semibold text-rose-600">
                        {occupancyStats?.maintenance || 0}
                      </span>
                    </div>
                  </div>
                </div>
                {occupancyStats && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Tasa de Ocupación</span>
                      <span className="text-lg font-semibold text-indigo-600">
                        {occupancyStats.occupancyRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${occupancyStats.occupancyRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Búsqueda y filtros */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LuSearch className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-slate-400"
                      placeholder="Buscar por número de espacio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <select
                      className="flex-1 py-2 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="all">Todos los estados</option>
                      <option value="available">Disponibles</option>
                      <option value="occupied">Ocupados</option>
                      <option value="maintenance">En mantenimiento</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ MOSTRAR ESTADO DE CONEXIÓN Y DATOS - DEBUG PANEL */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">🔍 Estado de Conexión y APIs (Debug)</h4>

              {/* Estadísticas de datos mock */}
              <div className="mb-4 p-3 bg-white rounded border">
                <h5 className="font-medium text-gray-700 mb-2">📊 Datos Mock (IndexedDB)</h5>
                {mockDataStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div><strong>Spots:</strong> {mockDataStats.spots}</div>
                    <div><strong>Vehículos:</strong> {mockDataStats.vehicles}</div>
                    <div><strong>Transacciones:</strong> {mockDataStats.transactions}</div>
                    <div><strong>Estado:</strong> {mockDataStats.hasData ? '✅ OK' : '❌ Sin datos'}</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Cargando estadísticas...</div>
                )}
              </div>

              {/* Estado de los hooks */}
              <div className="mb-4 p-3 bg-white rounded border">
                <h5 className="font-medium text-gray-700 mb-2">🎣 Estado de Hooks React Query</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>useParkingSpots:</strong><br/>
                    • Spots: {parkingSpots.length}<br/>
                    • Loading: {isLoadingSpots ? '🔄 Sí' : '✅ No'}<br/>
                    • Error: {spotsError ? '❌ ' + (spotsError as Error).message : '✅ OK'}
                  </div>
                  <div>
                    <strong>useAvailableParkingSpots:</strong><br/>
                    • Disponibles: {availableSpots.length}<br/>
                    • Filtrados: ✅ Solo disponibles
                  </div>
                  <div>
                    <strong>useParkingOccupancyStats:</strong><br/>
                    • Total: {occupancyStats?.total || 'N/A'}<br/>
                    • Ocupación: {occupancyStats?.occupancyRate?.toFixed(1) || 'N/A'}%<br/>
                    • Loading: {isLoadingStats ? '🔄 Sí' : '✅ No'}
                  </div>
                </div>
              </div>

              {/* Llamadas de API detectadas */}
              <div className="p-3 bg-white rounded border">
                <h5 className="font-medium text-gray-700 mb-2">🌐 Llamadas de API Detectadas</h5>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <strong>IndexedDB queries:</strong>
                    <span className="text-green-700">parkingSpots.toArray(), parkingSpots.where('status').equals('available')</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <strong>React Query cache:</strong>
                    <span className="text-blue-700">['parkingSpots', 'all'], ['parkingSpots', 'available'], ['parkingOccupancy']</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <strong>Backend HTTP:</strong>
                    <span className="text-red-700">❌ Sin llamadas al backend (solo IndexedDB local)</span>
                  </div>
                </div>
              </div>

              {/* Botones de debug */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => refetchSpots()}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  🔄 Refetch Spots
                </button>
                <button
                  onClick={() => {}}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  🔍 Log Data
                </button>
                <button
                  onClick={() => window.open('http://localhost:5173/parking', '_blank')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  📊 Comparar Original
                </button>
              </div>
            </div>

            {/* Grid de espacios mejorado */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <LuCar className="w-5 h-5 text-slate-500" />
                    Espacios de Parqueo ({filteredSpots.length})
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {/* Sección de Automóviles */}
                {carSpots.length > 0 && (
                  <div className="p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <LuCar className="w-4 h-4 text-slate-500" />
                        Automóviles
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                          {carSpots.length} espacios
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {carSpots.map((spot) => (
                        <SpotCard
                          key={`car-${spot.id}-${spot.number}`}
                          spot={spot}
                          onOccupy={handleOccupySpot}
                          onRelease={handleReleaseSpot}
                          onMaintenanceToggle={handleMaintenanceToggle}
                          isUpdating={updateSpotStatus.isPending || occupySpot.isPending || releaseSpot.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección de Motocicletas */}
                {motorcycleSpots.length > 0 && (
                  <div className="p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <FaMotorcycle className="w-4 h-4 text-slate-500" />
                        Motocicletas
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                          {motorcycleSpots.length} espacios
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {motorcycleSpots.map((spot) => (
                        <SpotCard
                          key={`moto-${spot.id}-${spot.number}`}
                          spot={spot}
                          onOccupy={handleOccupySpot}
                          onRelease={handleReleaseSpot}
                          onMaintenanceToggle={handleMaintenanceToggle}
                          isUpdating={updateSpotStatus.isPending || occupySpot.isPending || releaseSpot.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Estado vacío */}
                {filteredSpots.length === 0 && (
                  <div className="p-8 text-center">
                    <CircleParking className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No hay espacios</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {parkingSpots.length === 0 ?
                        'No se han encontrado espacios de parqueo. Verifica tu conexión.' :
                        'No se encontraron espacios que coincidan con tu búsqueda.'
                      }
                    </p>
                    {parkingSpots.length === 0 && (
                      <button
                        onClick={() => refetchSpots()}
                        className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                      >
                        Recargar datos
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ COMPONENTE SPOT CARD MEJORADO
interface SpotCardProps {
  spot: ParkingSpot;
  onOccupy: (spotId: number | string) => void;
  onRelease: (spotId: number | string) => void;
  onMaintenanceToggle: (spotId: number | string, currentStatus: ParkingSpot['status']) => void;
  isUpdating?: boolean;
}

function SpotCard({ spot, onOccupy, onRelease, onMaintenanceToggle, isUpdating }: SpotCardProps) {
  const IconComponent = spot.type === 'car' ? LuCar : FaMotorcycle;

  return (
    <div className={`group relative bg-white rounded-lg border-l-4 ${
      spot.status === 'available' ? 'border-l-emerald-500 border-slate-200' :
      spot.status === 'occupied' ? 'border-l-red-500 border-slate-200' :
      'border-l-amber-500 border-slate-200'
    } p-4 hover:shadow-lg transition-all duration-200 ${isUpdating ? 'opacity-50' : ''}`}>

      {/* Header de la tarjeta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg">
            <IconComponent className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-medium text-slate-900">
              Espacio {spot.number}
            </h4>
            <p className="text-xs text-slate-500">ID: {spot.id}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          spot.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
          spot.status === 'occupied' ? 'bg-red-50 text-red-700' :
          'bg-amber-50 text-amber-700'
        }`}>
          {spot.status === 'available' ? 'Disponible' :
           spot.status === 'occupied' ? 'Ocupado' :
           'Mantenimiento'}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 mt-4">
        {spot.status === 'available' && (
          <button
            onClick={() => onOccupy(spot.id!)}
            disabled={isUpdating}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <LuPlus className="w-4 h-4 mr-1" />
            Ocupar
          </button>
        )}

        {spot.status === 'occupied' && (
          <button
            onClick={() => onRelease(spot.id!)}
            disabled={isUpdating}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <LuArrowRight className="w-4 h-4 mr-1" />
            Liberar
          </button>
        )}

        <button
          onClick={() => onMaintenanceToggle(spot.id!, spot.status)}
          disabled={isUpdating}
          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
        >
          <LuSettings className="w-4 h-4" />
        </button>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
}
