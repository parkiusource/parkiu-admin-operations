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
  MapPin,
  Clock,
  DollarSign,
  Check,
  AlertCircle,
  Calculator
} from 'lucide-react';
import { VehicleType, ParkingLot } from '@/types/parking';
import { useRegisterVehicleEntry } from '@/api/hooks/useVehicles';
import { useRealParkingSpaces } from '@/hooks/parking/useParkingSpots';
import { useToast } from '@/hooks';

interface VehicleEntryCardProps {
  parkingLots?: ParkingLot[];
  parkingLot?: ParkingLot;
  onSuccess?: (plate: string, spot: string) => void;
  onError?: (error: string) => void;
}

const vehicleTypes: {
  value: VehicleType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}[] = [
  {
    value: 'car',
    label: 'Carro',
    icon: Car,
    color: 'bg-blue-500 hover:bg-blue-600 border-blue-200',
    description: 'Automóviles y vehículos pequeños'
  },
  {
    value: 'motorcycle',
    label: 'Moto',
    icon: Bike,
    color: 'bg-green-500 hover:bg-green-600 border-green-200',
    description: 'Motocicletas y scooters'
  },
  {
    value: 'bicycle',
    label: 'Bicicleta',
    icon: Bike,
    color: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-200',
    description: 'Bicicletas convencionales'
  },
  {
    value: 'truck',
    label: 'Camión',
    icon: Truck,
    color: 'bg-red-500 hover:bg-red-600 border-red-200',
    description: 'Camiones y vehículos de carga'
  },
];

