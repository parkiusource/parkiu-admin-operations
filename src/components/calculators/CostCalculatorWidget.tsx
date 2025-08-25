import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Label } from '@/components/common/Label';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
// import { Slider } from '@/components/ui/slider'; // TODO: Create or install slider component
import {
  Car,
  Bike,
  Truck,
  Calculator,
  Clock,

  AlertTriangle,
  TrendingUp,
  Info,
  BarChart3,
  Zap
} from 'lucide-react';
import { VehicleType, ParkingLot } from '@/types/parking';
import { VehicleService } from '@/api/services/vehicleService';

interface CostCalculatorWidgetProps {
  parkingLot: ParkingLot;
  className?: string;
}

const vehicleTypes = [
  {
    value: 'car' as VehicleType,
    label: 'Carro 🚗',
    icon: Car,
    color: 'bg-blue-500 hover:bg-blue-600 text-white',
    lightColor: 'bg-blue-50 border-blue-200 text-blue-700'
  },
  {
    value: 'motorcycle' as VehicleType,
    label: 'Moto 🏍️',
    icon: Bike,
    color: 'bg-green-500 hover:bg-green-600 text-white',
    lightColor: 'bg-green-50 border-green-200 text-green-700'
  },
  {
    value: 'bicycle' as VehicleType,
    label: 'Bicicleta 🚲',
    icon: Bike,
    color: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    lightColor: 'bg-yellow-50 border-yellow-200 text-yellow-700'
  },
  {
    value: 'truck' as VehicleType,
    label: 'Camión 🚛',
    icon: Truck,
    color: 'bg-red-500 hover:bg-red-600 text-white',
    lightColor: 'bg-red-50 border-red-200 text-red-700'
  },
];

const timePresets = [
  { label: '30min', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '8h', minutes: 480 },
  { label: '12h', minutes: 720 },
  { label: '24h', minutes: 1440 },
];

