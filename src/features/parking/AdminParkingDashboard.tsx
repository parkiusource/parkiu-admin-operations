import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuMapPin, LuSettings, LuPlus, LuSearch, LuCar, LuArrowRight, LuLoader, LuChevronLeft, LuBuilding, LuTriangle, LuKeyboard } from 'react-icons/lu';
import { FaMotorcycle } from 'react-icons/fa';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/common/Dialog';
import { Input } from '@/components/common/Input';
import { QuickVehicleOperations } from '@/components/parking/QuickVehicleOperations';
import { KeyboardShortcutsHelp } from '@/components/common/KeyboardShortcutsHelp';
import { useParkingOperationShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CircleParking } from 'lucide-react';

// ✅ DECLARACIÓN GLOBAL PARA OPERACIONES RÁPIDAS
declare global {
  interface Window {
    quickOperations?: {
      openEntry: () => void;
      openExit: () => void;
      openSearch: () => void;
      close: () => void;
      focusPlateInput: () => void;
    };
  }
}

// ✅ IMPORTAR MODALES PARA CREAR PARQUEADEROS Y ESPACIOS
import { CreateParkingLotModal } from '@/components/parking/CreateParkingLotModal';
import { CreateParkingSpaceModal } from '@/components/parking/CreateParkingSpaceModal';
import { ParkingLotMap } from '@/components/parking/ParkingLotMap';

// ✅ IMPORTAR HOOKS PARA BACKEND REAL
import {
  useParkingLots,
  useRealParkingSpacesWithVehicles,
  useUpdateRealParkingSpaceStatus
} from '@/hooks/parking';
import { useParkingLotPricing } from '@/api/hooks/useSettingsData';
import { useAdminProfileStatus } from '@/hooks/useAdminProfileCentralized';

// ✅ IMPORTAR TIPOS DEL BACKEND
import { ParkingSpot } from '@/services/parking/types';

// ✅ IMPORTAR COMPONENTE DE CARD CON DATOS REALES
import { ParkingLotCard } from './components/ParkingLotCard';

// ✅ IMPORTAR HOOK PARA ESTADÍSTICAS REALES DEL OVERVIEW
import { useRealParkingOverview } from './hooks/useRealParkingOverview';

// ✅ IMPORTAR COMPONENTES MEJORADOS PARA VISTA DETALLADA
import { PricingPanel } from './components/PricingPanel';
import { ParkingGeneralInfo } from './components/ParkingGeneralInfo';

// Función movida a ParkingLotCard.tsx

