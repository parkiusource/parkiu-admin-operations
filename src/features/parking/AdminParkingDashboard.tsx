import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuMapPin, LuSettings, LuPlus, LuSearch, LuCar, LuArrowRight, LuLoader, LuChevronLeft, LuBuilding, LuTriangle, LuKeyboard } from 'react-icons/lu';
import { FaMotorcycle } from 'react-icons/fa';
import { Bike } from 'lucide-react';
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
import { useStore } from '@/store/useStore';
import { getCachedParkingLot } from '@/services/offlineCache';
import { useToast } from '@/hooks';

// ✅ IMPORTAR TIPOS DEL BACKEND
import { ParkingLot, ParkingSpot } from '@/services/parking/types';

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
  const [fallbackParking, setFallbackParking] = useState<ParkingLot | null>(null);
  const [updatingSpotId, setUpdatingSpotId] = useState<number | null>(null);

  const isOffline = useStore(s => s.isOffline);

  // ✅ OBTENER PARKING LOTS REALES DEL ADMINISTRADOR (con soporte offline)
  const {
    parkingLots,
    isLoading: isLoadingLots,
    error: lotsError,
    isFromCache: lotsFromCache
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
      window.quickOperations?.openEntry();
    },
    onOpenVehicleExit: () => {
      window.quickOperations?.openExit();
    },
    onOpenSearch: () => {
      window.quickOperations?.openSearch();
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

  // ✅ COMBINAR DATOS DEL PARQUEADERO CON TARIFAS ACTUALIZADAS (offline: usar base o fallback desde caché)
  const currentParking = (baseParkingLot && pricingData
    ? { ...baseParkingLot, ...pricingData }
    : baseParkingLot) || fallbackParking;

  // ✅ OFFLINE: si hay parkingId pero no baseParkingLot (query colgada/vacía), hidratar desde caché
  useEffect(() => {
    if (!isOffline || !parkingId || baseParkingLot) {
      if (!isOffline && fallbackParking) setFallbackParking(null);
      return;
    }
    let cancelled = false;
    getCachedParkingLot(parkingId).then((lot) => {
      if (!cancelled && lot) setFallbackParking(lot);
    });
    return () => { cancelled = true; };
  }, [isOffline, parkingId, baseParkingLot, fallbackParking]);

  // ✅ REDIRIGIR SI EL :id NO PERTENECE A LOS LOTS DEL USUARIO (no redirigir si offline y tenemos fallback de caché)
  useEffect(() => {
    if (!parkingId) return;
    if (isOffline && fallbackParking?.id === parkingId) return;
    if (isLoadingLots) return;
    const belongs = parkingLots.some(lot => lot.id === parkingId);
    if (!belongs) {
      if (parkingLots.length > 0) {
        navigate(`/parking/${parkingLots[0].id}`, { replace: true });
      } else {
        navigate('/parking', { replace: true });
      }
    }
  }, [parkingId, parkingLots, isLoadingLots, navigate, isOffline, fallbackParking?.id]);

  // ✅ OBTENER ESPACIOS REALES DEL BACKEND - SOLO para vista individual (con soporte offline)
  const {
    data: parkingSpots = [],
    isLoading: isLoadingSpaces,
    isFetching: isFetchingSpaces,
    error: spacesError,
    refetch: refetchSpaces,
    isFromCache: spacesFromCache
  } = useRealParkingSpacesWithVehicles(currentParking?.id, {
    enabled: !isListView && !!currentParking?.id,
    refetchInterval: 1000 * 60 // Refrescar cada minuto
  });

  // ✅ Determinar si estamos usando datos del caché
  const isUsingCachedData = lotsFromCache || spacesFromCache;
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

  const { addToast } = useToast();

  // ✅ HOOKS DE MUTACIÓN REALES DEL BACKEND
  const updateSpotStatus = useUpdateRealParkingSpaceStatus({
    onSuccess: (updatedSpace) => {
      setUpdatingSpotId(null);
      if ((updatedSpace as { __offline?: boolean }).__offline) {
        addToast('Cambio guardado localmente. Se sincronizará cuando haya conexión.', 'success');
      }
    },
    onError: (error) => {
      setUpdatingSpotId(null);
      console.error('Error al actualizar espacio:', error);
      addToast(error.message || 'Error al actualizar el espacio', 'error');
    }
  });

  const toNumericSpaceId = (spotId: string | number): number | null => {
    const n = typeof spotId === 'string' ? parseInt(spotId, 10) : spotId;
    return Number.isFinite(n) ? n : null;
  };

  const occupySpot = {
    mutate: (spotId: string | number) => {
      const numericId = toNumericSpaceId(spotId);
      if (numericId == null) return;
      setUpdatingSpotId(numericId);
      updateSpotStatus.mutate({ spaceId: numericId, status: 'occupied' });
    },
    isPending: updateSpotStatus.isPending
  };

  const releaseSpot = {
    mutate: (spotId: string | number) => {
      const numericId = toNumericSpaceId(spotId);
      if (numericId == null) return;
      setUpdatingSpotId(numericId);
      updateSpotStatus.mutate({ spaceId: numericId, status: 'available' });
    },
    isPending: updateSpotStatus.isPending
  };

  const refetchSpots = () => {
    if (!isFetchingSpaces) refetchSpaces();
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
    const numericId = toNumericSpaceId(spotId);
    if (numericId == null) return;
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    setUpdatingSpotId(numericId);
    updateSpotStatus.mutate({ spaceId: numericId, status: newStatus });
  };

  const handleSpotClickFromMap = (spot: ParkingSpot) => {
    const id = spot?.id != null ? String(spot.id) : '';
    if (id) document.getElementById(`spot-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const isSpotUpdating = (spot: ParkingSpot) => {
    if (updatingSpotId == null) return false;
    const spotNum = typeof spot.id === 'string' ? parseInt(spot.id, 10) : spot.id;
    return updateSpotStatus.isPending && Number.isFinite(spotNum) && spotNum === updatingSpotId;
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

  // ✅ ERROR STATE - Solo mostrar si hay error Y no tenemos datos (ni del servidor ni del caché)
  const hasLotsData = parkingLots && parkingLots.length > 0;
  const hasSpacesData = parkingSpots && parkingSpots.length > 0;
  const showLotsError = lotsError && !hasLotsData;
  const showSpacesError = !isListView && spacesError && !hasSpacesData;

  if (showLotsError || showSpacesError) {
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

  // ✅ BANNER SIN CONEXIÓN - Mensaje claro para MVP
  const OfflineBanner = () => {
    if (!isUsingCachedData) return null;

    return (
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-amber-800 flex-1">
            Se necesita conexión a internet
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex-shrink-0 text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  };

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

    // ✅ LISTA DE PARQUEADEROS - Optimizada para móvil
    return (
      <>
        <div className="flex-1 flex flex-col bg-slate-50 pb-safe">
          {/* Banner de datos offline */}
          {isUsingCachedData && (
            <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
              <OfflineBanner />
            </div>
          )}
          {isTempAdmin && (
            <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-4 text-amber-800 text-xs sm:text-sm">
                <span className="font-semibold">Cuenta en verificación.</span> <span className="hidden xs:inline">Tu parqueadero estará inactivo hasta la aprobación.</span>
              </div>
            </div>
          )}
          {/* Header responsive */}
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Título y descripción */}
                <div className="flex items-center gap-2.5 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-parkiu-600 rounded-lg sm:rounded-xl shadow-sm flex-shrink-0">
                    <LuBuilding className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">
                      Mis Parqueaderos
                    </h1>
                    <p className="text-slate-600 text-xs sm:text-base md:text-lg hidden xs:block">
                      Gestiona todos tus parqueaderos
                    </p>
                  </div>
                </div>

                {/* Estadísticas - Grid 2x2 en móvil */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                  <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg flex-shrink-0">
                        <LuBuilding className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs lg:text-sm text-slate-600">Total</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">{overviewStats.totalParkingLots}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 rounded-lg flex-shrink-0">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-emerald-500 rounded-full"></div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs lg:text-sm text-slate-600">Activos</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">{overviewStats.activeParkingLots}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg flex-shrink-0">
                        <LuMapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs lg:text-sm text-slate-600 flex items-center gap-1">
                          Espacios
                          {overviewStats.loadingSpaces && <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></span>}
                        </p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">{overviewStats.totalSpaces}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg flex-shrink-0">
                        <span className="text-slate-600 text-xs sm:text-sm lg:text-lg font-bold">$</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs lg:text-sm text-slate-600">Prom.</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">${overviewStats.averagePrice}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones - Stack en móvil */}
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                  <div className="relative flex-1">
                    <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-parkiu-500 focus:border-parkiu-500 w-full text-sm"
                    />
                  </div>
                  {isAdminRole && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-parkiu-600 hover:bg-parkiu-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 text-sm font-medium transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
                    >
                      <LuPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Nuevo</span> Parqueadero
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de parqueaderos - Grid responsive */}
          <div className="flex-1 max-w-7xl mx-auto w-full px-3 py-4 sm:px-6 sm:py-8 lg:px-8 pb-24 sm:pb-8">
            {isLoadingLots ? (
              /* Loading skeleton responsive */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
                    <div className="animate-pulse">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex-1">
                          <div className="h-5 sm:h-6 bg-gray-200 rounded-lg w-3/4 mb-2"></div>
                          <div className="h-3 sm:h-4 bg-gray-200 rounded-lg w-full"></div>
                        </div>
                        <div className="h-5 sm:h-6 bg-gray-200 rounded-full w-14 sm:w-16"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <div className="h-10 sm:h-12 bg-gray-200 rounded-lg"></div>
                        <div className="h-10 sm:h-12 bg-gray-200 rounded-lg"></div>
                      </div>
                      <div className="h-8 sm:h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : lotsError ? (
              /* Error state responsive */
              <div className="text-center py-10 sm:py-16 px-4">
                <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-red-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <LuSettings className="w-8 h-8 sm:w-12 sm:h-12 text-red-600" />
                </div>
                <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-2">Error al cargar</h3>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Problema al obtener parqueaderos.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-parkiu-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-parkiu-700 text-sm sm:text-base"
                >
                  Reintentar
                </button>
              </div>
            ) : parkingLots.length === 0 ? (
              /* Empty state responsive */
              <div className="text-center py-10 sm:py-16 px-4">
                <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-parkiu-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <LuBuilding className="w-8 h-8 sm:w-12 sm:h-12 text-parkiu-600" />
                </div>
                <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-2">Crea tu primer parqueadero</h3>
                <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                  Comienza a gestionar tus espacios de estacionamiento.
                </p>
                {isAdminRole && !isTempAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-parkiu-600 hover:bg-parkiu-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center gap-2 mx-auto font-medium transition-colors shadow-sm text-sm sm:text-base"
                  >
                    <LuPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Crear parqueadero
                  </button>
                )}
              </div>
            ) : (
              /* Cards grid responsive */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
      <div className="flex-1 flex flex-col bg-slate-50 pb-safe">
      {/* ✅ Banner de datos offline */}
      {isUsingCachedData && (
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
          <OfflineBanner />
        </div>
      )}
      {/* Header del parqueadero específico - Sticky dentro del scroll del MainLayout */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-3 lg:px-8">

          {/* ✅ BREADCRUMBS - Ocultos en móvil muy pequeño */}
          <div className="mb-2 sm:mb-4 hidden xs:block">
            <nav className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500" aria-label="Navegación">
              <button
                type="button"
                onClick={() => navigate('/parking')}
                className="hover:text-gray-700 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-parkiu-500 focus:ring-offset-1 rounded"
                aria-label="Ir a mis parqueaderos"
              >
                <LuBuilding className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden />
                <span className="hidden sm:inline">Mis Parqueaderos</span>
                <span className="sm:hidden">Parqueaderos</span>
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium truncate max-w-[120px] sm:max-w-none">{currentParking.name}</span>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            {/* Título y estado */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/parking')}
                className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-parkiu-500 focus:ring-offset-2"
                title="Volver a mis parqueaderos"
                aria-label="Volver a mis parqueaderos"
              >
                <LuChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" aria-hidden />
              </button>
              <div className="flex-shrink-0 p-1.5 sm:p-2 bg-parkiu-50 rounded-lg">
                <CircleParking className="w-5 h-5 sm:w-6 sm:h-6 text-parkiu-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-slate-900 truncate">
                  <span className="hidden sm:inline">Panel de Control - </span>{currentParking.name}
                </h1>
                <div className="flex items-center gap-2 sm:gap-4 mt-0.5 sm:mt-1">
                  <p className="text-xs sm:text-sm text-slate-600 flex items-center min-w-0">
                    <LuMapPin className="flex-shrink-0 mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate max-w-[150px] sm:max-w-none">{currentParking.address}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 flex items-center flex-shrink-0">
                    <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mr-1 sm:mr-1.5"></span>
                    <span className="hidden sm:inline">{currentParking.status === 'active' ? 'Activo' : 'Conectado'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de acción - Scroll horizontal en móvil */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide" role="toolbar" aria-label="Acciones del panel">
              <button
                type="button"
                onClick={() => refetchSpots()}
                disabled={isFetchingSpaces}
                aria-label="Actualizar espacios"
                title="Recargar lista de espacios"
                className="inline-flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-60 disabled:pointer-events-none"
              >
                {isFetchingSpaces ? (
                  <LuLoader className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin sm:mr-2" aria-hidden />
                ) : (
                  <LuSettings className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" aria-hidden />
                )}
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/parking/${currentParking.id}/history`)}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors whitespace-nowrap flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Ver historial de transacciones"
              >
                Historial
              </button>
              <button
                type="button"
                onClick={() => setIsCreateSpaceModalOpen(true)}
                disabled={!currentParking?.id || !isAdminRole}
                aria-label="Crear nuevo espacio"
                title={!isAdminRole ? 'Sin permisos para crear espacios' : 'Agregar espacio de parqueo'}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <LuPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" aria-hidden />
                <span className="hidden xs:inline">Nuevo</span> Espacio
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
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24 sm:pb-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          {/* Panel principal */}
          <div className="xl:col-span-8 space-y-4 sm:space-y-6 order-2 xl:order-1">

            {/* ✅ MÉTRICAS MEJORADAS CON DISEÑO RESPONSIVE */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {/* Card principal de métricas */}
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 shadow-lg p-4 sm:p-6">
                {/* Header con nombre y estado */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex-shrink-0">
                      <LuBuilding className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 truncate">{currentParking.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 rounded-full flex-shrink-0">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium text-green-700">En Vivo</span>
                  </div>
                </div>

                {/* Grid de estadísticas - 2x2 siempre, más compacto en móvil */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {/* Total Espacios */}
                  <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1 truncate">Total</p>
                        <span className="text-xl sm:text-2xl font-bold text-slate-900">
                          {currentParking.total_spots || finalOccupancyStats.total}
                        </span>
                      </div>
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg sm:rounded-xl flex-shrink-0">
                        <CircleParking className="w-4 h-4 sm:w-6 sm:h-6 text-slate-700" />
                      </div>
                    </div>
                  </div>

                  {/* Disponibles */}
                  <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1 truncate">Disponibles</p>
                        <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                          {finalOccupancyStats.available}
                        </span>
                      </div>
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg sm:rounded-xl flex-shrink-0">
                        <CircleParking className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* Ocupados */}
                  <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1 truncate">Ocupados</p>
                        <span className="text-xl sm:text-2xl font-bold text-amber-600">
                          {finalOccupancyStats.occupied}
                        </span>
                      </div>
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg sm:rounded-xl flex-shrink-0">
                        <LuCar className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                      </div>
                    </div>
                  </div>

                  {/* Tarifa */}
                  <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-parkiu-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1 truncate">$/Hora</p>
                        <div className="flex items-center gap-0.5">
                          <span className="text-sm sm:text-lg font-semibold text-parkiu-600">$</span>
                          <span className="text-xl sm:text-2xl font-bold text-parkiu-600">
                            {currentParking.price_per_hour || 0}
                          </span>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-parkiu-100 to-parkiu-200 rounded-lg sm:rounded-xl flex-shrink-0">
                        <span className="text-parkiu-600 text-lg sm:text-xl">💰</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Ocupación - Más compacto en móvil */}
                {occupancyStats && (
                  <div className="mt-4 sm:mt-6 bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">Ocupación</span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-2xl font-bold text-slate-900">
                          {occupancyStats.occupancyRate.toFixed(0)}%
                        </span>
                        <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                          occupancyStats.occupancyRate < 50
                            ? 'bg-green-100 text-green-700'
                            : occupancyStats.occupancyRate < 80
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {occupancyStats.occupancyRate < 50 ? 'Bajo' :
                           occupancyStats.occupancyRate < 80 ? 'Medio' : 'Alto'}
                        </div>
                      </div>
                    </div>

                    <div className="relative w-full bg-slate-100 rounded-full h-2.5 sm:h-4 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(occupancyStats.occupancyRate, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Búsqueda y filtros */}
              <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="relative flex-1">
                    <label htmlFor="panel-search-space" className="sr-only">Buscar por número de espacio</label>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden>
                      <LuSearch className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="panel-search-space"
                      type="search"
                      autoComplete="off"
                      className="block w-full pl-9 sm:pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-slate-400"
                      placeholder="Buscar espacio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Buscar por número de espacio"
                    />
                  </div>
                  <label htmlFor="panel-filter-status" className="sr-only">Filtrar por estado</label>
                  <select
                    id="panel-filter-status"
                    className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700 sm:w-48"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    aria-label="Filtrar espacios por estado"
                  >
                    <option value="all">Todos</option>
                    <option value="available">Disponibles</option>
                    <option value="occupied">Ocupados</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ✅ MAPA VISUAL DEL PARQUEADERO */}
            <ParkingLotMap
              spots={filteredSpots}
              onSpotClick={handleSpotClickFromMap}
              selectedSpotId={null}
              viewMode="realistic"
            />

            {/* Grid de espacios - Optimizado para móvil */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                    <LuCar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                    Espacios ({filteredSpots.length})
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {/* Sección de Automóviles */}
                {carSpots.length > 0 && (
                  <div className="p-3 sm:p-5">
                    <div className="mb-3 sm:mb-4">
                      <h4 className="text-xs sm:text-sm font-medium text-slate-900 flex items-center gap-2">
                        <LuCar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                        Automóviles
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-slate-100 text-slate-600">
                          {carSpots.length}
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
                      {carSpots.map((spot) => (
                        <div key={spot.id} id={`spot-${spot.id}`} className="overflow-hidden scroll-mt-4">
                          <SpotCard
                            spot={spot}
                            onOccupy={handleOccupySpot}
                            onRelease={handleReleaseSpot}
                            onMaintenanceToggle={handleMaintenanceToggle}
                            isUpdating={isSpotUpdating(spot)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección de Motocicletas */}
                {motorcycleSpots.length > 0 && (
                  <div className="p-3 sm:p-5">
                    <div className="mb-3 sm:mb-4">
                      <h4 className="text-xs sm:text-sm font-medium text-slate-900 flex items-center gap-2">
                        <FaMotorcycle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                        Motocicletas
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-slate-100 text-slate-600">
                          {motorcycleSpots.length}
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
                      {motorcycleSpots.map((spot) => (
                        <div key={spot.id} id={`spot-${spot.id}`} className="overflow-hidden scroll-mt-4">
                          <SpotCard
                            spot={spot}
                            onOccupy={handleOccupySpot}
                            onRelease={handleReleaseSpot}
                            onMaintenanceToggle={handleMaintenanceToggle}
                            isUpdating={isSpotUpdating(spot)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección de Bicicletas */}
                {bicycleSpots.length > 0 && (
                  <div className="p-3 sm:p-5">
                    <div className="mb-3 sm:mb-4">
                      <h4 className="text-xs sm:text-sm font-medium text-slate-900 flex items-center gap-2">
                        <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                        Bicicletas
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-slate-100 text-slate-600">
                          {bicycleSpots.length}
                        </span>
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
                      {bicycleSpots.map((spot) => (
                        <div key={spot.id} id={`spot-${spot.id}`} className="overflow-hidden scroll-mt-4">
                          <SpotCard
                            spot={spot}
                            onOccupy={handleOccupySpot}
                            onRelease={handleReleaseSpot}
                            onMaintenanceToggle={handleMaintenanceToggle}
                            isUpdating={isSpotUpdating(spot)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estado vacío */}
                {filteredSpots.length === 0 && (
                  <div className="p-6 sm:p-8 text-center">
                    <CircleParking className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400" />
                    <h3 className="mt-2 text-xs sm:text-sm font-medium text-slate-900">No hay espacios</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      {parkingSpots.length === 0 ?
                        'No se encontraron espacios.' :
                        'Sin resultados para tu búsqueda.'
                      }
                    </p>
                    {parkingSpots.length === 0 && (
                      <button
                        onClick={() => refetchSpots()}
                        className="mt-3 sm:mt-4 bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-indigo-700"
                      >
                        Recargar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel lateral - Información y Tarifas - Primero en móvil, sticky en desktop */}
          <div className="xl:col-span-4 space-y-4 sm:space-y-6 order-1 xl:order-2 xl:sticky xl:top-[88px]">
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
        onSuccess={() => {
          // El hook ya invalida las queries, así que la lista se actualizará automáticamente
        }}
      />

      {/* ✅ MODAL PARA CREAR ESPACIOS DE PARQUEO */}
      {currentParking?.id && (
        <CreateParkingSpaceModal
          isOpen={isCreateSpaceModalOpen}
          onClose={() => setIsCreateSpaceModalOpen(false)}
          onSuccess={() => {
            // El hook ya invalida las queries, así que la lista se actualizará automáticamente
            refetchSpaces();
          }}
          parkingLotId={currentParking.id}
        />
      )}

      {/* ✅ OPERACIONES RÁPIDAS DE VEHÍCULOS */}
      {!isListView && currentParking && (
          <>
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

      {/* Botón de ayuda flotante - Oculto en móvil muy pequeño */}
      <button
        onClick={() => setShowKeyboardHelp(true)}
        className="hidden sm:flex fixed bottom-40 right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-gray-800/60 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-gray-700/80 transition-all duration-200 z-50 items-center justify-center group"
        title="Atajos de teclado (Shift + ?)"
      >
        <LuKeyboard className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="absolute -top-8 right-0 bg-gray-800/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap hidden lg:block">
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
  const IconComponent =
    spot.type === 'car' ? LuCar
    : spot.type === 'bicycle' ? Bike
    : FaMotorcycle;
  const [forceOpen, setForceOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const FORCE_PHRASE = 'LIBERAR';

  // Configuración de estilos por estado
  const statusConfig = {
    available: {
      card: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-300',
      icon: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
      iconColor: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      pulse: 'bg-emerald-500',
      label: 'Disponible'
    },
    occupied: {
      card: 'bg-gradient-to-br from-red-50 to-white border-red-200 hover:border-red-300',
      icon: 'bg-gradient-to-br from-red-100 to-red-200',
      iconColor: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
      pulse: 'bg-red-500',
      label: 'Ocupado'
    },
    maintenance: {
      card: 'bg-gradient-to-br from-amber-50 to-white border-amber-200 hover:border-amber-300',
      icon: 'bg-gradient-to-br from-amber-100 to-amber-200',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
      pulse: 'bg-amber-500',
      label: 'Mant.'
    },
    reserved: {
      card: 'bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:border-blue-300',
      icon: 'bg-gradient-to-br from-blue-100 to-blue-200',
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
      pulse: 'bg-blue-500',
      label: 'Reservado'
    }
  };

  const config = statusConfig[spot.status as keyof typeof statusConfig] || statusConfig.available;
  const spotId = spot.id;
  const hasValidId = spotId != null && Number.isFinite(typeof spotId === 'string' ? parseInt(spotId, 10) : spotId);

  const hasActiveVehicle = spot.status === 'occupied' && !!spot.active_vehicle?.plate;
  const canReleaseDirectly = spot.status === 'occupied' ? !hasActiveVehicle : true;

  return (
    <div className={`group relative rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 transition-all duration-300 hover:shadow-lg ${
      config.card
    } ${isUpdating ? 'opacity-50' : ''}`} style={{ isolation: 'isolate' }}>

      {/* Indicador de estado (pulso) */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${config.pulse} animate-pulse shadow-sm`}></div>
      </div>

      {/* Header compacto */}
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className={`flex-shrink-0 p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${config.icon}`}>
          <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {spot.number}
          </h4>
          <p className="text-[10px] sm:text-xs text-slate-500">
            {spot.type === 'car' ? 'Auto' : spot.type === 'bicycle' ? 'Bici' : spot.type === 'truck' ? 'Camión' : 'Moto'}
          </p>
        </div>
        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Placa del vehículo si está ocupado */}
      {hasActiveVehicle && (
        <div className="mb-2 sm:mb-3 px-2 py-1.5 bg-slate-100 rounded-lg">
          <p className="text-[10px] sm:text-xs text-slate-600">
            Placa: <span className="font-mono font-bold">{spot.active_vehicle!.plate.toUpperCase()}</span>
          </p>
        </div>
      )}

      {/* Acciones compactas */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {spot.status === 'available' && (
          <button
            onClick={() => hasValidId && onOccupy(spotId!)}
            disabled={isUpdating || !hasValidId}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
          >
            <LuPlus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Ocupar</span>
          </button>
        )}

        {spot.status === 'occupied' && (
          <>
            <button
              onClick={() => hasValidId && onRelease(spotId!)}
              disabled={isUpdating || !canReleaseDirectly || !hasValidId}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50"
            >
              <LuArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Liberar</span>
            </button>
            {hasActiveVehicle && (
              <button
                onClick={() => setForceOpen(true)}
                disabled={isUpdating}
                className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2.5 text-xs font-semibold rounded-lg sm:rounded-xl bg-white border-2 border-red-200 text-red-700 hover:bg-red-50 transition-all disabled:opacity-50"
                title="Forzar"
              >
                <LuTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </>
        )}

        {spot.status === 'maintenance' && (
          <button
            onClick={() => hasValidId && onMaintenanceToggle(spotId!, spot.status)}
            disabled={isUpdating || !hasValidId}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
          >
            <LuSettings className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Reactivar</span>
          </button>
        )}

        <button
          onClick={() => hasValidId && onMaintenanceToggle(spotId!, spot.status)}
          disabled={isUpdating || !hasValidId}
          className="inline-flex items-center justify-center p-2 sm:p-2.5 text-xs rounded-lg sm:rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
          title="Mantenimiento"
        >
          <LuSettings className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Loading overlay */}
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl">
          <LuLoader className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-parkiu-600" />
        </div>
      )}

      {/* Dialogo de forzar liberación - Simplificado para móvil */}
      <Dialog open={forceOpen} onOpenChange={(open) => { setForceOpen(open); if (!open) setConfirmText(''); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 text-sm sm:text-base">
              <LuTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              Forzar liberación
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Vehículo: <strong>{spot.active_vehicle?.plate?.toUpperCase()}</strong>.
              Escriba "{FORCE_PHRASE}" para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Input
              value={confirmText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
              placeholder={FORCE_PHRASE}
              className="text-sm"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <button
              onClick={() => setForceOpen(false)}
              className="w-full sm:w-auto px-3 py-2 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => { if (hasValidId) onRelease(spotId!); setForceOpen(false); setConfirmText(''); }}
              disabled={confirmText.trim().toUpperCase() !== FORCE_PHRASE || !hasValidId}
              className="w-full sm:w-auto px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirmar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