export const CostCalculatorWidget: React.FC<CostCalculatorWidgetProps> = ({
  parkingLot,
  className
}) => {
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('car');
  const [duration, setDuration] = useState(60); // minutos
  const [customEntry, setCustomEntry] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const selectedVehicle = vehicleTypes.find(v => v.value === selectedVehicleType);

  // Calcular costo usando el servicio
  const costInfo = VehicleService.estimateCost(duration, selectedVehicleType, parkingLot);

  // Calcular break-even point para tarifa fija
  const ratePerMinute = parkingLot[`${selectedVehicleType}_rate_per_minute` as keyof ParkingLot] as number;
  const fixedRate = parkingLot[`fixed_rate_${selectedVehicleType}` as keyof ParkingLot] as number;
  const breakEvenMinutes = Math.ceil(fixedRate / ratePerMinute);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${remainingMinutes}m`;
  };

  const handleTimePresetClick = (minutes: number) => {
    setDuration(minutes);
  };

  const handleCustomEntryChange = (value: string) => {
    setCustomEntry(value);
    const entryTime = new Date(value);
    if (!isNaN(entryTime.getTime())) {
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - entryTime.getTime()) / (1000 * 60));
      if (diffMinutes > 0) {
        setDuration(diffMinutes);
      }
    }
  };

  const CostBreakdown = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Tarifa aplicada:</span>
          <Badge variant={costInfo.is_fixed_rate ? "error" : "primary"}>
            {costInfo.rate_description}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span>Por minuto: </span>
            <span className="font-mono">${ratePerMinute.toFixed(2)}</span>
          </div>
          <div>
            <span>Tarifa fija: </span>
            <span className="font-mono">${fixedRate.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {costInfo.is_fixed_rate && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Tarifa fija aplicada</span>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            Tiempo excedido: {formatDuration(duration - parkingLot.fixed_rate_threshold_minutes)}
          </p>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">Break-even point:</span>
          <span className="text-sm font-bold text-blue-800">
            {formatDuration(breakEvenMinutes)}
          </span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Después de este tiempo es mejor la tarifa fija
        </p>
      </div>
    </div>
  );

  const ComparisonView = () => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Comparación por Tipo de Vehículo
      </h4>

      <div className="grid grid-cols-1 gap-2">
        {vehicleTypes.map((vehicleType) => {
          const cost = VehicleService.estimateCost(duration, vehicleType.value, parkingLot);
          const Icon = vehicleType.icon;

          return (
            <div
              key={vehicleType.value}
              className={`p-3 rounded-lg border-2 ${vehicleType.lightColor} transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{vehicleType.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">${cost.calculated_cost.toLocaleString()}</div>
                  <div className="text-xs opacity-75">
                    {cost.is_fixed_rate ? 'Tarifa fija' : 'Por minuto'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-purple-700">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Calculator className="w-6 h-6 text-purple-600" />
          </div>
          Calculadora de Costos
        </CardTitle>
        <p className="text-sm text-gray-600">
          Simule costos de estacionamiento por tipo de vehículo y duración
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Selección de Tipo de Vehículo */}
        <div>
          <Label className="text-base font-medium mb-3 block">
            Tipo de Vehículo
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {vehicleTypes.map((vehicleType) => {
              const Icon = vehicleType.icon;
              const isSelected = selectedVehicleType === vehicleType.value;

              return (
                <button
                  key={vehicleType.value}
                  type="button"
                  onClick={() => setSelectedVehicleType(vehicleType.value)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? vehicleType.color + ' shadow-lg transform scale-105'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                    <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {vehicleType.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuración de Duración */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-medium">
              Duración
            </Label>
            <span className="text-sm text-gray-600">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Presets de tiempo */}
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-4">
            {timePresets.map((preset) => (
              <Button
                key={preset.minutes}
                variant={duration === preset.minutes ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimePresetClick(preset.minutes)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Slider para duración personalizada */}
          <div className="space-y-3">
            <input
              type="range"
              value={duration}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(Number(e.target.value))}
              max={1440}
              min={15}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>15min</span>
              <span>6h</span>
              <span>12h</span>
              <span>24h</span>
            </div>
          </div>

          {/* Entrada personalizada por hora de entrada */}
          <div className="mt-3">
            <Label className="text-sm">O calcular desde hora de entrada:</Label>
            <Input
              type="datetime-local"
              value={customEntry}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomEntryChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Resultado Principal */}
        {selectedVehicle && (
          <div className={`p-6 rounded-xl border-2 ${selectedVehicle.lightColor}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <selectedVehicle.icon className="w-8 h-8" />
                <div>
                  <h3 className="font-bold text-lg">{selectedVehicle.label}</h3>
                  <p className="text-sm opacity-75">{formatDuration(duration)}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold">
                  ${costInfo.calculated_cost.toLocaleString()}
                </div>
                <div className="text-sm opacity-75">
                  ≈ ${Math.round(costInfo.calculated_cost / costInfo.equivalent_hours).toLocaleString()}/hora
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{costInfo.equivalent_hours.toFixed(1)} horas</span>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>
                  {costInfo.is_fixed_rate ? 'Tarifa fija' : `$${costInfo.rate_per_minute.toFixed(2)}/min`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Información Detallada */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={!showComparison ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComparison(false)}
              className="flex-1"
            >
              <Info className="w-4 h-4 mr-2" />
              Desglose
            </Button>
            <Button
              variant={showComparison ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComparison(true)}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparar
            </Button>
          </div>

          {showComparison ? <ComparisonView /> : <CostBreakdown />}
        </div>

        {/* Tips */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">💡 Tips de optimización:</p>
              <ul className="text-xs mt-1 space-y-1 text-blue-600">
                <li>• Para estadías largas ({'>'}{Math.round(breakEvenMinutes/60)}h), se aplica automáticamente la tarifa fija</li>
                <li>• Las bicicletas tienen la tarifa más económica</li>
                <li>• Los camiones tienen recargo por ocupar más espacio</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
