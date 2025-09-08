import { useState, useEffect } from 'react';
import { ParkiuDB } from '../../db/schema';
import { ParkingSpot, Vehicle } from '../../db/schema';
import { LuMapPin, LuSettings, LuPlus, LuSearch, LuCar, LuArrowRight } from 'react-icons/lu';
import { FaMotorcycle } from 'react-icons/fa';
import { CircleParking } from 'lucide-react';

interface ParkingSpotWithVehicle extends ParkingSpot {
  vehicle?: Vehicle;
}

// Mock del parqueadero actual
const currentParking = {
  id: 1,
  name: "Parqueadero Central",
  address: "Calle 100 #15-20",
  schedule: "Lun-Dom: 6:00 AM - 10:00 PM",
  contact: {
    phone: "+57 301 234 5678",
    email: "central@parkiu.com"
  },
  totalSpots: 6,
  availableSpots: 3,
  occupiedSpots: 2,
  maintenanceSpots: 1
};

// Datos mock para inicialización
const mockParkingSpots: Partial<ParkingSpot>[] = [
  { number: "A1", type: "car", status: "available" },
  { number: "A2", type: "car", status: "occupied" },
  { number: "A3", type: "motorcycle", status: "available" },
  { number: "B1", type: "car", status: "maintenance" },
  { number: "B2", type: "car", status: "occupied" },
  { number: "M1", type: "motorcycle", status: "available" },
];

const mockVehicles: Partial<Vehicle>[] = [
  {
    plate: "ABC123",
    type: "car",
    status: "parked",
    entryTime: new Date(),
    parkingSpotId: 2 // Corresponderá al spot A2
  },
  {
    plate: "XYZ789",
    type: "car",
    status: "parked",
    entryTime: new Date(),
    parkingSpotId: 5 // Corresponderá al spot B2
  }
];

// Nuevo tipo para las actividades
interface Activity {
  id: number;
  type: 'entry' | 'exit' | 'payment';
  plate: string;
  spot?: string;
  amount?: number;
  timestamp: Date;
}

// Mock de actividades recientes
const mockActivities: Activity[] = [
  {
    id: 1,
    type: 'entry',
    plate: 'ABC123',
    spot: 'A6',
    timestamp: new Date(Date.now() - 5 * 60000), // 5 minutos atrás
  },
  {
    id: 2,
    type: 'payment',
    plate: 'XYZ789',
    amount: 12000,
    timestamp: new Date(Date.now() - 12 * 60000), // 12 minutos atrás
  },
  {
    id: 3,
    type: 'exit',
    plate: 'XYZ789',
    spot: 'B3',
    timestamp: new Date(Date.now() - 12 * 60000), // 12 minutos atrás
  },
  {
    id: 4,
    type: 'entry',
    plate: 'DEF456',
    spot: 'C2',
    timestamp: new Date(Date.now() - 25 * 60000), // 25 minutos atrás
  },
  {
    id: 5,
    type: 'payment',
    plate: 'GHI789',
    amount: 8000,
    timestamp: new Date(Date.now() - 45 * 60000), // 45 minutos atrás
  },
];

