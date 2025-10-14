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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <LuDollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Tarifas del Parqueadero</h3>
              <p className="text-indigo-100 text-sm">Precios por tipo de vehículo</p>
            </div>
          </div>
        </div>

        {/* Botón de editar tarifas */}
        <button
          onClick={() => navigate('/settings?tab=pricing')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 border border-white/20"
        >
          <LuSettings className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Editar Tarifas</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Pricing Cards Grid - Simplificado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vehicleTypes.map((vehicle) => {
            const pricing = getPricingForVehicle(vehicle.type);
            const Icon = vehicle.icon;

            return (
              <div
                key={vehicle.type}
                className={`group relative overflow-hidden rounded-xl border-2 ${vehicle.borderColor} ${vehicle.bgColor} hover:shadow-xl transition-all duration-300`}
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-black to-transparent transition-opacity duration-300" />

                <div className="relative p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 bg-gradient-to-br ${vehicle.gradient} rounded-xl shadow-md`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{vehicle.label}</h4>
                        <p className="text-xs text-slate-500">Tarifas vigentes</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Details - Simplificado */}
                  <div className="space-y-2">
                    {/* Per Hour */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Por hora</span>
                      <span className="text-lg font-bold text-slate-900">
                        ${Math.round(pricing.perHour).toLocaleString('es-CO')}
                      </span>
                    </div>

                    {/* Fixed Rate */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm text-amber-700">Tarifa fija (+{thresholdHours}h)</span>
                      <span className="text-lg font-bold text-amber-900">
                        ${Math.round(pricing.fixedRate).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info sobre tarifa fija */}
        <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <LuClock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Tarifa fija:</span> Después de {thresholdHours} horas, se aplica automáticamente la tarifa fija.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPanel;
