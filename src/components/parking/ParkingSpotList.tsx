import { FaClock, FaMotorcycle, FaBiking } from 'react-icons/fa';
import { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/common/Badge';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Car, Shield, Info } from 'lucide-react';

interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  distance?: number;
  isGooglePlace?: boolean;
  businessStatus?: string;
  available_spaces: number;
  price_per_hour?: number;
  price_per_minute: number;
  carRate?: number;
  motorcycleRate?: number;
  bikeRate?: number;
  hasFullRate?: boolean;
  is24h?: boolean;
  operatingHours?: string;
  heightRestriction?: string;
  rating?: number;
  userRatingCount?: number;
}

interface ParkingSpotCardProps {
  parking: ParkingSpot;
  onClick: () => void;
  index: number;
  isSelected: boolean;
}

const ParkingSpotCard = memo(({ parking, onClick, index, isSelected }: ParkingSpotCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTitle = useCallback((title: string) => {
    return title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const getStatusBadge = useCallback(() => {
    const isParkiu = !parking.isGooglePlace;

    if (isParkiu) {
      if (parking.available_spaces > 0) {
        return <Badge variant="success" size="small" className="bg-green-50 text-green-700 border-green-200">Disponible</Badge>;
      }
      return <Badge variant="error" size="small" className="bg-red-50 text-red-700 border-red-200">Lleno</Badge>;
    } else {
      if (parking.businessStatus === 'OPERATIONAL') {
        return <Badge variant="success" size="small" className="bg-blue-50 text-blue-700 border-blue-200">Abierto</Badge>;
      }
      return <Badge variant="error" size="small" className="bg-gray-50 text-gray-700 border-gray-200">Cerrado</Badge>;
    }
  }, [parking]);

  const isParkiu = !parking.isGooglePlace;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      className={`bg-white border rounded-xl cursor-pointer overflow-hidden
        ${isParkiu ? 'border-gray-200 hover:border-primary/20' : 'border-gray-200 hover:border-gray-300'}
        ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}
      `}
      onClick={onClick}
    >
      <div className="relative">
        {/* Top accent bar */}
        <div className={`w-full h-1 ${isParkiu ? 'bg-primary' : 'bg-gray-200'}`} />

        <div className="p-3 sm:p-4">
          {/* Header Section - Optimizado para móvil */}
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-1">
                  {formatTitle(parking.name)}
                </h3>
                {index === 0 && (
                  <Badge variant="primary" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1.5 hidden sm:inline-flex">
                    Más cercano
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 text-gray-400" />
                  <span className="line-clamp-1">{parking.address}</span>
                </div>
                {parking.distance && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    • {parking.distance.toFixed(1)} metros
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 sm:gap-1.5">
              {getStatusBadge()}
              {isParkiu ? (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                  <img src="/icons/providers/parkiu.svg" alt="Parkiu" className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  Parkiu
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                  <img src="/icons/providers/google.svg" alt="Google" className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  Google
                </span>
              )}
            </div>
          </div>

          {/* Main Content Section - Optimizado para móvil */}
          {isParkiu ? (
            <>
              {/* Availability and Price Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex items-center p-2 sm:p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {parking.available_spaces} disponibles
                  </span>
                </div>
                <div className="flex items-center p-2 sm:p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    Desde ${parking.price_per_hour?.toLocaleString()}/h
                  </span>
                </div>
              </div>

              {/* Ver detalles button - Optimizado para móvil */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="w-full flex items-center justify-center text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors py-1 sm:py-1.5 border border-primary/20 rounded-lg hover:bg-primary/5"
              >
                {isExpanded ? "Ocultar detalles ▲" : "Ver detalles ▼"}
              </button>

              {/* Expandable Details Section - Optimizado para móvil */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 space-y-4 sm:space-y-6"
                  >
                    {/* Tarifas por tipo de vehículo */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Tarifas por tipo de vehículo</h4>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {/* Tarjeta de Carro */}
                        <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <Car className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mb-1" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs font-medium text-gray-900">
                              ${parking.carRate?.toLocaleString()}/h
                            </span>
                            {parking.price_per_minute > 0 && (
                              <span className="text-[8px] sm:text-[10px] text-gray-500">
                                ${parking.price_per_minute}/min
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Tarjeta de Moto */}
                        <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <FaMotorcycle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mb-1" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs font-medium text-gray-900">
                              ${parking.motorcycleRate?.toLocaleString()}/h
                            </span>
                            {parking.price_per_minute > 0 && (
                              <span className="text-[8px] sm:text-[10px] text-gray-500">
                                ${Math.round(parking.price_per_minute * 0.7)}/min
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Tarjeta de Bicicleta */}
                        <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <FaBiking className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mb-1" />
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs font-medium text-gray-900">
                              ${parking.bikeRate?.toLocaleString()}/h
                            </span>
                            {parking.price_per_minute > 0 && (
                              <span className="text-[8px] sm:text-[10px] text-gray-500">
                                ${Math.round(parking.price_per_minute * 0.5)}/min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Tarifa plena nota */}
                      {parking.hasFullRate && (
                        <div className="mt-2 text-[10px] sm:text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-1.5 sm:p-2 flex items-center">
                          <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 mr-1.5 flex-shrink-0" />
                          <span>Tarifa plena disponible para estadías prolongadas</span>
                        </div>
                      )}
                    </div>

                    {/* Información adicional en acordeón */}
                    <div className="space-y-3">
                      {/* Horario y Servicios */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FaClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                            <span className="text-[10px] sm:text-xs font-medium text-gray-900">Horario</span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-600">
                            {parking.is24h ? 'Abierto 24/7' : parking.operatingHours}
                          </span>
                        </div>
                        <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                            <span className="text-[10px] sm:text-xs font-medium text-gray-900">Seguridad</span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-600">Vigilancia 24/7</span>
                        </div>
                      </div>

                      {/* Restricciones */}
                      {parking.heightRestriction && (
                        <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-[10px] sm:text-xs text-gray-600">
                            Altura máxima: {parking.heightRestriction}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="space-y-3">
              {/* Google Places Rating Section */}
              {parking.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-900">
                    {parking.rating.toFixed(1)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    ({parking.userRatingCount} reseñas)
                  </span>
                </div>
              )}

              {/* Admin CTA Section */}
              <Link
                to="/admin/landing"
                className="block p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-medium text-gray-900">¿Eres el administrador?</p>
                <p className="text-xs text-gray-600 mt-1">
                  Únete a Parkiu y gestiona tu parqueadero en tiempo real
                </p>
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ParkingSpotCard.displayName = 'ParkingSpotCard';

interface ParkingSpotListProps {
  spots: ParkingSpot[];
  onSpotClick: (spot: ParkingSpot) => void;
  selectedSpot: ParkingSpot | null;
}

export const ParkingSpotList = ({ spots, onSpotClick, selectedSpot }: ParkingSpotListProps) => {
  const handleSpotClick = useCallback((spot: ParkingSpot) => {
    onSpotClick(spot);
  }, [onSpotClick]);

  return (
    <div className="space-y-4">
      {spots.map((spot) => (
        <ParkingSpotCard
          key={spot.id}
          parking={spot}
          onClick={() => handleSpotClick(spot)}
          index={spots.indexOf(spot)}
          isSelected={selectedSpot?.id === spot.id}
        />
      ))}
    </div>
  );
};

ParkingSpotList.displayName = 'ParkingSpotList';

export default ParkingSpotList;
