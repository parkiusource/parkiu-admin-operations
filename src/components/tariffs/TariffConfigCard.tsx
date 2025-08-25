import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Label } from '@/components/common/Label';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Alert, AlertDescription } from '@/components/common/Alert';
import {
  Car,
  Bike,
  Truck,
  Calculator,
  Clock,
  DollarSign,
  Info,
  Check
} from 'lucide-react';
import { ParkingLot, VehicleType } from '@/types/parking';

interface TariffConfigCardProps {
  parkingLot?: Partial<ParkingLot>;
  onSave: (tariffs: TariffConfig) => void;
  isLoading?: boolean;
}

interface TariffConfig {
  car_rate_per_minute: number;
  motorcycle_rate_per_minute: number;
  bicycle_rate_per_minute: number;
  truck_rate_per_minute: number;
  fixed_rate_car: number;
  fixed_rate_motorcycle: number;
  fixed_rate_bicycle: number;
  fixed_rate_truck: number;
  fixed_rate_threshold_minutes: number;
}

const vehicleIcons = {
  car: Car,
  motorcycle: Bike,
  bicycle: Bike,
  truck: Truck,
} as const;

const vehicleColors = {
  car: 'bg-blue-50 border-blue-200 text-blue-700',
  motorcycle: 'bg-green-50 border-green-200 text-green-700',
  bicycle: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  truck: 'bg-red-50 border-red-200 text-red-700',
} as const;

const vehicleLabels = {
  car: 'Carros 🚗',
  motorcycle: 'Motos 🏍️',
  bicycle: 'Bicicletas 🚲',
  truck: 'Camiones 🚛',
} as const;

