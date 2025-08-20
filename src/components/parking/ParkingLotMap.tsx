import { useState } from 'react';
import { LuCar, LuZoomIn, LuZoomOut, LuGrid3X3 } from 'react-icons/lu';
import { FaMotorcycle } from 'react-icons/fa';
import { ParkingSpot } from '@/services/parking/types';

interface ParkingLotMapProps {
  spots: ParkingSpot[];
  onSpotClick?: (spot: ParkingSpot) => void;
  selectedSpotId?: string | number | null;
  viewMode?: 'grid' | 'realistic';
}

export function ParkingLotMap({
  spots,
  onSpotClick,
  selectedSpotId,
  viewMode: initialViewMode = 'realistic'
}: ParkingLotMapProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'realistic'>(initialViewMode);
  const [zoom, setZoom] = useState(1);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  // Separar spots por tipo
  const carSpots = spots.filter(spot => spot.type === 'car');
  const motorcycleSpots = spots.filter(spot => spot.type === 'motorcycle');

  // Configuración de colores por estado
  const getSpotStyle = (spot: ParkingSpot) => {
    const baseClasses = "relative transition-all duration-300 cursor-pointer transform hover:scale-105";
    const isSelected = selectedSpotId === spot.id;

    switch (spot.status) {
      case 'available':
        return `${baseClasses} bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-emerald-200 ${
          isSelected ? 'ring-4 ring-emerald-300 scale-110' : ''
        }`;
      case 'occupied':
        return `${baseClasses} bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 shadow-red-200 ${
          isSelected ? 'ring-4 ring-red-300 scale-110' : ''
        }`;
      case 'maintenance':
        return `${baseClasses} bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-amber-200 ${
          isSelected ? 'ring-4 ring-amber-300 scale-110' : ''
        }`;
      default:
        return `${baseClasses} bg-gradient-to-br from-slate-300 to-slate-500 ${
          isSelected ? 'ring-4 ring-slate-300 scale-110' : ''
        }`;
    }
  };

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    onSpotClick?.(spot);
  };

    // Componente para espacios realistas de autos
  const RealisticCarSpot = ({ spot, onClick }: { spot: ParkingSpot; onClick: () => void }) => {
    const getCarSpotColor = () => {
      switch (spot.status) {
        case 'available':
          return 'bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-600';
        case 'occupied':
          return 'bg-gradient-to-br from-red-400 to-red-500 border-red-600';
        case 'maintenance':
          return 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600';
        default:
          return 'bg-gradient-to-br from-slate-300 to-slate-400 border-slate-500';
      }
    };

    return (
      <div
        className="relative cursor-pointer transform hover:scale-105 transition-all duration-200"
        onClick={onClick}
        title={`Espacio ${spot.number} - ${spot.status}`}
      >
        {/* Líneas del espacio de parqueo */}
        <div className={`w-20 h-12 ${getCarSpotColor()} border-2 rounded-md shadow-lg relative overflow-hidden`}>

          {/* Líneas delimitadoras del espacio */}
          <div className="absolute inset-x-0 top-0 h-1 bg-white opacity-60"></div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white opacity-60"></div>
          <div className="absolute inset-y-0 left-0 w-1 bg-white opacity-60"></div>
          <div className="absolute inset-y-0 right-0 w-1 bg-white opacity-60"></div>

          {/* Ícono del auto y número */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <LuCar className="w-5 h-5 text-white mb-1 mx-auto drop-shadow-sm" />
              <div className="text-xs font-bold text-white drop-shadow-sm">{spot.number}</div>
            </div>
          </div>

          {/* Indicador de estado con pulsación */}
          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
            spot.status === 'available' ? 'bg-white' :
            spot.status === 'occupied' ? 'bg-yellow-300' : 'bg-orange-300'
          } animate-pulse shadow-sm`}></div>
        </div>

        {/* Número del espacio debajo */}
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2">
          <div className="text-xs font-semibold text-slate-600 bg-white px-1 rounded shadow-sm">
            {spot.number}
          </div>
        </div>
      </div>
    );
  };

  // Componente para espacios realistas de motocicletas
  const RealisticMotorcycleSpot = ({ spot, onClick }: { spot: ParkingSpot; onClick: () => void }) => {
    const getMotorcycleSpotColor = () => {
      switch (spot.status) {
        case 'available':
          return 'bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-600';
        case 'occupied':
          return 'bg-gradient-to-br from-red-400 to-red-500 border-red-600';
        case 'maintenance':
          return 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600';
        default:
          return 'bg-gradient-to-br from-slate-300 to-slate-400 border-slate-500';
      }
    };

    return (
            <div
        className="relative cursor-pointer transform hover:scale-110 transition-all duration-200"
        onClick={onClick}
        title={`Espacio ${spot.number} - ${spot.status}`}
        style={{ paddingBottom: '24px' }} // Espacio extra para el label
      >
        {/* Espacio más pequeño para motos */}
        <div className={`w-14 h-8 ${getMotorcycleSpotColor()} border-2 rounded-md shadow-md relative overflow-hidden`}>

          {/* Líneas delimitadoras */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white opacity-60"></div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white opacity-60"></div>
          <div className="absolute inset-y-0 left-0 w-0.5 bg-white opacity-60"></div>
          <div className="absolute inset-y-0 right-0 w-0.5 bg-white opacity-60"></div>

          {/* Ícono de moto */}
          <div className="absolute inset-0 flex items-center justify-center">
            <FaMotorcycle className="w-3 h-3 text-white drop-shadow-sm" />
          </div>

          {/* Indicador de estado */}
          <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
            spot.status === 'available' ? 'bg-white' :
            spot.status === 'occupied' ? 'bg-yellow-300' : 'bg-orange-300'
          } animate-pulse`}></div>
        </div>

        {/* Número pequeño mejorado */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="text-xs font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded-md shadow-lg border border-slate-300 min-w-[20px] text-center whitespace-nowrap">
            {spot.number}
          </div>
        </div>
      </div>
    );
  };

  // Componente simple para vista de cuadrícula
  const SpotElement = ({ spot }: { spot: ParkingSpot }) => {
    const IconComponent = spot.type === 'car' ? LuCar : FaMotorcycle;

    return (
      <div
        className={`${getSpotStyle(spot)} rounded-lg shadow-lg h-12 w-12`}
        onClick={() => handleSpotClick(spot)}
        title={`Espacio ${spot.number} - ${spot.status}`}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center',
          zIndex: 1
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <IconComponent className="w-4 h-4 mb-1" />
          <span className="text-xs font-bold">{spot.number}</span>
        </div>

        {/* Indicador de estado */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          spot.status === 'available' ? 'bg-green-400' :
          spot.status === 'occupied' ? 'bg-red-400' : 'bg-yellow-400'
        } border-2 border-white shadow-sm animate-pulse`}></div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <LuGrid3X3 className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Mapa del Parqueadero</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('realistic')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'realistic'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Realista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cuadrícula
            </button>
          </div>

          {/* Controles de zoom */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setZoom(Math.max(0.8, zoom - 0.2))}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
              disabled={zoom <= 0.8}
            >
              <LuZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm font-medium text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(1.5, zoom + 0.2))}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
              disabled={zoom >= 1.5}
            >
              <LuZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6 mb-6 p-3 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded shadow-sm"></div>
          <span className="text-sm font-medium text-slate-700">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded shadow-sm"></div>
          <span className="text-sm font-medium text-slate-700">Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded shadow-sm"></div>
          <span className="text-sm font-medium text-slate-700">Mantenimiento</span>
        </div>
      </div>

      {/* Mapa del parqueadero */}
      <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-8 min-h-[500px] overflow-hidden" style={{ isolation: 'isolate' }}>
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)`
          }}></div>
        </div>

                {viewMode === 'realistic' ? (
          /* Vista realista genérica - se adapta a cualquier parqueadero */
          <div className="relative z-10">

            {/* Sección de automóviles con layout flexible */}
            {carSpots.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
                    <LuCar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">Automóviles ({carSpots.length})</span>
                  </div>
                </div>

                {/* Grid flexible que se adapta al número de espacios */}
                <div className="space-y-6">
                  {Array.from({ length: Math.ceil(carSpots.length / 6) }).map((_, rowIndex) => (
                    <div key={`car-row-${rowIndex}`} className="flex flex-col items-center gap-4">
                      {/* Fila de espacios */}
                      <div className="flex gap-3 justify-center flex-wrap">
                        {carSpots.slice(rowIndex * 6, (rowIndex + 1) * 6).map((spot) => (
                          <div key={spot.id} className="relative mb-3">
                            <RealisticCarSpot spot={spot} onClick={() => handleSpotClick(spot)} />
                          </div>
                        ))}
                      </div>

                      {/* Pasillo entre filas (solo si no es la última fila) */}
                      {rowIndex < Math.ceil(carSpots.length / 6) - 1 && (
                        <div className="w-full max-w-md h-4 bg-gradient-to-r from-transparent via-slate-300 to-transparent opacity-50 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Separador entre zonas si ambas existen */}
            {carSpots.length > 0 && motorcycleSpots.length > 0 && (
              <div className="my-8 flex items-center">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent"></div>
                <div className="mx-4 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                  ZONA DE MOTOCICLETAS
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent"></div>
              </div>
            )}

            {/* Sección de motocicletas con layout compacto */}
            {motorcycleSpots.length > 0 && (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                    <FaMotorcycle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Motocicletas ({motorcycleSpots.length})</span>
                  </div>
                </div>

                {/* Grid compacto para motocicletas (más espacios por fila) */}
                <div className="space-y-6">
                  {Array.from({ length: Math.ceil(motorcycleSpots.length / 8) }).map((_, rowIndex) => (
                    <div key={`moto-row-${rowIndex}`} className="flex flex-col items-center gap-4">
                      {/* Fila de espacios de motos */}
                      <div className="flex gap-3 justify-center flex-wrap">
                        {motorcycleSpots.slice(rowIndex * 8, (rowIndex + 1) * 8).map((spot) => (
                          <div key={spot.id} className="relative mb-8">
                            <RealisticMotorcycleSpot spot={spot} onClick={() => handleSpotClick(spot)} />
                          </div>
                        ))}
                      </div>

                      {/* Pasillo entre filas de motos */}
                      {rowIndex < Math.ceil(motorcycleSpots.length / 8) - 1 && (
                        <div className="w-full max-w-sm h-2 bg-gradient-to-r from-transparent via-slate-300 to-transparent opacity-30 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Vista de cuadrícula */
          <div className="relative z-10">
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 justify-center">
              {spots.map((spot) => (
                <div key={spot.id} className="flex justify-center">
                  <SpotElement spot={spot} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel de información del spot seleccionado */}
      {selectedSpot && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                              {selectedSpot.type === 'car' ? (
                <LuCar className="w-5 h-5 text-blue-600" />
              ) : (
                <FaMotorcycle className="w-5 h-5 text-blue-600" />
              )}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Espacio {selectedSpot.number}</h4>
                <p className="text-sm text-slate-600">
                  {selectedSpot.type === 'car' ? 'Automóvil' : 'Motocicleta'} • Estado: {selectedSpot.status}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSpot(null)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
