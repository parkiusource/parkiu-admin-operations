import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuMapPin, LuSettings, LuPlus, LuSearch, LuCar, LuBike, LuArrowRight, LuLoader, LuChevronLeft, LuBuilding } from 'react-icons/lu';
import { CircleParking } from 'lucide-react';

// ✅ IMPORTAR MODALES PARA CREAR PARQUEADEROS Y ESPACIOS
import { CreateParkingLotModal } from '@/components/parking/CreateParkingLotModal';
import { CreateParkingSpaceModal } from '@/components/parking/CreateParkingSpaceModal';

// ✅ IMPORTAR HOOKS PARA BACKEND REAL
import {
  useParkingLots,
  useRealParkingSpaces,
  useUpdateRealParkingSpaceStatus
} from '@/hooks/parking';

// ✅ IMPORTAR TIPOS DEL BACKEND
import { ParkingSpot } from '@/services/parking/types';

export default function AdminParkingDashboard() {
  const { id: parkingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // ✅ Estado para modal de parqueaderos
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false); // ✅ Estado para modal de espacios

  // ✅ OBTENER PARKING LOTS REALES DEL ADMINISTRADOR
  const {
    parkingLots,
    isLoading: isLoadingLots,
    error: lotsError
  } = useParkingLots();

  // ✅ DETERMINAR QUE MOSTRAR SEGÚN LA RUTA
  const isListView = !parkingId; // Si no hay ID, mostrar lista
  const currentParking = parkingId
    ? parkingLots?.find(lot => lot.id === parkingId)
    : parkingLots?.[0]; // Fallback al primero si no hay ID específico

  // ✅ OBTENER ESPACIOS REALES DEL BACKEND
  const {
    data: parkingSpots = [],
    isLoading: isLoadingSpaces,
    error: spacesError,
    refetch: refetchSpaces
  } = useRealParkingSpaces(currentParking?.id, {
    enabled: !!currentParking?.id,
    refetchInterval: 1000 * 30 // Refrescar cada 30 segundos
  });
  const availableSpots = parkingSpots.filter(spot => spot.status === 'available');
  const occupiedSpots = parkingSpots.filter(spot => spot.status === 'occupied');
  const maintenanceSpots = parkingSpots.filter(spot => spot.status === 'maintenance');

  // ✅ ESTADÍSTICAS CALCULADAS EN TIEMPO REAL
  const occupancyStats = {
    total: parkingSpots.length,
    available: availableSpots.length,
    occupied: occupiedSpots.length,
    maintenance: maintenanceSpots.length,
    occupancyRate: parkingSpots.length > 0 ? (occupiedSpots.length / parkingSpots.length) * 100 : 0
  };

  // ✅ HOOKS DE MUTACIÓN REALES DEL BACKEND
  const updateSpotStatus = useUpdateRealParkingSpaceStatus({
    onSuccess: (updatedSpace) => {
      console.log(`✅ Espacio ${updatedSpace.number} actualizado exitosamente`);
      // Los datos se actualizan automáticamente via invalidateQueries
    },
    onError: (error) => {
      console.error('Error al actualizar espacio:', error);
    }
  });

  const occupySpot = {
    mutate: (spotId: string | number) => {
      const numericId = typeof spotId === 'string' ? parseInt(spotId.toString()) : spotId;
      updateSpotStatus.mutate({ spaceId: numericId, status: 'occupied' });
    },
    isPending: updateSpotStatus.isPending
  };

  const releaseSpot = {
    mutate: (spotId: string | number) => {
      const numericId = typeof spotId === 'string' ? parseInt(spotId.toString()) : spotId;
      updateSpotStatus.mutate({ spaceId: numericId, status: 'available' });
    },
    isPending: updateSpotStatus.isPending
  };

  const refetchSpots = () => {
    console.log('🔄 Refrescando espacios...');
    refetchSpaces();
  };

  // ✅ FILTRAR SPOTS CON DATOS REALES DEL BACKEND
  const filteredSpots = parkingSpots.filter(spot => {
    if (!spot.number) return false;
    const matchesSearch = spot.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || spot.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Agrupar spots por tipo
  const carSpots = filteredSpots.filter(spot => spot.type === 'car');
  const motorcycleSpots = filteredSpots.filter(spot => spot.type === 'motorcycle');
  const bicycleSpots = filteredSpots.filter(spot => spot.type === 'bicycle');

  // ✅ ESTADÍSTICAS FINALES (ya calculadas con datos reales)
  const finalOccupancyStats = occupancyStats;

  // ✅ HANDLERS PARA ACCIONES
  const handleOccupySpot = (spotId: number | string) => {
    occupySpot.mutate(spotId);
  };

  const handleReleaseSpot = (spotId: number | string) => {
    releaseSpot.mutate(spotId);
  };

  const handleMaintenanceToggle = (spotId: number | string, currentStatus: ParkingSpot['status']) => {
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    const numericId = typeof spotId === 'string' ? parseInt(spotId.toString()) : spotId;
    updateSpotStatus.mutate({ spaceId: numericId, status: newStatus });
  };

  // ✅ LOADING STATE
  if (isLoadingLots || (currentParking && isLoadingSpaces)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <LuLoader className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">
            {isLoadingLots ? 'Cargando parqueaderos...' : 'Cargando espacios...'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (lotsError || spacesError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar datos</h3>
            <p className="text-red-600 mb-4">
              {(lotsError as Error)?.message || (spacesError as Error)?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => {
                if (lotsError) window.location.reload();
                if (spacesError) refetchSpaces();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              {lotsError ? 'Recargar página' : 'Reintentar espacios'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ VISTA DE LISTA - MOSTRAR TODOS LOS PARQUEADEROS
  if (isListView) {
    if (!parkingLots || parkingLots.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <CircleParking className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-medium text-blue-800 mb-2">No tienes parqueaderos registrados</h3>
              <p className="text-blue-600 mb-4">
                Debes registrar al menos un parqueadero para comenzar
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Crear parqueadero
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ✅ LISTA DE PARQUEADEROS
    return (
      <>
        <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <LuBuilding className="w-8 h-8 text-blue-600" />
                  Mis Parqueaderos
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestiona todos tus parqueaderos desde un solo lugar
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <LuPlus className="w-4 h-4" />
                Nuevo Parqueadero
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingLots.map((parking) => (
              <div
                key={parking.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/parking/${parking.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {parking.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 flex items-center">
                        <LuMapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        {parking.address}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      parking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {parking.status === 'active' ? 'Activo' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Total Espacios</p>
                      <p className="text-lg font-semibold text-gray-900">{parking.total_spots}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tarifa/Hora</p>
                      <p className="text-lg font-semibold text-gray-900">${parking.price_per_hour}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {parking.opening_time} - {parking.closing_time}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/parking/${parking.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      Administrar
                      <LuArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* ✅ MODAL PARA CREAR PARQUEADEROS */}
        <CreateParkingLotModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newParkingLot) => {
            console.log('✅ Nuevo parqueadero creado:', newParkingLot);
            // El hook ya invalida las queries, así que la lista se actualizará automáticamente
          }}
        />
      </>
    );
  }

  // ✅ NO SE ENCONTRÓ EL PARQUEADERO ESPECÍFICO
  if (parkingId && !currentParking) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <CircleParking className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Parqueadero no encontrado</h3>
            <p className="text-red-600 mb-4">
              El parqueadero con ID "{parkingId}" no existe o no tienes acceso a él
            </p>
            <button
              onClick={() => navigate('/parking')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
            >
              <LuChevronLeft className="w-4 h-4" />
              Volver a mis parqueaderos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ VERIFICACIÓN FINAL DE CURRENTPARKING (para TypeScript)
  if (!currentParking) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <LuLoader className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Cargando parqueadero...</h3>
            <p className="text-gray-600">
              Por favor espera mientras cargamos la información
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50">
      {/* Header del parqueadero específico */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3 sm:px-6 lg:px-8">

          {/* ✅ BREADCRUMBS */}
          <div className="mb-4">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => navigate('/parking')}
                className="hover:text-gray-700 flex items-center gap-1"
              >
                <LuBuilding className="w-4 h-4" />
                Mis Parqueaderos
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">{currentParking.name}</span>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/parking')}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver a mis parqueaderos"
                >
                  <LuChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg">
                  <CircleParking className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-slate-900 truncate">
                    Panel de Control - {currentParking.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-600 flex items-center min-w-0">
                      <LuMapPin className="flex-shrink-0 mr-1.5 h-4 w-4" />
                      <span className="truncate">{currentParking.address}</span>
                    </p>
                    <p className="text-sm text-slate-600 hidden sm:flex items-center flex-shrink-0">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                      {currentParking.status === 'active' ? 'Activo' : 'Conectado'}
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
              <button
                onClick={() => setIsCreateSpaceModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
                disabled={!currentParking?.id}
              >
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

            {/* ✅ ESTADÍSTICAS DEL PARQUEADERO REAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">📊 {currentParking.name}</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Total Espacios</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 rounded-md">
                        <CircleParking className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-2xl font-semibold text-slate-900">
                        {currentParking.total_spots || finalOccupancyStats.total}
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
                        {finalOccupancyStats.available}
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
                        {finalOccupancyStats.occupied}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-600">Tarifa/Hora</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 rounded-md">
                        <span className="text-blue-600 text-sm font-bold">$</span>
                      </div>
                      <span className="text-2xl font-semibold text-blue-600">
                        {currentParking.price_per_hour || 0}
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

            {/* Grid de espacios */}
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
                          key={spot.id}
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
                        <LuBike className="w-4 h-4 text-slate-500" />
                        Motocicletas
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                          {motorcycleSpots.length} espacios
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {motorcycleSpots.map((spot) => (
                        <SpotCard
                          key={spot.id}
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

                {/* ✅ Sección de Bicicletas */}
                {bicycleSpots.length > 0 && (
                  <div className="p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <LuBike className="w-4 h-4 text-green-500" />
                        Bicicletas
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                          {bicycleSpots.length} espacios
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bicycleSpots.map((spot) => (
                        <SpotCard
                          key={spot.id}
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
                        'No se han encontrado espacios de parqueo en IndexedDB.' :
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

          {/* Panel lateral de información del parqueadero */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-[88px]">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="p-1 bg-indigo-50 rounded">
                    <LuSettings className="w-4 h-4 text-indigo-600" />
                  </div>
                  Información del Parqueadero
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">Nombre</h4>
                    <p className="text-slate-900">{currentParking.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">Dirección</h4>
                    <p className="text-slate-900">{currentParking.address}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">Horarios</h4>
                    <p className="text-slate-900">
                      {currentParking.opening_time || '08:00'} - {currentParking.closing_time || '20:00'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">Contacto</h4>
                    <p className="text-slate-900">{currentParking.contact_name || 'Sin contacto'}</p>
                    <p className="text-slate-600 text-sm">{currentParking.contact_phone || 'Sin teléfono'}</p>
                  </div>
                  {currentParking.description && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700">Descripción</h4>
                      <p className="text-slate-900 text-sm">{currentParking.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ✅ MODAL PARA CREAR PARQUEADEROS */}
      <CreateParkingLotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newParkingLot) => {
          console.log('✅ Nuevo parqueadero creado:', newParkingLot);
          // El hook ya invalida las queries, así que la lista se actualizará automáticamente
        }}
      />

      {/* ✅ MODAL PARA CREAR ESPACIOS DE PARQUEO */}
      {currentParking?.id && (
        <CreateParkingSpaceModal
          isOpen={isCreateSpaceModalOpen}
          onClose={() => setIsCreateSpaceModalOpen(false)}
          onSuccess={(newSpace) => {
            console.log('✅ Nuevo espacio creado:', newSpace);
            // El hook ya invalida las queries, así que la lista se actualizará automáticamente
            refetchSpaces();
          }}
          parkingLotId={parseInt(currentParking.id)}
        />
      )}
    </>
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
  const IconComponent = spot.type === 'car' ? LuCar : LuBike;

  return (
    <div className={`group relative bg-white rounded-lg border-l-4 ${
      spot.status === 'available' ? 'border-l-emerald-500 border-slate-200' :
      spot.status === 'occupied' ? 'border-l-amber-500 border-slate-200' :
      'border-l-rose-500 border-slate-200'
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
          spot.status === 'occupied' ? 'bg-amber-50 text-amber-700' :
          'bg-rose-50 text-rose-700'
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
          <LuLoader className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      )}
    </div>
  );
}
