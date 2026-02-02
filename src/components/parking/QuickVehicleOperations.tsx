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
            onSuccess={() => {
              handleSuccess();
            }}
            onError={() => {
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
            onSuccess={() => {
              handleSuccess();
            }}
            onError={() => {
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
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={plateInputRef}
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                placeholder="Placa (ej: ABC123)"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-base"
                maxLength={8}
              />
              {searchPlate && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isSearching ? (
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse block" />
                  ) : (
                    <span className="w-2 h-2 bg-green-500 rounded-full block" />
                  )}
                </span>
              )}
            </div>
            {isSearching && (
              <p className="text-sm text-gray-500">Buscando...</p>
            )}

            {searchPlate.length >= 3 && !isSearching && searchedVehicle && (
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono font-semibold text-gray-900">{searchedVehicle.plate}</span>
                    <span className="ml-2 text-xs text-gray-500 capitalize">{searchedVehicle.vehicle_type}</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Activo · Espacio {searchedVehicle.spot_number}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Entrada</span>
                    <p className="font-medium text-gray-900">{new Date(searchedVehicle.entry_time).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tiempo</span>
                    <p className="font-medium text-gray-900">{Math.floor(searchedVehicle.duration_minutes / 60)}h {searchedVehicle.duration_minutes % 60}m</p>
                  </div>
                </div>
              </div>
            )}

            {!isSearching && !searchedVehicle && searchPlate.length >= 3 && (
              <p className="text-sm text-amber-700 py-2">
                No se encontró vehículo con placa <span className="font-mono font-medium">{searchPlate}</span>
              </p>
            )}

            {!searchPlate && (
              <p className="text-sm text-gray-500">Escribe una placa para buscar.</p>
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
          className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all border border-gray-200"
          data-modal="true"
        >
          {/* Header simple */}
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedParkingLot && (
                <span className="text-sm font-medium text-gray-700 truncate">
                  {selectedParkingLot.name}
                </span>
              )}
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button
                  onClick={() => setActiveOperation('entry')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeOperation === 'entry'
                      ? 'bg-white text-green-700 shadow border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ArrowRightEndOnRectangleIcon className="w-3.5 h-3.5" />
                  Entrada
                </button>
                <button
                  onClick={() => setActiveOperation('exit')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeOperation === 'exit'
                      ? 'bg-white text-red-700 shadow border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ArrowLeftStartOnRectangleIcon className="w-3.5 h-3.5" />
                  Salida
                </button>
                <button
                  onClick={() => setActiveOperation('search')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeOperation === 'search'
                      ? 'bg-white text-blue-700 shadow border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  Buscar
                </button>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={closeModal}
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-5">
            {renderModalContent()}
          </div>

          {/* Footer atajos */}
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-500">
            <span><kbd className="font-mono">F1</kbd> Entrada</span>
            <span><kbd className="font-mono">F2</kbd> Salida</span>
            <span><kbd className="font-mono">F3</kbd> Buscar</span>
            <span><kbd className="font-mono">Esc</kbd> Cerrar</span>
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