export default function AdminParkingDashboard() {
  const { id: parkingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // ✅ Estado para modal de parqueaderos
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false); // ✅ Estado para modal de espacios
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false); // ✅ Estado para ayuda de atajos

  // ✅ OBTENER PARKING LOTS REALES DEL ADMINISTRADOR
  const {
    parkingLots,
    isLoading: isLoadingLots,
    error: lotsError
  } = useParkingLots();

  // ✅ INFO DE PERFIL PARA GATING DE UI
  const { profile } = useAdminProfileStatus();
  const role = profile?.role || '';
  const isAdminRole = role === 'global_admin' || role === 'local_admin';
  const isTempAdmin = role === 'temp_admin';

  // ✅ OBTENER ESTADÍSTICAS REALES DEL OVERVIEW
  const overviewStats = useRealParkingOverview(parkingLots);

  // ✅ CONFIGURAR ATAJOS DE TECLADO PARA OPERACIONES RÁPIDAS
  const { getShortcutsHelp, formatShortcut } = useParkingOperationShortcuts({
    onOpenVehicleEntry: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Entrada rápida activada - window.quickOperations:', window.quickOperations);
      }
      if (window.quickOperations) {
        window.quickOperations.openEntry();
      } else {
        console.warn('⚠️ window.quickOperations no está disponible para entrada');
      }
    },
    onOpenVehicleExit: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Salida rápida activada - window.quickOperations:', window.quickOperations);
      }
      if (window.quickOperations) {
        window.quickOperations.openExit();
      } else {
        console.warn('⚠️ window.quickOperations no está disponible para salida');
      }
    },
    onOpenSearch: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Búsqueda rápida activada - window.quickOperations:', window.quickOperations);
      }
      if (window.quickOperations) {
        window.quickOperations.openSearch();
      } else {
        console.warn('⚠️ window.quickOperations no está disponible para búsqueda');
      }
    },
    onRefresh: () => {
      window.location.reload();
    },
    onToggleHelp: () => {
      setShowKeyboardHelp(!showKeyboardHelp);
    },
    onFocusPlateInput: () => {
      if (window.quickOperations) {
        window.quickOperations.focusPlateInput();
      }
    },
  });

  // ✅ OPTIMIZACIÓN: Memoizar filtros costosos
  const filteredParkingLots = useMemo(() => {
    if (!searchTerm) return parkingLots;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return parkingLots.filter(parking =>
      parking.name.toLowerCase().includes(lowerSearchTerm) ||
      parking.address.toLowerCase().includes(lowerSearchTerm)
    );
  }, [parkingLots, searchTerm]);

  // ✅ DETERMINAR QUE MOSTRAR SEGÚN LA RUTA
  const isListView = !parkingId; // Si no hay ID, mostrar lista
  const baseParkingLot = parkingId
    ? parkingLots?.find(lot => lot.id === parkingId)
    : null; // No necesitamos fallback para vista de lista

  // ✅ OBTENER TARIFAS ACTUALIZADAS DEL ENDPOINT ESPECÍFICO
  const { data: pricingData } = useParkingLotPricing(parkingId || null);

  // ✅ COMBINAR DATOS DEL PARQUEADERO CON TARIFAS ACTUALIZADAS
  const currentParking = baseParkingLot && pricingData
    ? { ...baseParkingLot, ...pricingData }
    : baseParkingLot;

  // ✅ REDIRIGIR SI EL :id NO PERTENECE A LOS LOTS DEL USUARIO
  useEffect(() => {
    if (!parkingId) return;
    if (isLoadingLots) return;
    const belongs = parkingLots.some(lot => lot.id === parkingId);
    if (!belongs) {
      if (parkingLots.length > 0) {
        navigate(`/parking/${parkingLots[0].id}`, { replace: true });
      } else {
        navigate('/parking', { replace: true });
      }
    }
  }, [parkingId, parkingLots, isLoadingLots, navigate]);

  // ✅ OBTENER ESPACIOS REALES DEL BACKEND - SOLO para vista individual
  const {
    data: parkingSpots = [],
    isLoading: isLoadingSpaces,
    error: spacesError,
    refetch: refetchSpaces
  } = useRealParkingSpacesWithVehicles(currentParking?.id, {
    enabled: !isListView && !!currentParking?.id,
    refetchInterval: 1000 * 60 // Refrescar cada minuto
  });
  // ✅ OPTIMIZACIÓN: Memoizar cálculos costosos para evitar re-renders innecesarios
  const occupancyStats = useMemo(() => {
    const available = parkingSpots.filter(spot => spot.status === 'available');
    const occupied = parkingSpots.filter(spot => spot.status === 'occupied');
    const maintenance = parkingSpots.filter(spot => spot.status === 'maintenance');

    return {
      total: parkingSpots.length,
      available: available.length,
      occupied: occupied.length,
      maintenance: maintenance.length,
      occupancyRate: parkingSpots.length > 0 ? (occupied.length / parkingSpots.length) * 100 : 0
    };
  }, [parkingSpots]);

  // ✅ HOOKS DE MUTACIÓN REALES DEL BACKEND
  const updateSpotStatus = useUpdateRealParkingSpaceStatus({
    onSuccess: () => {
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
  if (isLoadingLots || (!isListView && currentParking && isLoadingSpaces)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <LuLoader className="h-12 w-12 animate-spin text-parkiu-600" />
          <p className="text-sm text-gray-600">
            {isLoadingLots ? 'Cargando parqueaderos...' : 'Cargando espacios...'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (lotsError || (!isListView && spacesError)) {
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
            <div className="bg-parkiu-50 border border-parkiu-200 rounded-lg p-6">
              <CircleParking className="mx-auto h-12 w-12 text-parkiu-600 mb-4" />
              <h3 className="text-lg font-medium text-parkiu-800 mb-2">No tienes parqueaderos registrados</h3>
              <p className="text-parkiu-600 mb-4">
                Debes registrar al menos un parqueadero para comenzar
              </p>
              {isAdminRole && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-parkiu-600 text-white px-4 py-2 rounded-lg hover:bg-parkiu-700"
                >
                  Crear parqueadero
                </button>
              )}
              {/* Modal debe existir en este branch para que el botón funcione en estado vacío */}
              <CreateParkingLotModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {}}
              />
            </div>
          </div>
        </div>
      );
    }

    // ✅ LISTA DE PARQUEADEROS MEJORADA
    return (
      <>
        <div className="min-h-screen bg-slate-50">
          {isTempAdmin && (
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
                <span className="font-semibold">Cuenta en verificación.</span> Tu parqueadero estará inactivo hasta la aprobación.
              </div>
            </div>
          )}
          {/* Header elegante y limpio */}
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-6">
                {/* Título y descripción */}
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-parkiu-600 rounded-xl shadow-sm">
                    <LuBuilding className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                      Mis Parqueaderos
                    </h1>
                    <p className="text-slate-600 text-base md:text-lg">
                      Gestiona todos tus parqueaderos desde un solo lugar
                    </p>
                  </div>
                </div>

                {/* Estadísticas y acciones en layout separado */}
                <div className="flex flex-col xl:flex-row gap-6">
                  <div className="flex-1">
                    {/* Estadísticas reales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                    <div className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200 shadow-sm min-w-0">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 bg-slate-100 rounded-lg flex-shrink-0">
                          <LuBuilding className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs lg:text-sm text-slate-600 truncate">Total</p>
                          <p className="text-lg lg:text-xl font-bold text-slate-900">{overviewStats.totalParkingLots}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200 shadow-sm min-w-0">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                          <div className="w-4 h-4 lg:w-5 lg:h-5 bg-emerald-500 rounded-full"></div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs lg:text-sm text-slate-600 truncate">Activos</p>
                          <p className="text-lg lg:text-xl font-bold text-slate-900">
                            {overviewStats.activeParkingLots}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200 shadow-sm min-w-0">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 bg-slate-100 rounded-lg flex-shrink-0">
                          <LuMapPin className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-xs lg:text-sm text-slate-600 truncate">Espacios</p>
                            {overviewStats.loadingSpaces && (
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                            )}
                            {!overviewStats.loadingSpaces && overviewStats.hasRealSpaceData && (
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Datos reales"></div>
                            )}
                          </div>
                          <p className="text-lg lg:text-xl font-bold text-slate-900">
                            {overviewStats.totalSpaces}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200 shadow-sm min-w-0">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 bg-slate-100 rounded-lg flex-shrink-0">
                          <span className="text-slate-600 text-sm lg:text-lg font-bold">$</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs lg:text-sm text-slate-600 truncate">Promedio</p>
                          <p className="text-lg lg:text-xl font-bold text-slate-900">
                            ${overviewStats.averagePrice}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Acciones del header */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative">
                      <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Buscar parqueaderos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-parkiu-500 focus:border-parkiu-500 w-full sm:w-72"
                      />
                    </div>
                    {isAdminRole && (
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-parkiu-600 hover:bg-parkiu-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm whitespace-nowrap"
                      >
                        <LuPlus className="w-5 h-5" />
                        Nuevo Parqueadero
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de parqueaderos con filtro */}
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {isLoadingLots ? (
              /* Loading state mejorado */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="animate-pulse">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded-lg w-full"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="h-12 bg-gray-200 rounded-lg"></div>
                        <div className="h-12 bg-gray-200 rounded-lg"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : lotsError ? (
              /* Error state mejorado */
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <LuSettings className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar parqueaderos</h3>
                <p className="text-gray-600 mb-6">Hubo un problema al obtener tus parqueaderos.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-parkiu-600 text-white px-6 py-2 rounded-lg hover:bg-parkiu-700"
                >
                  Reintentar
                </button>
              </div>
            ) : parkingLots.length === 0 ? (
              /* Empty state mejorado */
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-parkiu-100 rounded-full flex items-center justify-center mb-6">
                  <LuBuilding className="w-12 h-12 text-parkiu-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Comienza creando tu primer parqueadero!</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Aún no tienes parqueaderos registrados. Crea uno para comenzar a gestionar tus espacios de estacionamiento.
                </p>
                {isAdminRole && !isTempAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-parkiu-600 hover:bg-parkiu-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto font-medium transition-colors shadow-sm"
                  >
                    <LuPlus className="w-5 h-5" />
                    Crear mi primer parqueadero
                  </button>
                )}
              </div>
            ) : (
              /* Cards de parqueaderos con datos reales */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredParkingLots.map((parking) => (
                  <ParkingLotCard key={parking.id} parking={parking} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ✅ MODAL PARA CREAR PARQUEADEROS */}
        <CreateParkingLotModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
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
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">

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
                <div className="flex-shrink-0 p-2 bg-parkiu-50 rounded-lg">
                  <CircleParking className="w-6 h-6 text-parkiu-600" />
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
                onClick={() => navigate(`/parking/${currentParking.id}/history`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
              >
                Historial
              </button>
              <button
                onClick={() => setIsCreateSpaceModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
                disabled={!currentParking?.id || !isAdminRole}
              >
                <LuPlus className="h-4 w-4 mr-2" />
                Nuevo Espacio
              </button>
            </div>
          </div>
        </div>
      </div>

      {isTempAdmin && (
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
            <span className="font-semibold">Parqueadero inactivo.</span> Pendiente de verificación del administrador.
          </div>
        </div>
      )}
      <div className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Panel principal */}
          <div className="xl:col-span-8 space-y-6">

            {/* ✅ MÉTRICAS MEJORADAS CON DISEÑO DINÁMICO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <LuBuilding className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{currentParking.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">En Vivo</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                  {/* Total Espacios */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-slate-600 mb-1">Total Espacios</p>
                        <span className="text-2xl font-bold text-slate-900">
                          {currentParking.total_spots || finalOccupancyStats.total}
                        </span>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl">
                        <CircleParking className="w-6 h-6 text-slate-700" />
                      </div>
                    </div>
                  </div>

                  {/* Disponibles */}
                  <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-slate-600 mb-1">Disponibles</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-emerald-600">
                            {finalOccupancyStats.available}
                          </span>
                          <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <span>✓</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
                        <CircleParking className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* Ocupados */}
                  <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-slate-600 mb-1">Ocupados</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-amber-600">
                            {finalOccupancyStats.occupied}
                          </span>
                          <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <span>🚗</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl">
                        <LuCar className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </div>

                  {/* Tarifa con mejor diseño */}
                  <div className="bg-white rounded-xl p-4 border border-parkiu-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-slate-600 mb-1">Tarifa/Hora</p>
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-semibold text-parkiu-600">$</span>
                          <span className="text-2xl font-bold text-parkiu-600">
                            {currentParking.price_per_hour || 0}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-parkiu-100 to-parkiu-200 rounded-xl">
                        <span className="text-parkiu-600 text-xl">💰</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Ocupación Mejorado */}
                {occupancyStats && (
                  <div className="mt-6 bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-slate-700">Tasa de Ocupación</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                          {occupancyStats.occupancyRate.toFixed(1)}%
                        </span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          occupancyStats.occupancyRate < 50
                            ? 'bg-green-100 text-green-700'
                            : occupancyStats.occupancyRate < 80
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {occupancyStats.occupancyRate < 50 ? '🟢 Bajo' :
                           occupancyStats.occupancyRate < 80 ? '🟡 Medio' : '🔴 Alto'}
                        </div>
                      </div>
                    </div>

                    <div className="relative w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(occupancyStats.occupancyRate, 100)}%` }}
                      >
                        <div className="absolute top-0 right-0 w-1 h-full bg-white/50 animate-pulse"></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
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

            {/* ✅ MAPA VISUAL DEL PARQUEADERO */}
            <ParkingLotMap
              spots={filteredSpots}
              onSpotClick={() => {}}
              selectedSpotId={null}
              viewMode="realistic"
            />

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
                      {carSpots.map((spot) => (
                        <div key={spot.id} className="overflow-hidden">
                          <SpotCard
                            spot={spot}
                            onOccupy={handleOccupySpot}
                            onRelease={handleReleaseSpot}
                            onMaintenanceToggle={handleMaintenanceToggle}
                            isUpdating={updateSpotStatus.isPending || occupySpot.isPending || releaseSpot.isPending}
                          />
                        </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
                      {motorcycleSpots.map((spot) => (
                        <div key={spot.id} className="overflow-hidden">
                          <SpotCard
                            spot={spot}
                            onOccupy={handleOccupySpot}
                            onRelease={handleReleaseSpot}
                            onMaintenanceToggle={handleMaintenanceToggle}
                            isUpdating={updateSpotStatus.isPending || occupySpot.isPending || releaseSpot.isPending}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ✅ Sección de Bicicletas */}
                {bicycleSpots.length > 0 && (
                  <div className="p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <FaMotorcycle className="w-4 h-4 text-green-500" />
                        Bicicletas
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                          {bicycleSpots.length} espacios
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
                      {bicycleSpots.map((spot) => (
                        <div key={spot.id} className="overflow-hidden">
                          <SpotCard
                            spot={spot}
                            onOccupy={handleOccupySpot}
                            onRelease={handleReleaseSpot}
                            onMaintenanceToggle={handleMaintenanceToggle}
                            isUpdating={updateSpotStatus.isPending || occupySpot.isPending || releaseSpot.isPending}
                          />
                        </div>
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

          {/* Panel lateral - Información y Tarifas */}
          <div className="xl:col-span-4 space-y-6 sticky top-[88px]">
            {/* Información General del Parqueadero */}
            <ParkingGeneralInfo parkingLot={currentParking} />

            {/* Tarifas por Tipo de Vehículo */}
            <PricingPanel parkingLot={currentParking} />
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
          parkingLotId={currentParking.id}
        />
      )}

      {/* ✅ OPERACIONES RÁPIDAS DE VEHÍCULOS */}
      {!isListView && currentParking && (
        <>
          {process.env.NODE_ENV === 'development' && console.log('🔍 Renderizando QuickVehicleOperations con:', { isListView, currentParking })}
          <QuickVehicleOperations
            selectedParkingLot={currentParking}
          />
        </>
      )}

      {/* ✅ AYUDA DE ATAJOS DE TECLADO */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={getShortcutsHelp()}
        formatShortcut={formatShortcut}
      />

      {/* ✅ BOTÓN DE AYUDA FLOTANTE - Posicionado encima de los controles de entrada/salida/buscar */}
        <button
          onClick={() => setShowKeyboardHelp(true)}
          className="fixed bottom-40 right-6 w-12 h-12 bg-gray-800/60 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-gray-700/80 transition-all duration-200 z-50 flex items-center justify-center group"
          title="Atajos de teclado (Shift + ?)"
        >
        <LuKeyboard className="w-5 h-5" />
        <span className="absolute -top-8 right-0 bg-gray-800/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
          Atajos (Shift + ?)
        </span>
      </button>
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
  const IconComponent = spot.type === 'car' ? LuCar : FaMotorcycle;
  const [forceOpen, setForceOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const FORCE_PHRASE = 'QUIERO LIBERAR ESTE ESPACIO';

  // Configuración de estilos por estado
  const statusConfig = {
    available: {
      card: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-100',
      icon: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
      iconColor: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      pulse: 'bg-emerald-500',
      label: '✅ Disponible'
    },
    occupied: {
      card: 'bg-gradient-to-br from-red-50 to-white border-red-200 hover:border-red-300 hover:shadow-red-100',
      icon: 'bg-gradient-to-br from-red-100 to-red-200',
      iconColor: 'text-red-600',
      badge: 'bg-red-100 text-red-700 border border-red-200',
      pulse: 'bg-red-500',
      label: '🚗 Ocupado'
    },
    maintenance: {
      card: 'bg-gradient-to-br from-amber-50 to-white border-amber-200 hover:border-amber-300 hover:shadow-amber-100',
      icon: 'bg-gradient-to-br from-amber-100 to-amber-200',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700 border border-amber-200',
      pulse: 'bg-amber-500',
      label: '🔧 Mantenimiento'
    }
  };

  const config = statusConfig[spot.status as keyof typeof statusConfig] || statusConfig.available;

  const hasActiveVehicle = spot.status === 'occupied' && !!spot.active_vehicle?.plate;
  const canReleaseDirectly = spot.status === 'occupied' ? !hasActiveVehicle : true;

  return (
    <div className={`group relative rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-lg ${
      config.card
    } ${isUpdating ? 'opacity-50' : ''}`} style={{ isolation: 'isolate' }}>

      {/* Indicador de estado (pulso) */}
      <div className="absolute top-3 right-3">
        <div className={`w-3 h-3 rounded-full ${config.pulse} animate-pulse shadow-sm`}></div>
      </div>

      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex-shrink-0 p-3 rounded-xl ${config.icon} shadow-sm`}>
            <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-bold text-slate-900 mb-1">
              Espacio {spot.number}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              #{spot.id} • {spot.type === 'car' ? 'Automóvil' : 'Motocicleta'}
            </p>
          </div>
        </div>
      </div>

      {/* Estado visual mejorado */}
      <div className="mb-4">
        <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${config.badge} shadow-sm`}>
          {config.label}
        </span>
        {hasActiveVehicle && (
          <span className="inline-flex items-center gap-2 ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Placa: <span className="font-mono">{spot.active_vehicle!.plate.toUpperCase()}</span>
          </span>
        )}
      </div>

      {/* Información adicional */}
      <div className="mb-4 p-3 bg-slate-50/50 rounded-lg">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Última actualización</span>
          <span className="font-medium">Hace 2 min</span>
        </div>
      </div>

      {/* Acciones mejoradas */}
      <div className="flex items-center gap-2">
        {spot.status === 'available' && (
          <button
            onClick={() => onOccupy(spot.id!)}
            disabled={isUpdating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <LuPlus className="w-4 h-4" />
            Ocupar
          </button>
        )}

        {spot.status === 'occupied' && (
          <>
            <button
              onClick={() => onRelease(spot.id!)}
              disabled={isUpdating || !canReleaseDirectly}
              title={hasActiveVehicle ? 'Hay un vehículo activo. Procese la salida o use Forzar liberación.' : undefined}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <LuArrowRight className="w-4 h-4" />
              Liberar
            </button>
            {hasActiveVehicle && (
              <button
                onClick={() => setForceOpen(true)}
                disabled={isUpdating}
                className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl bg-white border-2 border-red-200 text-red-700 hover:bg-red-50 transition-all duration-200 shadow-sm disabled:opacity-50"
                title="Forzar liberación"
              >
                <LuTriangle className="w-4 h-4 mr-1" />
                Forzar
              </button>
            )}
          </>
        )}

        {spot.status === 'maintenance' && (
          <button
            onClick={() => onMaintenanceToggle(spot.id!, spot.status)}
            disabled={isUpdating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <LuSettings className="w-4 h-4" />
            Reactivar
          </button>
        )}

        <button
          onClick={() => onMaintenanceToggle(spot.id!, spot.status)}
          disabled={isUpdating}
          className="inline-flex items-center justify-center px-3 py-3 text-sm font-medium rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
          title="Alternar mantenimiento"
        >
          <LuSettings className="w-4 h-4" />
        </button>
      </div>

      {/* Loading overlay mejorado */}
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <LuLoader className="h-8 w-8 animate-spin text-parkiu-600" />
            <span className="text-sm font-medium text-slate-700">Actualizando...</span>
          </div>
        </div>
      )}

      {/* Dialogo de forzar liberación */}
      <Dialog open={forceOpen} onOpenChange={(open) => { setForceOpen(open); if (!open) setConfirmText(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <LuTriangle className="w-5 h-5" />
              Forzar liberación del espacio
            </DialogTitle>
            <DialogDescription>
              Este espacio tiene un vehículo activo con placa <strong>{spot.active_vehicle?.plate?.toUpperCase()}</strong>.
              Para continuar, escriba exactamente: <span className="font-semibold">{FORCE_PHRASE}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Input value={confirmText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)} placeholder={FORCE_PHRASE} />
          </div>
          <DialogFooter>
            <button
              onClick={() => setForceOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onRelease(spot.id!); setForceOpen(false); setConfirmText(''); }}
              disabled={confirmText.trim().toUpperCase() !== FORCE_PHRASE}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirmar liberación
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