export const VehicleEntryCard: React.FC<VehicleEntryCardProps> = ({
  parkingLots,
  parkingLot,
  onSuccess,
  onError
}) => {
  const lots = (parkingLots && parkingLots.length > 0)
    ? parkingLots
    : (parkingLot ? [parkingLot] : []);
  const [selectedParkingLot, setSelectedParkingLot] = useState<ParkingLot | null>(lots[0] || null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [plate, setPlate] = useState('');
  const [spaceNumber, setSpaceNumber] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [autoReset, setAutoReset] = useState<boolean>(true);
  const [autoAssign, setAutoAssign] = useState<boolean>(true);
  const { addToast } = useToast();

  // Cargar espacios del parqueadero seleccionado desde el backend real
  const { data: parkingSpots = [], isLoading: spotsLoading } = useRealParkingSpaces(
    selectedParkingLot?.id,
    { enabled: !!selectedParkingLot }
  );

  // Filtrar espacios disponibles y por tipo de vehículo
  const availableSpots = parkingSpots.filter(spot => {
    const isAvailable = spot.status === 'available';
    const matchesType = !selectedVehicleType || spot.type === selectedVehicleType;
    return isAvailable && matchesType;
  });

  const registerEntry = useRegisterVehicleEntry({
    onSuccess: (response, { vehicleData }) => {
      console.log('🎉 VehicleEntryCard - Registro exitoso:', { response, vehicleData });
      const spot = response.spot_number || vehicleData.space_number || vehicleData.parking_space_number || vehicleData.spot_number || 'espacio asignado';
      onSuccess?.(vehicleData.plate, spot);
      addToast(`Entrada registrada: ${vehicleData.plate} en ${spot}`, 'success');
      if (autoReset) {
        setPlate('');
        setSpaceNumber('');
        setSelectedVehicleType(null);
        setEstimatedCost(null);
      }
    },
    onError: (error) => {
      console.error('🚨 VehicleEntryCard - Error de registro:', error);
      onError?.(error.message);
    }
  });

  // Debug: Estado del hook en tiempo real
  console.log('🔧 VehicleEntryCard - Hook estado:', {
    isLoading: registerEntry.isPending,
    isError: registerEntry.isError,
    error: registerEntry.error
  });

  const calculateEstimatedCost = (vehicleType: VehicleType, hours: number = 1) => {
    if (!selectedParkingLot) return 0;
    const ratePerMinute = {
      car: selectedParkingLot.car_rate_per_minute,
      motorcycle: selectedParkingLot.motorcycle_rate_per_minute,
      bicycle: selectedParkingLot.bicycle_rate_per_minute,
      truck: selectedParkingLot.truck_rate_per_minute,
    }[vehicleType];
    return ratePerMinute ? Math.round(ratePerMinute * 60 * hours) : selectedParkingLot.price_per_hour || 0;
  };

  const handleVehicleTypeSelect = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setEstimatedCost(calculateEstimatedCost(vehicleType));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedParkingLot || !selectedVehicleType || !plate.trim()) {
      onError?.('Por favor complete todos los campos');
      return;
    }

    const payload = {
      plate: plate.trim().toUpperCase(),
      vehicle_type: selectedVehicleType,
      ...(autoAssign ? {} : { space_number: spaceNumber.trim().toUpperCase() })
    };

    registerEntry.mutate({
      parkingLotId: selectedParkingLot.id!,
      vehicleData: payload
    });
  };

  const selectedVehicle = vehicleTypes.find(v => v.value === selectedVehicleType);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-green-700">
          <div className="p-2 bg-green-100 rounded-lg">
            <Car className="w-6 h-6 text-green-600" />
          </div>
          Registrar Entrada de Vehículo
        </CardTitle>
        <p className="text-sm text-gray-600">
          Seleccione el tipo de vehículo y complete los datos de entrada
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {lots.length > 1 && (
            <div>
              <Label className="text-base font-medium mb-3 block">
                Seleccionar Parqueadero
              </Label>
              <select
                value={selectedParkingLot?.id || ''}
                onChange={(e) => {
                  const lot = lots.find(p => p.id === e.target.value);
                  setSelectedParkingLot(lot || null);
                  setSpaceNumber('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione un parqueadero</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} - {lot.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedParkingLot && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{selectedParkingLot.name}</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">{selectedParkingLot.address}</p>
              <div className="flex gap-4 mt-2 text-xs text-blue-600">
                <span>Total espacios: {selectedParkingLot.total_spots}</span>
                <span>Tarifa: ${selectedParkingLot.price_per_hour}/hora</span>
              </div>
            </div>
          )}

          {!selectedParkingLot && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Debe seleccionar un parqueadero para continuar
              </AlertDescription>
            </Alert>
          )}

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
                    onClick={() => handleVehicleTypeSelect(vehicleType.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? `${vehicleType.color} text-white shadow-lg transform scale-105`
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                      <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {vehicleType.label}
                      </span>
                      {isSelected && <Check className="w-5 h-5 text-white ml-auto" />}
                    </div>
                    <p className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                      {vehicleType.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedVehicle && estimatedCost && selectedParkingLot && (
            <Alert className="border-blue-200 bg-blue-50">
              <Calculator className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Costo estimado:</strong> ${estimatedCost.toLocaleString()}/hora
                <br />
                <span className="text-xs">
                  Tarifa: ${selectedParkingLot.price_per_hour}/hora
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Modo de Asignación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modo de asignación</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={autoAssign} onChange={() => setAutoAssign(true)} />
                  🎯 Auto-asignación (recomendado)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={!autoAssign} onChange={() => setAutoAssign(false)} />
                  📍 Manual
                </label>
              </div>
            </div>
          </div>

          {/* Datos del Vehículo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate" className="text-sm font-medium">
                Placa del Vehículo
              </Label>
              <Input
                id="plate"
                type="text"
                placeholder="Ej: ABC123"
                value={plate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlate(e.target.value)}
                className="uppercase text-center text-lg font-bold tracking-wider"
                maxLength={8}
                required
              />
              <p className="text-xs text-gray-500">
                Ingrese la placa sin espacios ni guiones
              </p>
            </div>

            {!autoAssign && (
              <div className="space-y-2">
                <Label htmlFor="space" className="text-sm font-medium">
                  Espacio Disponible
                  {spotsLoading && <span className="text-blue-500 ml-2">(Cargando...)</span>}
                </Label>
                {availableSpots && availableSpots.length > 0 ? (
                  <select
                    id="space"
                    value={spaceNumber}
                    onChange={(e) => setSpaceNumber(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base font-semibold text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccione un espacio</option>
                    {availableSpots.map((spot) => (
                      <option key={spot.id} value={spot.number}>
                        {spot.number} - {spot.type ? `${spot.type.charAt(0).toUpperCase() + spot.type.slice(1)}` : 'General'}
                        {spot.floor && ` (Piso ${spot.floor})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <Input
                      id="space"
                      type="text"
                      placeholder="Ej: A-15, B2, 101"
                      value={spaceNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpaceNumber(e.target.value)}
                      className="text-center text-lg font-bold"
                      required
                    />
                    <div className="mt-1">
                      {selectedParkingLot && !spotsLoading && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800 text-xs">
                            No hay espacios configurados. Puede ingresar manualmente el número de espacio.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {availableSpots && availableSpots.length > 0
                    ? `${availableSpots.length} espacios disponibles`
                    : 'Ingrese el código o número del espacio'}
                </p>
              </div>
            )}
          </div>

          {/* Resumen antes de confirmar */}
          {(selectedVehicleType && plate && (autoAssign || spaceNumber)) && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Resumen de Entrada
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {selectedVehicle && <selectedVehicle.icon className="w-4 h-4 text-gray-600" />}
                  <span className="font-medium">{selectedVehicle?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="font-mono">
                    {plate.toUpperCase()}
                  </Badge>
                </div>
                {!autoAssign && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span>Espacio {spaceNumber.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Hora estimada:
                  </span>
                  <span className="font-mono text-blue-800">
                    {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-blue-700 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Costo/hora:
                  </span>
                  <span className="font-bold text-blue-800">
                    ${estimatedCost?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={registerEntry.isPending || !selectedParkingLot || !selectedVehicleType || !plate || (!autoAssign && !spaceNumber)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
          >
            {registerEntry.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Registrando Entrada...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Confirmar Entrada
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={autoReset} onChange={(e) => setAutoReset(e.target.checked)} className="h-4 w-4" />
              Registrar otra automáticamente
            </label>
            {registerEntry.isError && (
              <span className="text-red-600">No se pudo registrar. Intenta de nuevo.</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