export const TariffConfigCard: React.FC<TariffConfigCardProps> = ({
  parkingLot,
  onSave,
  isLoading = false
}) => {
  const [tariffs, setTariffs] = useState<TariffConfig>({
    car_rate_per_minute: parkingLot?.car_rate_per_minute || 83.33,
    motorcycle_rate_per_minute: parkingLot?.motorcycle_rate_per_minute || 25.0,
    bicycle_rate_per_minute: parkingLot?.bicycle_rate_per_minute || 5.0,
    truck_rate_per_minute: parkingLot?.truck_rate_per_minute || 125.0,
    fixed_rate_car: parkingLot?.fixed_rate_car || 35000,
    fixed_rate_motorcycle: parkingLot?.fixed_rate_motorcycle || 15000,
    fixed_rate_bicycle: parkingLot?.fixed_rate_bicycle || 8000,
    fixed_rate_truck: parkingLot?.fixed_rate_truck || 50000,
    fixed_rate_threshold_minutes: parkingLot?.fixed_rate_threshold_minutes || 720,
  });

  const [showPreview, setShowPreview] = useState(false);

  const updateTariff = (field: keyof TariffConfig, value: number) => {
    setTariffs(prev => ({ ...prev, [field]: value }));
  };

  const calculateHourlyEquivalent = (ratePerMinute: number) => {
    return Math.round(ratePerMinute * 60);
  };

  const calculateBreakEvenHours = (ratePerMinute: number, fixedRate: number, threshold: number) => {
    const breakEven = fixedRate / ratePerMinute;
    const thresholdHours = threshold / 60;
    return { breakEven: Math.round(breakEven / 60), threshold: Math.round(thresholdHours) };
  };

  const VehicleTariffSection = ({
    vehicleType,
    ratePerMinute,
    fixedRate
  }: {
    vehicleType: VehicleType;
    ratePerMinute: number;
    fixedRate: number;
  }) => {
    const Icon = vehicleIcons[vehicleType];
    const colorClass = vehicleColors[vehicleType];
    const hourlyRate = calculateHourlyEquivalent(ratePerMinute);
    const { breakEven, threshold } = calculateBreakEvenHours(
      ratePerMinute,
      fixedRate,
      tariffs.fixed_rate_threshold_minutes
    );

    return (
      <div className={`rounded-lg border-2 p-4 ${colorClass} transition-all hover:shadow-md`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/50">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{vehicleLabels[vehicleType]}</h3>
            <p className="text-sm opacity-75">
              ${hourlyRate.toLocaleString()}/hora
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">Tarifa por Minuto ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={ratePerMinute}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTariff(
                `${vehicleType}_rate_per_minute` as keyof TariffConfig,
                parseFloat(e.target.value) || 0
              )}
              className="mt-1 bg-white/70"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Tarifa Fija ($)</Label>
            <Input
              type="number"
              value={fixedRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTariff(
                `fixed_rate_${vehicleType}` as keyof TariffConfig,
                parseFloat(e.target.value) || 0
              )}
              className="mt-1 bg-white/70"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="info" className="text-xs">
            <Calculator className="w-3 h-3 mr-1" />
            Break-even: {breakEven}h
          </Badge>
          <Badge variant="warning" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Fija después: {threshold}h
          </Badge>
        </div>
      </div>
    );
  };

  const CostPreview = () => {
    const durations = [30, 60, 120, 480, 720]; // 30min, 1h, 2h, 8h, 12h

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Vista Previa de Costos
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Vehículo</th>
                <th className="text-center py-2">30min</th>
                <th className="text-center py-2">1h</th>
                <th className="text-center py-2">2h</th>
                <th className="text-center py-2">8h</th>
                <th className="text-center py-2">12h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(['car', 'motorcycle', 'bicycle', 'truck'] as VehicleType[]).map(vehicleType => {
                const rate = tariffs[`${vehicleType}_rate_per_minute` as keyof TariffConfig] as number;
                const fixedRate = tariffs[`fixed_rate_${vehicleType}` as keyof TariffConfig] as number;

                return (
                  <tr key={vehicleType} className="hover:bg-gray-25">
                    <td className="py-2 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${vehicleColors[vehicleType].split(' ')[0]}`}></div>
                      {vehicleLabels[vehicleType]}
                    </td>
                    {durations.map(minutes => {
                      const isFixed = minutes >= tariffs.fixed_rate_threshold_minutes;
                      const cost = isFixed ? fixedRate : minutes * rate;

                      return (
                        <td key={minutes} className="text-center py-2">
                          <span className={isFixed ? 'font-bold text-orange-600' : ''}>
                            ${Math.round(cost).toLocaleString()}
                          </span>
                          {isFixed && <sup className="text-orange-500">*</sup>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          <sup>*</sup> Tarifa fija aplicada después de {Math.round(tariffs.fixed_rate_threshold_minutes / 60)} horas
        </div>
      </div>
    );
  };

  const handleSave = () => {
    onSave(tariffs);
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              🇨🇴 Configuración de Tarifas Colombianas
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Configure las tarifas por tipo de vehículo con tarifa fija automática
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Ocultar' : 'Mostrar'} Vista Previa
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Las tarifas se cobran por minuto hasta el umbral configurado, después se aplica la tarifa fija automáticamente.
          </AlertDescription>
        </Alert>

        {/* Configuración de Umbral */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Configuración de Tarifa Fija</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label>Aplicar tarifa fija después de (minutos)</Label>
              <Input
                type="number"
                value={tariffs.fixed_rate_threshold_minutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTariff('fixed_rate_threshold_minutes', parseInt(e.target.value) || 720)}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2 flex items-center">
              <div className="text-sm text-blue-700">
                ≈ <strong>{Math.round(tariffs.fixed_rate_threshold_minutes / 60)} horas</strong>
                <p className="text-xs mt-1">
                  Después de este tiempo se cobra automáticamente la tarifa fija
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tarifas por Tipo de Vehículo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VehicleTariffSection
            vehicleType="car"
            ratePerMinute={tariffs.car_rate_per_minute}
            fixedRate={tariffs.fixed_rate_car}
          />
          <VehicleTariffSection
            vehicleType="motorcycle"
            ratePerMinute={tariffs.motorcycle_rate_per_minute}
            fixedRate={tariffs.fixed_rate_motorcycle}
          />
          <VehicleTariffSection
            vehicleType="bicycle"
            ratePerMinute={tariffs.bicycle_rate_per_minute}
            fixedRate={tariffs.fixed_rate_bicycle}
          />
          <VehicleTariffSection
            vehicleType="truck"
            ratePerMinute={tariffs.truck_rate_per_minute}
            fixedRate={tariffs.fixed_rate_truck}
          />
        </div>

        {/* Vista Previa de Costos */}
        {showPreview && <CostPreview />}

        {/* Botón de Guardar */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-6"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
