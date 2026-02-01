import React, { useMemo, useState } from 'react';
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
  Calculator,
  Receipt,
  Printer
} from 'lucide-react';
import { VehicleType, ParkingLot } from '@/types/parking';
import { useRegisterVehicleEntry, useSearchVehicle } from '@/api/hooks/useVehicles';
import { useRealParkingSpaces } from '@/hooks/parking/useParkingSpots';
import { useToast } from '@/hooks';
import { validatePlate, normalizePlate } from '@/utils/plate';
import { useAdminProfileStatus } from '@/hooks/useAdminProfileCentralized';
import { tryPrintViaQZ, selectQZPrinter } from '@/services/printing/qz';
import type { VehicleEntryResponse } from '@/types/parking';
import { PrinterSelector } from '@/components/common/PrinterSelector';
import { useOperationPermissions } from '@/hooks';

interface VehicleEntryCardProps {
  parkingLots?: ParkingLot[];
  parkingLot?: ParkingLot;
  defaultParkingLot?: ParkingLot | null;
  onSuccess?: (plate: string, spot: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void; // Nueva prop para cerrar modal padre
  autoFocus?: boolean;
  compact?: boolean; // Nueva prop para modo compacto
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
  onError,
  onClose,
  compact = false
}) => {
  const { profile } = useAdminProfileStatus();
  const isOperatorAuthorized = useMemo(() => {
    const role = profile?.role || '';
    const authorized = role === 'local_admin' || role === 'global_admin' || role === 'operator';
    if (process.env.NODE_ENV === 'development') {
    }
    return authorized;
  }, [profile]);
  const lots = (parkingLots && parkingLots.length > 0)
    ? parkingLots
    : (parkingLot ? [parkingLot] : []);
  if (process.env.NODE_ENV === 'development') {
  }
  const [selectedParkingLot, setSelectedParkingLot] = useState<ParkingLot | null>(lots[0] || null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [plate, setPlate] = useState('');
  const [spaceNumber, setSpaceNumber] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [autoReset, setAutoReset] = useState<boolean>(true);
  const [autoAssign, setAutoAssign] = useState<boolean>(true);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const { addToast } = useToast();
  const { canRegisterEntry } = useOperationPermissions();
  const [showTicket, setShowTicket] = useState(false);
  const [entryResponse, setEntryResponse] = useState<VehicleEntryResponse | null>(null);
  const [entrySpot, setEntrySpot] = useState<string>('');
  const [entryPlate, setEntryPlate] = useState<string>('');

  // Cargar espacios del parqueadero seleccionado desde el backend real
  const { data: parkingSpots = [], isLoading: spotsLoading } = useRealParkingSpaces(
    selectedParkingLot?.id,
    { enabled: !!selectedParkingLot }
  );
  // Duplicate active vehicle check
  const { data: existingActiveVehicle } = useSearchVehicle(
    selectedParkingLot?.id || '',
    normalizePlate(plate),
    { enabled: !!selectedParkingLot && !!plate && plate.length >= 3 }
  );


  // Filtrar espacios disponibles y por tipo de vehículo
  const availableSpots = parkingSpots.filter(spot => {
    const isAvailable = spot.status === 'available';
    const matchesType = !selectedVehicleType || spot.type === selectedVehicleType;
    return isAvailable && matchesType;
  });

  const registerEntry = useRegisterVehicleEntry({
    onSuccess: (response, { vehicleData }) => {
      const spot = response.spot_number || vehicleData.space_number || vehicleData.parking_space_number || vehicleData.spot_number || 'espacio asignado';
      onSuccess?.(vehicleData.plate, spot);
      addToast(`Entrada registrada: ${vehicleData.plate} en ${spot}`, 'success');
      if ((response as { __offline?: boolean }).__offline) {
        addToast('Guardado localmente. Se sincronizará al reconectar.', 'success');
      }
      setEntryResponse(response);
      setEntrySpot(spot);
      setEntryPlate(vehicleData.plate);
      setShowTicket(true);
    },
    onError: (error) => {
      console.error('🚨 VehicleEntryCard - Error de registro:', error);
      onError?.(error.message);
    }
  });

  // Debug removido

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

  const getRatePerMinute = (vehicleType: VehicleType | null): number | null => {
    if (!selectedParkingLot || !vehicleType) return null;
    return {
      car: selectedParkingLot.car_rate_per_minute,
      motorcycle: selectedParkingLot.motorcycle_rate_per_minute,
      bicycle: selectedParkingLot.bicycle_rate_per_minute,
      truck: selectedParkingLot.truck_rate_per_minute,
    }[vehicleType] ?? null;
  };

  const handleVehicleTypeSelect = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setEstimatedCost(calculateEstimatedCost(vehicleType));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setPlateError(null);
    setSpaceError(null);

    if (!selectedParkingLot || !selectedVehicleType || !plate.trim()) {
      onError?.('Por favor complete todos los campos');
      return;
    }

    // Validate plate format by vehicle type
    const plateCheck = validatePlate(plate, selectedVehicleType);
    if (!plateCheck.isValid) {
      const message = plateCheck.reason || 'Placa inválida';
      setPlateError(message);
      onError?.(message);
      return;
    }

    // Prevent duplicate active entry
    if (existingActiveVehicle) {
      const message = `La placa ${plateCheck.normalized} ya está activa en el parqueadero`;
      setPlateError(message);
      onError?.(message);
      return;
    }

    // Manual assignment: verify selected space is currently available
    if (!autoAssign) {
      const space = parkingSpots.find(s => `${s.number}`.toUpperCase() === spaceNumber.trim().toUpperCase());
      if (!space) {
        const message = 'El espacio seleccionado no existe';
        setSpaceError(message);
        onError?.(message);
        return;
      }
      if (space.status !== 'available') {
        const message = `El espacio ${space.number} no está disponible (${space.status})`;
        setSpaceError(message);
        onError?.(message);
        return;
      }
      if (selectedVehicleType && space.type && space.type !== selectedVehicleType) {
        const message = `El espacio ${space.number} es para ${space.type}`;
        setSpaceError(message);
        onError?.(message);
        return;
      }
    }

    const payload = {
      plate: normalizePlate(plate),
      vehicle_type: selectedVehicleType,
      ...(autoAssign ? {} : { space_number: spaceNumber.trim().toUpperCase() })
    };

    registerEntry.mutate({
      parkingLotId: selectedParkingLot.id!,
      vehicleData: payload
    });
  };

  const selectedVehicle = vehicleTypes.find(v => v.value === selectedVehicleType);

  if (showTicket && entryResponse) {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200">
        <CardHeader className="text-center pb-4 bg-green-50">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-700">¡Entrada Registrada!</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            Vehículo <strong>{entryPlate.toUpperCase()}</strong> ingresó al parqueadero
          </p>
          <div className="mt-6 mx-auto max-w-sm text-left bg-white border rounded-lg p-4">
            {/* Header aligned with printed ticket */}
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{selectedParkingLot ? selectedParkingLot.name : 'PARKIU S.A.S.'}</h3>
              <p className="text-xs text-gray-500">{selectedParkingLot ? selectedParkingLot.address : 'Ticket de Entrada'}</p>
              {selectedParkingLot?.contact_phone && (
                <p className="text-xs text-gray-500">Tel: {selectedParkingLot.contact_phone}</p>
              )}
              {selectedParkingLot?.tax_id && (
                <p className="text-xs font-medium text-gray-700">NIT: {selectedParkingLot.tax_id}</p>
              )}
            </div>
            <div className="my-3 border-t border-dashed" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Ticket:</div>
              <div className="text-right font-mono">T-{entryResponse.transaction_id}</div>
              <div className="text-gray-600">Placa:</div>
              <div className="text-right font-mono">{entryPlate.toUpperCase()}</div>
              {selectedVehicle && (
                <>
                  <div className="text-gray-600">Tipo:</div>
                  <div className="text-right">{selectedVehicle.label}</div>
                </>
              )}
              {/* Tarifa por minuto */}
              {selectedParkingLot && selectedVehicle && (
                <>
                  <div className="text-gray-600">Tarifa:</div>
                  <div className="text-right font-mono">
                    ${(
                      selectedVehicle.value === 'car' ? selectedParkingLot.car_rate_per_minute :
                      selectedVehicle.value === 'motorcycle' ? selectedParkingLot.motorcycle_rate_per_minute :
                      selectedVehicle.value === 'bicycle' ? selectedParkingLot.bicycle_rate_per_minute :
                      selectedParkingLot.truck_rate_per_minute
                    ).toLocaleString('es-CO')}/min
                  </div>
                </>
              )}
              <div className="text-gray-600">Espacio:</div>
              <div className="text-right font-mono">{entrySpot}</div>
              <div className="text-gray-600">Entrada:</div>
              <div className="text-right">{new Date(entryResponse.entry_time).toLocaleString('es-CO')}</div>
            </div>
            {/* Pie de página alineado con versión imprimible */}
            <div className="text-center text-xs text-gray-500 mt-4">
              ¡Gracias por su preferencia!<br />
              www.parkiu.com<br />
              <span className="text-gray-400">Powered by ParkiU</span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  (async () => {
                    const ok = await tryPrintViaQZ({
                      transactionId: entryResponse.transaction_id,
                      plate: entryPlate.toUpperCase(),
                      entryTime: new Date(entryResponse.entry_time).toLocaleString('es-CO'),
                      exitTime: undefined,
                      durationMinutes: 0,
                      space: entrySpot,
                      vehicleType: selectedVehicle?.label,
                      ratePerMinute: selectedVehicle
                        ? (
                          selectedVehicle.value === 'car' ? selectedParkingLot?.car_rate_per_minute :
                          selectedVehicle.value === 'motorcycle' ? selectedParkingLot?.motorcycle_rate_per_minute :
                          selectedVehicle.value === 'bicycle' ? selectedParkingLot?.bicycle_rate_per_minute :
                          selectedParkingLot?.truck_rate_per_minute
                        )
                        : undefined,
                      baseAmount: 0,
                      additionalAmount: 0,
                      totalAmount: 0,
                      company: selectedParkingLot ? {
                        name: selectedParkingLot.name,
                        address: selectedParkingLot.address,
                        phone: selectedParkingLot.contact_phone,
                        taxId: selectedParkingLot.tax_id,
                      } : undefined,
                    });
                    if (ok) return;
                    await selectQZPrinter();
                    const rateForSelected = selectedVehicle
                      ? (
                        selectedVehicle.value === 'car' ? selectedParkingLot?.car_rate_per_minute :
                        selectedVehicle.value === 'motorcycle' ? selectedParkingLot?.motorcycle_rate_per_minute :
                        selectedVehicle.value === 'bicycle' ? selectedParkingLot?.bicycle_rate_per_minute :
                        selectedParkingLot?.truck_rate_per_minute
                      )
                      : undefined;
                    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Ticket ${entryPlate.toUpperCase()}</title><style>
                      @page { size: 80mm auto; margin: 0; }
                      body { width: 80mm; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; }
                      .ticket { padding: 6mm 4mm; }
                      .center { text-align: center; }
                      .mono { font-family: inherit; }
                      .row { display: flex; justify-content: space-between; margin: 2px 0; }
                      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
                      h3 { margin: 0 0 2mm; }
                    </style></head><body><div class="ticket">
                      <div class="center">
                        <h3>${selectedParkingLot ? selectedParkingLot.name : 'PARKIU S.A.S.'}</h3>
                        <div>${selectedParkingLot ? selectedParkingLot.address : 'Ticket de Entrada'}</div>
                        ${selectedParkingLot?.contact_phone ? `<div>Tel: ${selectedParkingLot.contact_phone}</div>` : ''}
                        ${selectedParkingLot?.tax_id ? `<div><strong>NIT:</strong> ${selectedParkingLot.tax_id}</div>` : ''}
                      </div>
                      <hr />
                      <div class="row"><div>Ticket:</div><div class="mono">T-${entryResponse.transaction_id}</div></div>
                      <div class="row"><div>Placa:</div><div class="mono">${entryPlate.toUpperCase()}</div></div>
                      ${selectedVehicle ? `<div class="row"><div>Tipo:</div><div>${selectedVehicle.label}</div></div>` : ''}
                      ${selectedVehicle ? `<div class="row"><div>Tarifa:</div><div>$${(rateForSelected != null ? rateForSelected.toLocaleString('es-CO') : '0')}/min</div></div>` : ''}
                      <div class="row"><div>Espacio:</div><div class="mono">${entrySpot}</div></div>
                      <div class="row"><div>Entrada:</div><div>${new Date(entryResponse.entry_time).toLocaleString('es-CO')}</div></div>
                      <hr />
                      <div class="center">Conserve este ticket</div>
                      <div class="center">Powered by ParkiU</div>
                    </div></body></html>`;
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(html);
                      win.document.close();

                      // Hacer la impresión asíncrona para no bloquear la aplicación
                      setTimeout(() => {
                        win.focus();
                        win.print();
                        // Opcional: cerrar automáticamente después de imprimir
                        // win.close();
                      }, 100);
                    }
                  })();
                }}
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir Ticket
              </Button>
              <Button
                type="button"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowTicket(false);
                  if (autoReset) {
                    setPlate('');
                    setSpaceNumber('');
                    setSelectedVehicleType(null);
                    setEstimatedCost(null);
                  }
                  // Si está en modo compacto, cerrar el modal padre
                  if (compact && onClose) {
                    onClose();
                  }
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderizado compacto para modales
  if (compact) {
    return (
      <div className="w-full">
        {/* Header compacto */}
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-green-700 mb-1">
            <div className="p-1.5 bg-green-100 rounded">
              <Car className="w-4 h-4 text-green-600" />
            </div>
            Registrar Entrada de Vehículo
          </h3>
          <p className="text-xs text-gray-600">
            Seleccione el tipo de vehículo y complete los datos de entrada
          </p>
        </div>

        {/* Contenido compacto */}
        <div className="space-y-3">
          <div className="mb-2">
            <PrinterSelector />
          </div>
          {!isOperatorAuthorized && (
            <Alert className="border-red-200 bg-red-50 p-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 text-xs">
                No tiene permisos para registrar entradas. Contacte al administrador.
              </AlertDescription>
            </Alert>
          )}

                 <form onSubmit={handleSubmit} className="space-y-3">
                   {selectedParkingLot && (
                     <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-blue-800">
                           <MapPin className="w-4 h-4" />
                           <span className="font-semibold text-sm">{selectedParkingLot.name}</span>
                         </div>
                         <div className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                           {selectedParkingLot.total_spots} espacios
                         </div>
                       </div>
                       {selectedVehicleType && (
                         <div className="mt-2 text-xs text-blue-700 bg-blue-200/50 px-2 py-1 rounded">
                           💰 Tarifa: ${getRatePerMinute(selectedVehicleType)?.toLocaleString('es-CO')}/minuto
                         </div>
                       )}
                     </div>
                   )}

            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo de Vehículo</Label>
              <div className="grid grid-cols-2 gap-2">
                {vehicleTypes.map((vehicleType) => {
                  const Icon = vehicleType.icon;
                  const isSelected = selectedVehicleType === vehicleType.value;
                  return (
                    <button
                      key={vehicleType.value}
                      type="button"
                      onClick={() => handleVehicleTypeSelect(vehicleType.value)}
                      className={`p-2 rounded border-2 transition-all text-left ${
                        isSelected
                          ? `${vehicleType.color} text-white shadow-md`
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {vehicleType.label}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-white ml-auto" />}
                      </div>
                      <p className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                        {vehicleType.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-medium mb-1 block">Modo de asignación</Label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assignmentMode"
                      value="auto"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.value === 'auto')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Auto-asignación</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assignmentMode"
                      value="manual"
                      checked={!autoAssign}
                      onChange={(e) => setAutoAssign(e.target.value !== 'manual')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Manual</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="plate" className="text-sm font-medium mb-1 block">
                  Placa del Vehículo
                </Label>
                <Input
                  id="plate"
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="EJ: ABC123"
                  className="text-sm p-2 h-8"
                  maxLength={8}
                />
              </div>
            </div>

            {!autoAssign && (
              <div>
                <Label htmlFor="spaceNumber" className="text-sm font-medium mb-1 block">
                  Número de Espacio
                  {spotsLoading && <span className="text-blue-500 ml-2 text-xs">(Cargando...)</span>}
                </Label>
                {availableSpots && availableSpots.length > 0 ? (
                  <select
                    id="spaceNumber"
                    value={spaceNumber}
                    onChange={(e) => setSpaceNumber(e.target.value)}
                    className="w-full text-sm p-2 h-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <Input
                    id="spaceNumber"
                    type="text"
                    value={spaceNumber}
                    onChange={(e) => setSpaceNumber(e.target.value)}
                    placeholder="Ingrese el número del espacio"
                    className="text-sm p-2 h-8"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {availableSpots && availableSpots.length > 0
                    ? `${availableSpots.length} espacios disponibles`
                    : 'Ingrese el código o número del espacio'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!canRegisterEntry || !selectedVehicleType || !plate.trim() || !selectedParkingLot || registerEntry.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canRegisterEntry ? 'No tienes permisos para registrar entradas' : undefined}
            >
              {registerEntry.isPending ? 'Registrando...' : '✓ Confirmar Entrada'}
            </Button>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoReset}
                onChange={(e) => setAutoReset(e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-xs text-gray-600">Registrar otra automáticamente</span>
            </label>
          </form>
        </div>
      </div>
    );
  }

  // Renderizado normal para páginas completas
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
        <div className="mb-4">
          <PrinterSelector />
        </div>
        {!isOperatorAuthorized && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              No tiene permisos para registrar entradas. Contacte al administrador.
            </AlertDescription>
          </Alert>
        )}
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
                {selectedVehicleType ? (
                  <span>
                    Tarifa: ${getRatePerMinute(selectedVehicleType)?.toLocaleString('es-CO')}/min
                  </span>
                ) : (
                  <span>
                    Tarifa base carro: ${selectedParkingLot.car_rate_per_minute.toLocaleString('es-CO')}/min
                  </span>
                )}
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
                  Tarifa: ${getRatePerMinute(selectedVehicle.value)?.toLocaleString('es-CO')}/min
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPlate(e.target.value);
                  if (selectedVehicleType) {
                    const check = validatePlate(e.target.value, selectedVehicleType);
                    setPlateError(check.isValid ? null : (check.reason || 'Placa inválida'));
                  } else {
                    setPlateError(null);
                  }
                }}
                className="uppercase text-center text-lg font-bold tracking-wider"
                maxLength={8}
                required
              />
              {plateError && (
                <p className="text-xs text-red-600">{plateError}</p>
              )}
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
                    onChange={(e) => {
                      setSpaceNumber(e.target.value);
                      setSpaceError(null);
                    }}
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSpaceNumber(e.target.value);
                        setSpaceError(null);
                      }}
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
                {spaceError && (
                  <p className="text-xs text-red-600">{spaceError}</p>
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
            disabled={registerEntry.isPending || !selectedParkingLot || !selectedVehicleType || !plate || (!autoAssign && !spaceNumber) || !isOperatorAuthorized}
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
