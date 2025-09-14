import { Fragment, useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { VehicleEntryCard } from '@/components/vehicles/VehicleEntryCard';
import { VehicleExitCard } from '@/components/vehicles/VehicleExitCard';
import { ParkingLot } from '@/types/parking';
import { useSearchVehicle } from '@/api/hooks/useVehicles';

interface QuickVehicleOperationsProps {
  selectedParkingLot?: ParkingLot | null;
}

type OperationType = 'entry' | 'exit' | 'search' | null;

export const QuickVehicleOperations: React.FC<QuickVehicleOperationsProps> = ({
  selectedParkingLot,
}) => {
  const [activeOperation, setActiveOperation] = useState<OperationType>(null);
  const [searchPlate, setSearchPlate] = useState('');

  // Hook para búsqueda de vehículos con debounce
  const { data: searchedVehicle, isLoading: isSearching } = useSearchVehicle(
    selectedParkingLot?.id || '',
    searchPlate,
    {
      enabled: !!selectedParkingLot && searchPlate.length >= 3 && activeOperation === 'search',
      debounceMs: 600, // Debounce más rápido para búsqueda interactiva
      staleTime: 1000 * 60 * 1 // Cache por 1 minuto
    }
  );
  const plateInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus en el input cuando se abre el modal
  useEffect(() => {
    if (activeOperation && plateInputRef.current) {
      setTimeout(() => {
        plateInputRef.current?.focus();
      }, 100);
    }
  }, [activeOperation]);

  const closeModal = () => {
    setActiveOperation(null);
    setSearchPlate('');
  };

  const handleSuccess = () => {
    // Opcional: cerrar modal después de éxito
    // closeModal();
  };

  const handleError = () => {
    // Error handling is managed by individual components
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Navegación rápida con teclas
    if (event.key === 'Escape') {
      closeModal();
    } else if (event.key === 'Tab' && event.shiftKey && activeOperation === 'entry') {
      event.preventDefault();
      setActiveOperation('exit');
    } else if (event.key === 'Tab' && !event.shiftKey && activeOperation === 'exit') {
      event.preventDefault();
      setActiveOperation('entry');
    }
  };

  // Exponer funciones para atajos de teclado
  const operations = useMemo(() => ({
    openEntry: () => setActiveOperation('entry'),
    openExit: () => setActiveOperation('exit'),
    openSearch: () => setActiveOperation('search'),
    close: closeModal,
    focusPlateInput: () => plateInputRef.current?.focus(),
  }), []);

  // Hacer las operaciones disponibles globalmente para atajos
  useEffect(() => {
    (window as Window & { quickOperations?: typeof operations }).quickOperations = operations;
    return () => {
      delete (window as Window & { quickOperations?: typeof operations }).quickOperations;
    };
  }, [operations]);

  const renderModalContent = () => {
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 QuickVehicleOperations - selectedParkingLot:', selectedParkingLot);
      console.log('🔍 QuickVehicleOperations - activeOperation:', activeOperation);
    }

    // Verificar que tenemos datos del parqueadero
    if (!selectedParkingLot) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600">No se pudo cargar la información del parqueadero</p>
        </div>
      );
    }

    switch (activeOperation) {
      case 'entry':
        return (
          <VehicleEntryCard
            parkingLot={selectedParkingLot}
            onSuccess={(plate: string, spot: string) => {
              console.log('✅ VehicleEntry Success:', { plate, spot });
              handleSuccess();
            }}
            onError={(error: string) => {
              console.error('❌ VehicleEntry Error:', error);
              handleError();
            }}
            onClose={closeModal} // Cerrar modal cuando se hace clic en "Cerrar"
            autoFocus={true}
            compact={true}
          />
        );

      case 'exit':
        return (
          <VehicleExitCard
            parkingLot={selectedParkingLot}
            onSuccess={(plate: string, cost: number) => {
              console.log('✅ VehicleExit Success:', { plate, cost });
              handleSuccess();
            }}
            onError={(error: string) => {
              console.error('❌ VehicleExit Error:', error);
              handleError();
            }}
            onClose={closeModal} // Cerrar modal cuando se hace clic en "Cerrar"
            autoFocus={true}
            compact={true}
          />
        );

      case 'search':
        return (
          <div className="space-y-4">
            {/* Header de búsqueda con diseño mejorado */}
            <div className="text-center">
              <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-800 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-md">
                  <MagnifyingGlassIcon className="w-5 h-5 text-white" />
                </div>
                Buscar Vehículo
              </h3>
              <p className="text-sm text-gray-600">
                Encuentra vehículos activos en el parqueadero
              </p>
            </div>

            {/* Input de búsqueda con diseño moderno */}
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={plateInputRef}
                    type="text"
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                    placeholder="Ingresa la placa (ej: ABC123)..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gradient-to-r from-gray-50/50 to-blue-50/30 backdrop-blur-sm font-mono text-lg tracking-wider text-center transition-all duration-200 shadow-sm"
                    maxLength={8}
                  />
                  {searchPlate && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isSearching ? (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  )}
                </div>
                {isSearching && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-700 text-sm font-medium">Buscando...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados con diseño mejorado */}
            {searchPlate.length >= 3 && !isSearching && searchedVehicle && (
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 p-4 rounded-xl border border-green-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">🚗</span>
                    </div>
                    <div>
                      <span className="font-mono font-bold text-xl text-gray-900">{searchedVehicle.plate}</span>
                      <div className="text-sm text-gray-600 capitalize">{searchedVehicle.vehicle_type}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                      ✅ Activo
                    </span>
                    <span className="text-xs text-gray-500">Espacio #{searchedVehicle.spot_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-sm">
                    <div className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Hora de Entrada</div>
                    <div className="font-bold text-gray-900">{new Date(searchedVehicle.entry_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-xs text-gray-500">{new Date(searchedVehicle.entry_time).toLocaleDateString('es-CO')}</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg border border-white/50 shadow-sm">
                    <div className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Tiempo Transcurrido</div>
                    <div className="font-bold text-gray-900">{Math.floor(searchedVehicle.duration_minutes / 60)}h {searchedVehicle.duration_minutes % 60}m</div>
                    <div className="text-xs text-gray-500">{searchedVehicle.duration_minutes} minutos</div>
                  </div>
                </div>
              </div>
            )}

            {!isSearching && !searchedVehicle && searchPlate.length >= 3 && (
              <div className="text-center py-6">
                <div className="inline-flex flex-col items-center gap-3 px-6 py-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xl">🔍</span>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-800 font-semibold mb-1">Vehículo no encontrado</div>
                    <div className="text-yellow-700 text-sm">
                      No hay vehículos con la placa <span className="font-mono font-bold">{searchPlate}</span>
                    </div>
                    <div className="text-yellow-600 text-xs mt-1">Verifica la placa e intenta nuevamente</div>
                  </div>
                </div>
              </div>
            )}

            {!searchPlate && (
              <div className="text-center py-6">
                <div className="inline-flex flex-col items-center gap-3 px-6 py-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-slate-400 rounded-full flex items-center justify-center shadow-md">
                    <MagnifyingGlassIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-gray-700 font-semibold mb-1">Buscar vehículos</div>
                    <div className="text-gray-600 text-sm">Ingresa una placa para comenzar la búsqueda</div>
                    <div className="text-gray-500 text-xs mt-1">Ejemplo: ABC123, XYZ789</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Botones de acceso rápido */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveOperation('entry')}
              className="flex items-center gap-2 px-3 py-2 text-green-700 hover:bg-green-50 rounded-lg transition-colors group"
              title="Entrada (F1 o Ctrl/Cmd+E)"
            >
              <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Entrada</span>
              <kbd className="hidden group-hover:block text-xs bg-gray-100 px-1 rounded">F1</kbd>
            </button>

            <button
              onClick={() => setActiveOperation('exit')}
              className="flex items-center gap-2 px-3 py-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors group"
              title="Salida (F2 o Ctrl/Cmd+D)"
            >
              <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Salida</span>
              <kbd className="hidden group-hover:block text-xs bg-gray-100 px-1 rounded">F2</kbd>
            </button>

            <button
              onClick={() => setActiveOperation('search')}
              className="flex items-center gap-2 px-3 py-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group"
              title="Buscar (F3 o Ctrl/Cmd+B)"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Buscar</span>
              <kbd className="hidden group-hover:block text-xs bg-gray-100 px-1 rounded">F3</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Transition appear show={activeOperation !== null} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={closeModal}
          onKeyDown={handleKeyDown}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
        <Dialog.Panel
          className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-gray-100"
          data-modal="true"
        >
          {/* Header moderno con gradiente */}
          <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {/* Parqueadero con diseño mejorado */}
              <div className="flex items-center gap-4">
                {selectedParkingLot && (
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-gray-800 text-sm">
                      {selectedParkingLot.name}
                    </span>
                  </div>
                )}

                {/* Tabs con diseño moderno */}
                <div className="flex bg-white/50 backdrop-blur-sm rounded-full p-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setActiveOperation('entry')}
                    className={`${
                      activeOperation === 'entry'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md scale-105'
                        : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'
                    } px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5`}
                  >
                    <ArrowRightEndOnRectangleIcon className="w-3.5 h-3.5" />
                    Entrada
                  </button>
                  <button
                    onClick={() => setActiveOperation('exit')}
                    className={`${
                      activeOperation === 'exit'
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md scale-105'
                        : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'
                    } px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5`}
                  >
                    <ArrowLeftStartOnRectangleIcon className="w-3.5 h-3.5" />
                    Salida
                  </button>
                  <button
                    onClick={() => setActiveOperation('search')}
                    className={`${
                      activeOperation === 'search'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md scale-105'
                        : 'text-gray-600 hover:bg-white/70 hover:text-gray-800'
                    } px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5`}
                  >
                    <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                    Buscar
                  </button>
                </div>
              </div>

              {/* Botón cerrar mejorado */}
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-full p-2 transition-all duration-200 hover:scale-110"
                onClick={closeModal}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Contenido con fondo sutil */}
          <div className="bg-gradient-to-br from-gray-50/30 via-white to-gray-50/30 p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
              {renderModalContent()}
            </div>
          </div>

          {/* Footer moderno con gradiente */}
          <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 px-4 py-3 border-t border-gray-100">
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 bg-gradient-to-b from-white to-gray-100 border border-gray-200 rounded-md text-xs font-mono shadow-sm">F1</kbd>
                  <span className="font-medium">Entrada</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 bg-gradient-to-b from-white to-gray-100 border border-gray-200 rounded-md text-xs font-mono shadow-sm">F2</kbd>
                  <span className="font-medium">Salida</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 bg-gradient-to-b from-white to-gray-100 border border-gray-200 rounded-md text-xs font-mono shadow-sm">F3</kbd>
                  <span className="font-medium">Buscar</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 bg-gradient-to-b from-white to-gray-100 border border-gray-200 rounded-md text-xs font-mono shadow-sm">Esc</kbd>
                  <span className="font-medium">Cerrar</span>
                </span>
              </div>
            </div>
          </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
