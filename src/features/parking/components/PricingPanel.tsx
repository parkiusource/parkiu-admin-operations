import React from 'react';
import { Car as LuCar, Truck as LuTruck, Clock as LuClock, DollarSign as LuDollarSign, Settings as LuSettings } from 'lucide-react';
import { FaMotorcycle, FaBicycle } from 'react-icons/fa';
import { ParkingLot } from '@/types/parking';
import { useNavigate } from 'react-router-dom';

interface PricingPanelProps {
  parkingLot: ParkingLot;
}

const vehicleTypes = [
  {
    type: 'car' as const,
    label: 'Automóvil',
    icon: LuCar,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700'
  },
  {
    type: 'motorcycle' as const,
    label: 'Motocicleta',
    icon: FaMotorcycle,
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700'
  },
  {
    type: 'bicycle' as const,
    label: 'Bicicleta',
    icon: FaBicycle,
    color: 'green',
    gradient: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700'
  },
  {
    type: 'truck' as const,
    label: 'Camión',
    icon: LuTruck,
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700'
  }
];

export const PricingPanel: React.FC<PricingPanelProps> = ({ parkingLot }) => {
  const navigate = useNavigate();

  const getPricingForVehicle = (type: string) => {
    const rateKey = `${type}_rate_per_minute` as keyof ParkingLot;
    const fixedRateKey = `fixed_rate_${type}` as keyof ParkingLot;

    const ratePerMinute = parkingLot[rateKey] as number || 0;
    const fixedRate = parkingLot[fixedRateKey] as number || 0;
    const hourlyRate = ratePerMinute * 60;

    return {
      perMinute: ratePerMinute,
      perHour: hourlyRate,
      fixedRate
    };
  };

  const thresholdHours = (parkingLot.fixed_rate_threshold_minutes || 720) / 60;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header - Más compacto en móvil */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
              <LuDollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-white">Tarifas</h3>
              <p className="text-indigo-100 text-[10px] sm:text-sm hidden xs:block">Por tipo de vehículo</p>
            </div>
          </div>
        </div>

        {/* Botón de editar tarifas */}
        <button
          onClick={() => navigate('/settings?tab=pricing')}
          className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 border border-white/20"
        >
          <LuSettings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span className="text-xs sm:text-sm font-medium text-white">Editar Tarifas</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-6">
        {/* Pricing Cards Grid - 2 columnas en móvil también */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {vehicleTypes.map((vehicle) => {
            const pricing = getPricingForVehicle(vehicle.type);
            const Icon = vehicle.icon;

            return (
              <div
                key={vehicle.type}
                className={`relative overflow-hidden rounded-lg sm:rounded-xl border ${vehicle.borderColor} ${vehicle.bgColor}`}
              >
                <div className="relative p-2.5 sm:p-4">
                  {/* Header compacto */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${vehicle.gradient} rounded-lg`}>
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{vehicle.label}</span>
                  </div>

                  {/* Pricing - Simplificado */}
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs text-slate-600">Por hora</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        ${Math.round(pricing.perHour).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] sm:text-xs text-amber-700">Fija (+{thresholdHours}h)</span>
                      <span className="text-xs sm:text-sm font-bold text-amber-900">
                        ${Math.round(pricing.fixedRate).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info sobre tarifa fija - Más compacto */}
        <div className="mt-3 sm:mt-6 p-2 sm:p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <LuClock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-amber-800">
              Tarifa fija después de {thresholdHours}h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPanel;