export default function ParkingView() {
  const [spots, setSpots] = useState<ParkingSpotWithVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const db = new ParkiuDB();

    async function initializeMockData() {
      // Verificar si ya hay datos
      const existingSpots = await db.parkingSpots.count();

      if (existingSpots === 0) {
        // Inicializar espacios de parqueo
        const spotIds = await db.parkingSpots.bulkAdd(
          mockParkingSpots as ParkingSpot[],
          { allKeys: true }
        );

        // Actualizar los IDs de los vehículos mock con los IDs reales de los espacios
        const vehiclesWithUpdatedSpots = mockVehicles.map((vehicle, index) => ({
          ...vehicle,
          parkingSpotId: spotIds[index * 2 + 1] // Asignar a A2 y B2
        }));

        // Inicializar vehículos
        await db.vehicles.bulkAdd(vehiclesWithUpdatedSpots as Vehicle[]);
      }
    }

    async function loadParkingData() {
      try {
        await initializeMockData();

        // Obtener todos los espacios
        const parkingSpots = await db.parkingSpots.toArray();

        // Obtener vehículos estacionados
        const parkedVehicles = await db.vehicles
          .where('status')
          .equals('parked')
          .toArray();

        // Combinar datos
        const spotsWithVehicles = parkingSpots.map(spot => ({
          ...spot,
          vehicle: parkedVehicles.find(v => v.parkingSpotId === spot.id),
        }));

        setSpots(spotsWithVehicles);
      } catch (error) {
        console.error('Error al cargar datos del parqueadero:', error);
      } finally {
        setLoading(false);
      }
    }

    loadParkingData();

    // Cargar actividades mock
    setActivities(mockActivities);
  }, []);

  // Filtrar spots basado en búsqueda y estado
  const filteredSpots = spots.filter(spot => {
    const matchesSearch = spot.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || spot.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Agrupar spots por tipo de vehículo
  const carSpots = filteredSpots.filter(spot => spot.type === 'car');
  const motorcycleSpots = filteredSpots.filter(spot => spot.type === 'motorcycle');

  // Función para formatear el tiempo transcurrido
  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) {
      return `hace ${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return `hace ${hours}h`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
                      Activo
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                <LuSettings className="h-4 w-4 mr-2" />
                Configuración
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
            {/* Stats y búsqueda */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stats principales */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Total Espacios</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-2xl font-semibold text-slate-900">{currentParking.totalSpots}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Disponibles</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-semibold text-emerald-600">{currentParking.availableSpots}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Ocupados</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-2xl font-semibold text-amber-600">{currentParking.occupiedSpots}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Mantenimiento</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-rose-600" />
                      </div>
                      <span className="text-2xl font-semibold text-rose-600">{currentParking.maintenanceSpots}</span>
                    </div>
                  </div>
                </div>
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
                      placeholder="Buscar por número de espacio o placa..."
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
                    <button className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                      <LuSettings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de espacios */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <LuCar className="w-5 h-5 text-slate-500" />
                    Espacios de Parqueo
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600 mr-2">
                      <span className="hidden sm:inline">Vista:</span>
                      <button className="px-2 py-1 rounded bg-slate-100 text-slate-900 font-medium">
                        Grid
                      </button>
                    </div>
                    <button className="inline-flex items-center px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">
                      <LuSettings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {/* Sección de Automóviles */}
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
                      <div
                        key={spot.id}
                        className={`group relative bg-white rounded-lg border-l-4 ${
                          spot.status === 'available' ? 'border-l-emerald-500 border-slate-200' :
                          spot.status === 'occupied' ? 'border-l-amber-500 border-slate-200' :
                          'border-l-rose-500 border-slate-200'
                        } p-4 hover:shadow-lg transition-all duration-200`}
                      >
                        {/* Header de la tarjeta */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`flex-shrink-0 p-2 rounded-lg ${
                              spot.type === 'car' ? 'bg-indigo-50' : 'bg-violet-50'
                            }`}>
                              <LuCar className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-medium text-slate-900">
                                Espacio {spot.number}
                              </h4>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            spot.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                            spot.status === 'occupied' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {spot.status === 'available' ? 'Disponible' :
                             spot.status === 'occupied' ? 'Ocupado' :
                             'Mantenimiento'}
                          </span>
                        </div>

                        {/* Contenido principal */}
                        {spot.vehicle ? (
                          <div className="space-y-3">
                            {/* Información del vehículo */}
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900">
                                  Placa: {spot.vehicle.plate}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Ingreso: {new Date(spot.vehicle.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-slate-700">Tiempo</span>
                                <span className="text-sm font-medium text-indigo-600">2h 30m</span>
                              </div>
                            </div>

                            {/* Barra de progreso */}
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 flex items-center justify-center">
                            <p className="text-sm text-slate-500">Espacio libre</p>
                          </div>
                        )}

                        {/* Barra de acciones */}
                        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gradient-to-t from-white via-white">
                          <div className="flex items-center justify-end gap-2">
                            {spot.status === 'available' && (
                              <button className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                <LuPlus className="w-4 h-4 mr-1" />
                                Registrar entrada
                              </button>
                            )}
                            {spot.status === 'occupied' && (
                              <>
                                <button className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                  <span className="font-medium mr-1">$</span>
                                  Cobrar
                                </button>
                                <button className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                                  <LuArrowRight className="w-4 h-4 mr-1" />
                                  Registrar salida
                                </button>
                              </>
                            )}
                            <button className="inline-flex items-center px-2 py-1.5 text-sm font-medium rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                              <LuSettings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección de Motocicletas */}
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
                      <div
                        key={spot.id}
                        className={`group relative bg-white rounded-lg border-l-4 ${
                          spot.status === 'available' ? 'border-l-emerald-500 border-slate-200' :
                          spot.status === 'occupied' ? 'border-l-amber-500 border-slate-200' :
                          'border-l-rose-500 border-slate-200'
                        } p-4 hover:shadow-lg transition-all duration-200`}
                      >
                        {/* Header de la tarjeta */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`flex-shrink-0 p-2 rounded-lg ${
                              spot.type === 'car' ? 'bg-indigo-50' : 'bg-violet-50'
                            }`}>
                              <FaMotorcycle className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-medium text-slate-900">
                                Espacio {spot.number}
                              </h4>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            spot.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                            spot.status === 'occupied' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {spot.status === 'available' ? 'Disponible' :
                             spot.status === 'occupied' ? 'Ocupado' :
                             'Mantenimiento'}
                          </span>
                        </div>

                        {/* Contenido principal */}
                        {spot.vehicle ? (
                          <div className="space-y-3">
                            {/* Información del vehículo */}
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900">
                                  Placa: {spot.vehicle.plate}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Ingreso: {new Date(spot.vehicle.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-slate-700">Tiempo</span>
                                <span className="text-sm font-medium text-indigo-600">2h 30m</span>
                              </div>
                            </div>

                            {/* Barra de progreso */}
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 flex items-center justify-center">
                            <p className="text-sm text-slate-500">Espacio libre</p>
                          </div>
                        )}

                        {/* Barra de acciones */}
                        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gradient-to-t from-white via-white">
                          <div className="flex items-center justify-end gap-2">
                            {spot.status === 'available' && (
                              <button className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                <LuPlus className="w-4 h-4 mr-1" />
                                Registrar entrada
                              </button>
                            )}
                            {spot.status === 'occupied' && (
                              <>
                                <button className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                  <span className="font-medium mr-1">$</span>
                                  Cobrar
                                </button>
                                <button className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                                  <LuArrowRight className="w-4 h-4 mr-1" />
                                  Registrar salida
                                </button>
                              </>
                            )}
                            <button className="inline-flex items-center px-2 py-1.5 text-sm font-medium rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                              <LuSettings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel lateral de actividad */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-[88px]">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="p-1 bg-indigo-50 rounded">
                    <LuArrowRight className="w-4 h-4 text-indigo-600" />
                  </div>
                  Actividad Reciente
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-5">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                        activity.type === 'entry' ? 'bg-indigo-50' :
                        activity.type === 'payment' ? 'bg-emerald-50' :
                        'bg-amber-50'
                      }`}>
                        {activity.type === 'entry' && (
                          <LuCar className="w-5 h-5 text-indigo-600" />
                        )}
                        {activity.type === 'payment' && (
                          <span className="text-emerald-600 text-base font-semibold">$</span>
                        )}
                        {activity.type === 'exit' && (
                          <LuArrowRight className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {activity.type === 'entry' && 'Entrada de vehículo'}
                            {activity.type === 'payment' && 'Pago recibido'}
                            {activity.type === 'exit' && 'Salida de vehículo'}
                          </p>
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {getTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          <span className="truncate">{activity.plate}</span>
                          {activity.spot && (
                            <span className="mx-1.5 text-slate-400">•</span>
                          )}
                          {activity.spot && `Espacio ${activity.spot}`}
                          {activity.amount && (
                            <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                              ${activity.amount.toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
