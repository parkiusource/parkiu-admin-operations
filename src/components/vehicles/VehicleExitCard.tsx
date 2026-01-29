import React, { useState, useEffect, useMemo } from 'react';
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
  CreditCard,
  Banknote,
  Smartphone,
  Calculator,
  Clock,
  DollarSign,
  Check,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Search,
  Printer,
  Download,
  ShieldAlert
} from 'lucide-react';
import { ParkingLot, ActiveVehicle } from '@/types/parking';
import { useRegisterVehicleExit, useSearchVehicle, useCostCalculator } from '@/api/hooks/useVehicles';
import { useToast } from '@/hooks';
import { normalizePlate, validatePlate } from '@/utils/plate';
import { useAdminProfileStatus } from '@/hooks/useAdminProfileCentralized';
import type { VehicleExitResponse } from '@/types/parking';
import { tryPrintViaQZ, selectQZPrinter } from '@/services/printing/qz';
import { PrinterSelector } from '@/components/common/PrinterSelector';
import ExitConfirmationDialog from './ExitConfirmationDialog';
import { useOperationPermissions } from '@/hooks';

interface VehicleExitCardProps {
  parkingLots?: ParkingLot[];
  parkingLot?: ParkingLot;
  onSuccess?: (plate: string, cost: number) => void;
  onError?: (error: string) => void;
  onClose?: () => void; // Nueva prop para cerrar modal padre
  autoFocus?: boolean;
  compact?: boolean; // Nueva prop para modo compacto
}

const paymentMethods = [
  {
    value: 'cash' as const,
    label: 'Efectivo',
    icon: Banknote,
    color: 'bg-green-500 hover:bg-green-600',
    description: 'Pago en efectivo'
  },
  {
    value: 'card' as const,
    label: 'Tarjeta',
    icon: CreditCard,
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'Tarjeta débito/crédito'
  },
  {
    value: 'digital' as const,
    label: 'Digital',
    icon: Smartphone,
    color: 'bg-purple-500 hover:bg-purple-600',
    description: 'QR, Nequi, Daviplata'
  },
];

const vehicleIcons = {
  car: Car,
  motorcycle: Bike,
  bicycle: Bike,
  truck: Truck,
} as const;

const vehicleLabels = {
  car: 'Carro 🚗',
  motorcycle: 'Moto 🏍️',
  bicycle: 'Bicicleta 🚲',
  truck: 'Camión 🚛',
} as const;

// 🐛 FIX: Safe date formatting helper
const formatTimeOnly = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Hora inválida';
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'Hora inválida';
  }
};

export const VehicleExitCard: React.FC<VehicleExitCardProps> = ({
  parkingLots,
  parkingLot,
  onSuccess,
  onError,
  onClose,
  compact = false
}) => {
  const { addToast } = useToast();
  const { profile } = useAdminProfileStatus();
  const { canRegisterExit } = useOperationPermissions();

  const isOperatorAuthorized = useMemo(() => {
    const role = profile?.role || '';
    const authorized = role === 'local_admin' || role === 'global_admin' || role === 'operator';
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 VehicleExitCard - Authorization check:', { role, authorized, profile });
    }
    return authorized;
  }, [profile]);
  const lots = (parkingLots && parkingLots.length > 0)
    ? parkingLots
    : (parkingLot ? [parkingLot] : []);
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 VehicleExitCard - Parking lots data:', { parkingLots, parkingLot, lots });
  }
  const [selectedParkingLot, setSelectedParkingLot] = useState<ParkingLot | null>(lots[0] || null);
  const [plate, setPlate] = useState('');
  const [searchedVehicle, setSearchedVehicle] = useState<ActiveVehicle | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital' | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [currentCost, setCurrentCost] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exitResponse, setExitResponse] = useState<VehicleExitResponse | null>(null);
  const [receiptParsed, setReceiptParsed] = useState<Record<string, unknown> | null>(null);
  const [freezeCost, setFreezeCost] = useState(false);
  const [freezePlate, setFreezePlate] = useState<string | null>(null);

  // Always call the hook but conditionally use the result
  const costCalculator = useCostCalculator(selectedParkingLot || (lots[0] as ParkingLot || ({} as ParkingLot)));

  const searchVehicle = useSearchVehicle(
    selectedParkingLot?.id || '',
    normalizePlate(plate),
    {
      enabled: plate.length >= 3 && !!selectedParkingLot,
      debounceMs: 800, // Esperar 800ms después de que el usuario deje de escribir
      staleTime: 1000 * 60 * 2 // Cache por 2 minutos
    }
  );

  const registerExit = useRegisterVehicleExit({
    onSuccess: (response, { vehicleData }) => {
      onSuccess?.(vehicleData.plate, response.total_cost);
      addToast(`Salida registrada: ${vehicleData.plate} - $${response.total_cost.toLocaleString()}`, 'success');
      setExitResponse(response);
      try {
        const parsed = response.receipt ? JSON.parse(response.receipt) : null;
        setReceiptParsed(parsed);
      } catch (e) {
        console.warn('Invalid receipt JSON', e);
        setReceiptParsed(null);
      }
      setShowReceipt(true);
    },
    onError: (error) => {
      onError?.(error.message);
    }
  });

  // 🐛 FIX: Consolidated cost calculation to prevent race conditions
  // This single effect handles both initial freeze and periodic updates
  useEffect(() => {
    if (!searchedVehicle) {
      // Reset freeze state when no vehicle
      if (freezeCost) {
        setFreezeCost(false);
        setFreezePlate(null);
      }
      return;
    }

    const normalized = normalizePlate(plate);
    const alreadyFrozenForThisPlate = freezeCost && freezePlate === normalized;

    // If not frozen for this plate yet, freeze immediately
    if (!alreadyFrozenForThisPlate) {
      const snapshot = costCalculator.calculateCost(
        searchedVehicle.entry_time,
        searchedVehicle.vehicle_type
      );
      setCurrentCost(snapshot.calculated_cost);
      if (!paymentAmount) {
        setPaymentAmount(snapshot.calculated_cost.toString());
      }
      setFreezeCost(true);
      setFreezePlate(normalized);
      return; // Don't set up interval on first freeze
    }

    // If already frozen for this plate and confirm dialog is open, don't update
    if (confirmOpen) return;

    // Set up periodic updates only if frozen for this plate but dialog not open
    const updateCost = () => {
      // Use requestIdleCallback for non-critical updates to avoid blocking main thread
      const performUpdate = () => {
        const costInfo = costCalculator.calculateCost(
          searchedVehicle.entry_time,
          searchedVehicle.vehicle_type
        );
        setCurrentCost(costInfo.calculated_cost);
        // Only auto-fill if field is empty
        if (!paymentAmount) {
          setPaymentAmount(costInfo.calculated_cost.toString());
        }
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(performUpdate);
      } else {
        performUpdate();
      }
    };

    // Update immediately if not frozen or dialog not open
    updateCost();

    // Update every minute
    const interval = setInterval(updateCost, 60000);

    return () => clearInterval(interval);
  }, [searchedVehicle, costCalculator, paymentAmount, freezeCost, freezePlate, plate, confirmOpen]);

  // Actualizar vehículo encontrado
  useEffect(() => {
    if (searchVehicle.data && searchVehicle.data.plate === plate.toUpperCase()) {
      setSearchedVehicle(searchVehicle.data);
    } else if (!searchVehicle.data && plate.length >= 3) {
      setSearchedVehicle(null);
    }
  }, [searchVehicle.data, plate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = normalizePlate(plate);
    const validAny = (
      validatePlate(normalized, 'car').isValid ||
      validatePlate(normalized, 'motorcycle').isValid ||
      validatePlate(normalized, 'truck').isValid ||
      validatePlate(normalized, 'bicycle').isValid
    );

    if (!validAny) {
      setPlateError('Placa inválida');
      onError?.('Placa inválida');
      return;
    }

    if (!searchedVehicle || !paymentMethod || !paymentAmount) {
      onError?.('Por favor complete todos los campos');
      return;
    }

    // 🐛 FIX: Validate payment amount is a valid positive number
    const amount = parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      onError?.('Por favor ingrese un monto válido');
      addToast('El monto de pago debe ser un número válido mayor a $0', 'error');
      return;
    }

    // Congelar costo al iniciar checkout
    const snapshot = costCalculator.calculateCost(
      searchedVehicle.entry_time,
      searchedVehicle.vehicle_type
    );
    setCurrentCost(snapshot.calculated_cost);
    if (!paymentAmount) {
      setPaymentAmount(snapshot.calculated_cost.toString());
    }
    setFreezeCost(true);
    setFreezePlate(normalizePlate(plate));
    setConfirmOpen(true);
  };

  // Descongelar automáticamente si se cierra el diálogo sin confirmar éxito
  useEffect(() => {
    if (!confirmOpen && freezeCost && !showReceipt) {
      setFreezeCost(false);
      setFreezePlate(null);
    }
  }, [confirmOpen, freezeCost, showReceipt]);

  // Descongelar si cambia la placa mientras está congelado para otra placa
  useEffect(() => {
    if (freezeCost && freezePlate && normalizePlate(plate) !== freezePlate) {
      setFreezeCost(false);
      setFreezePlate(null);
    }
  }, [plate, freezeCost, freezePlate]);

  // 🐛 FIX: Validate payment amount is a valid number before parsing
  const calculateChange = (): number => {
    if (!currentCost || !paymentAmount) return 0;
    const amount = parseFloat(paymentAmount);
    // If parsing fails, NaN is returned - treat as 0 change
    if (!Number.isFinite(amount)) return 0;
    return Math.max(0, amount - currentCost);
  };

  const isUnderpaid = (): boolean => {
    if (!currentCost || !paymentAmount) return false;
    const amount = parseFloat(paymentAmount);
    // If parsing fails (NaN), treat as underpaid to prevent invalid submissions
    if (!Number.isFinite(amount)) return true;
    return amount < currentCost;
  };

  const VehicleIcon = searchedVehicle ? vehicleIcons[searchedVehicle.vehicle_type] : Car;

  if (showReceipt) {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200">
        <CardHeader className="text-center pb-4 bg-green-50">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-700">¡Salida Registrada!</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            Vehículo <strong>{plate.toUpperCase()}</strong> ha salido exitosamente
          </p>

          {/* Vista previa estructurada del recibo - Alineada con versión imprimible */}
          {exitResponse && (
            <div className="mt-6 mx-auto max-w-sm text-left bg-white border rounded-lg p-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">
                  {selectedParkingLot?.name || 'PARKIU S.A.S.'}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedParkingLot?.address || 'Calle Principal #123, Ciudad'}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedParkingLot?.contact_phone ? `Tel: ${selectedParkingLot.contact_phone}` : 'Tel: (601) 123-4567'}
                </p>
                <p className="text-xs font-medium text-gray-700">
                  NIT: {selectedParkingLot?.tax_id || '901.234.567-8'}
                </p>
              </div>
              <div className="my-3 border-t border-dashed" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Ticket:</div>
                <div className="text-right font-mono">T-{exitResponse.transaction_id}</div>
                <div className="text-gray-600">Fecha:</div>
                <div className="text-right">{new Date().toLocaleDateString('es-CO')}</div>
                <div className="text-gray-600">Hora:</div>
                <div className="text-right">{new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-gray-600">Placa:</div>
                <div className="text-right font-mono">{plate.toUpperCase()}</div>
                {/* Agregar espacio si está disponible - igual que en impresión */}
                {(() => {
                  const spaceNumber = receiptParsed && (receiptParsed as Record<string, unknown>).space_number;
                  return spaceNumber ? (
                    <>
                      <div className="text-gray-600">Espacio:</div>
                      <div className="text-right">{String(spaceNumber)}</div>
                    </>
                  ) : null;
                })()}
                {/* Agregar tipo de vehículo si está disponible - igual que en impresión */}
                {(() => {
                  const vehicleType = receiptParsed && (receiptParsed as Record<string, unknown>).vehicle_type;
                  return vehicleType ? (
                    <>
                      <div className="text-gray-600">Tipo:</div>
                      <div className="text-right capitalize">{String(vehicleType)}</div>
                    </>
                  ) : null;
                })()}
                <div className="text-gray-600">Entrada:</div>
                <div className="text-right">{receiptParsed?.entry_time ? String(receiptParsed.entry_time) : '-'}</div>
                <div className="text-gray-600">Salida:</div>
                <div className="text-right">{receiptParsed?.exit_time ? String(receiptParsed.exit_time) : '-'}</div>
                <div className="text-gray-600">Tiempo:</div>
                <div className="text-right">{Math.floor(exitResponse.duration_minutes / 60)}h {exitResponse.duration_minutes % 60}m</div>
              </div>
              <div className="my-3 border-t border-dashed" />
              <div className="text-sm">
                {(() => {
                  const hourlyRateValue = (() => {
                    const v = (receiptParsed as Record<string, unknown> | null)?.hourly_rate as unknown;
                    const n = typeof v === 'number' ? v : Number(v);
                    return Number.isFinite(n) && n > 0 ? n : undefined;
                  })();
                  const vt = (receiptParsed as Record<string, unknown> | null)?.vehicle_type as 'car' | 'motorcycle' | 'bicycle' | 'truck' | undefined;
                  const perMinute = (() => {
                    if (!selectedParkingLot) return undefined;
                    switch (vt) {
                      case 'car': return selectedParkingLot.car_rate_per_minute;
                      case 'motorcycle': return selectedParkingLot.motorcycle_rate_per_minute;
                      case 'bicycle': return selectedParkingLot.bicycle_rate_per_minute;
                      case 'truck': return selectedParkingLot.truck_rate_per_minute;
                      default: return undefined;
                    }
                  })();
                  const computedHourly = hourlyRateValue ?? (perMinute ? Math.round(perMinute * 60) : selectedParkingLot?.price_per_hour);
                  const baseCost = Math.min(exitResponse.total_cost, computedHourly || exitResponse.total_cost);
                  const additionalCost = Math.max(0, exitResponse.total_cost - baseCost);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tarifa base:</span>
                        <span className="font-medium">${baseCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tiempo adicional:</span>
                        <span className="font-medium">${additionalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-2 border-t pt-2">
                        <span className="font-semibold">TOTAL:</span>
                        <span className="font-bold">${exitResponse.total_cost.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
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
                    try {
                      // Attempt silent QZ printing with ESC/POS
                      (async () => {
                        const vt = (receiptParsed as Record<string, unknown> | null)?.vehicle_type as 'car' | 'motorcycle' | 'bicycle' | 'truck' | undefined;
                        const hourlyRateValue = (() => {
                          const v = (receiptParsed as Record<string, unknown> | null)?.hourly_rate as unknown;
                          const n = typeof v === 'number' ? v : Number(v);
                          return Number.isFinite(n) && n > 0 ? n : undefined;
                        })();
                        const perMinute = (() => {
                          if (!selectedParkingLot) return undefined;
                          switch (vt) {
                            case 'car': return selectedParkingLot.car_rate_per_minute;
                            case 'motorcycle': return selectedParkingLot.motorcycle_rate_per_minute;
                            case 'bicycle': return selectedParkingLot.bicycle_rate_per_minute;
                            case 'truck': return selectedParkingLot.truck_rate_per_minute;
                            default: return undefined;
                          }
                        })();
                        const computedHourly = hourlyRateValue ?? (perMinute ? Math.round(perMinute * 60) : selectedParkingLot?.price_per_hour || exitResponse.total_cost);
                        const base = Math.min(exitResponse.total_cost, computedHourly);
                        const additional = Math.max(0, exitResponse.total_cost - base);

                        const ok = await tryPrintViaQZ({
                          transactionId: exitResponse.transaction_id,
                          plate: plate.toUpperCase(),
                          entryTime: receiptParsed?.entry_time ? String(receiptParsed.entry_time) : undefined,
                          exitTime: receiptParsed?.exit_time ? String(receiptParsed.exit_time) : undefined,
                          durationMinutes: exitResponse.duration_minutes,
                          space: (receiptParsed && 'space_number' in receiptParsed) ? String((receiptParsed as Record<string, unknown>)['space_number']) : undefined,
                          vehicleType: vt,
                          baseAmount: base,
                          additionalAmount: additional,
                          totalAmount: exitResponse.total_cost,
                          company: selectedParkingLot ? {
                            name: selectedParkingLot.name,
                            address: selectedParkingLot.address,
                            phone: selectedParkingLot.contact_phone,
                            taxId: selectedParkingLot.tax_id,
                          } : undefined,
                        });

                        if (ok) return; // Printed silently via QZ

                        // Fallback to HTML if QZ is unavailable
                        const wantSelect = await selectQZPrinter();
                        void wantSelect; // no-op; selection stored for next time

                        // ...falls through to existing HTML printing below
                      })();

                      const entry = receiptParsed?.entry_time ? String(receiptParsed.entry_time) : '';
                      const exitT = receiptParsed?.exit_time ? String(receiptParsed.exit_time) : '';
                      const space = (receiptParsed && 'space_number' in receiptParsed) ? String((receiptParsed as Record<string, unknown>)['space_number']) : '';
                      const vt = (receiptParsed as Record<string, unknown> | null)?.vehicle_type as 'car' | 'motorcycle' | 'bicycle' | 'truck' | undefined;
                      const hourlyRateValue = (() => {
                        const v = (receiptParsed as Record<string, unknown> | null)?.hourly_rate as unknown;
                        const n = typeof v === 'number' ? v : Number(v);
                        return Number.isFinite(n) && n > 0 ? n : undefined;
                      })();
                      const perMinute = (() => {
                        if (!selectedParkingLot) return undefined;
                        switch (vt) {
                          case 'car': return selectedParkingLot.car_rate_per_minute;
                          case 'motorcycle': return selectedParkingLot.motorcycle_rate_per_minute;
                          case 'bicycle': return selectedParkingLot.bicycle_rate_per_minute;
                          case 'truck': return selectedParkingLot.truck_rate_per_minute;
                          default: return undefined;
                        }
                      })();
                      const computedHourly = hourlyRateValue ?? (perMinute ? Math.round(perMinute * 60) : selectedParkingLot?.price_per_hour || exitResponse.total_cost);
                      const base = Math.min(exitResponse.total_cost, computedHourly);
                      const additional = Math.max(0, exitResponse.total_cost - base);
                      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Recibo ${plate.toUpperCase()}</title><style>
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
                          <div>${selectedParkingLot ? selectedParkingLot.address : 'Calle Principal #123, Ciudad'}</div>
                          <div>${selectedParkingLot?.contact_phone ? 'Tel: ' + selectedParkingLot.contact_phone : 'Tel: (601) 123-4567'}</div>
                          ${selectedParkingLot?.tax_id ? `<div><strong>NIT:</strong> ${selectedParkingLot.tax_id}</div>` : ''}
                        </div>
                        <hr />
                        <div class="row"><div>Ticket:</div><div class="mono">T-${exitResponse.transaction_id}</div></div>
                        <div class="row"><div>Fecha:</div><div>${new Date().toLocaleDateString('es-CO')}</div></div>
                        <div class="row"><div>Hora:</div><div>${new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</div></div>
                        <div class="row"><div>Placa:</div><div class="mono">${plate.toUpperCase()}</div></div>
                        ${vt ? `<div class="row"><div>Tipo:</div><div>${vt}</div></div>` : ''}
                        ${space ? `<div class="row"><div>Espacio:</div><div class="mono">${space}</div></div>` : ''}
                        ${entry ? `<div class="row"><div>Entrada:</div><div>${entry}</div></div>` : ''}
                        ${exitT ? `<div class="row"><div>Salida:</div><div>${exitT}</div></div>` : ''}
                        <div class="row"><div>Tiempo:</div><div>${Math.floor(exitResponse.duration_minutes/60)}h ${exitResponse.duration_minutes%60}m</div></div>
                        <hr />
                        <div class="row"><div>Tarifa base:</div><div>$${base.toLocaleString('es-CO')}</div></div>
                        <div class="row"><div>Tiempo adicional:</div><div>$${additional.toLocaleString('es-CO')}</div></div>
                        <div class="row" style="margin-top:4px;"><div><strong>TOTAL:</strong></div><div><strong>$${exitResponse.total_cost.toLocaleString('es-CO')}</strong></div></div>
                        <hr />
                        <div class="center">¡Gracias por su preferencia!<br/>www.parkiu.com<br/>Powered by ParkiU</div>
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
                    } catch (e) {
                      console.error('Error printing receipt', e);
                    }
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> Imprimir
                </Button>
                <Button
                  type="button"
                  className="bg-gray-700 hover:bg-gray-800 text-white"
                  onClick={() => {
                    const blob = new Blob([
                      receiptParsed ? JSON.stringify(receiptParsed, null, 2) : (exitResponse.receipt || '')
                    ], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recibo-${plate.toUpperCase()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> Descargar JSON
                </Button>
              </div>
            </div>
          )}
          <div className="mt-6">
            <Button
              type="button"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              onClick={() => {
                setShowReceipt(false);
                setPlate('');
                setSearchedVehicle(null);
                setPaymentMethod(null);
                setPaymentAmount('');
                setCurrentCost(null);
                setExitResponse(null);
                setReceiptParsed(null);
                // Si está en modo compacto, cerrar el modal padre
                if (compact && onClose) {
                  onClose();
                }
              }}
            >
              Cerrar
            </Button>
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
          <h3 className="flex items-center gap-2 text-lg font-semibold text-red-700 mb-1">
            <div className="p-1.5 bg-red-100 rounded">
              <Car className="w-4 h-4 text-red-600 rotate-180" />
            </div>
            Registrar Salida de Vehículo
          </h3>
          <p className="text-xs text-gray-600">
            Busque el vehículo y procese el pago de salida
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
                No tiene permisos para registrar salidas. Contacte al administrador.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Búsqueda de vehículo compacta */}
            <div>
              <Label htmlFor="plate" className="text-sm font-medium mb-1 block">
                Placa del Vehículo
              </Label>
              <div className="flex gap-2">
                <Input
                  id="plate"
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Buscar por placa..."
                  className="text-sm p-2 h-8 flex-1"
                  maxLength={8}
                />
                <Button
                  type="button"
                  disabled={!plate.trim() || searchVehicle.isPending}
                  className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  {searchVehicle.isPending ? '...' : '🔍'}
                </Button>
              </div>
            </div>

            {/* Información del vehículo encontrado */}
            {searchedVehicle && (
              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-sm">{searchedVehicle.plate}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {vehicleLabels[searchedVehicle.vehicle_type]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-blue-600">
                  <div>Espacio: {searchedVehicle.spot_number}</div>
                  <div>Entrada: {formatTimeOnly(searchedVehicle.entry_time)}</div>
                  <div>Duración: {Math.floor(searchedVehicle.duration_minutes / 60)}h {searchedVehicle.duration_minutes % 60}m</div>
                </div>
                {currentCost && (
                  <div className="mt-1 text-sm font-bold text-blue-800">
                    Costo: ${currentCost.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Método de pago compacto */}
            {searchedVehicle && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Método de Pago</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-2 rounded border text-xs ${
                          paymentMethod === method.value
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <method.icon className="w-4 h-4" />
                          <span>{method.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="paymentAmount" className="text-sm font-medium mb-1 block">
                    Monto Recibido
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="100"
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className={`text-center text-lg font-bold h-10 ${
                        isUnderpaid() ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
                      }`}
                    />

                    {/* Botones de pago rápido */}
                    {currentCost && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(currentCost.toString())}
                          className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Exacto
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount((Math.ceil(currentCost / 1000) * 1000).toString())}
                          className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          ${Math.ceil(currentCost / 1000)}k
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount((Math.ceil(currentCost / 5000) * 5000).toString())}
                          className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                        >
                          ${Math.ceil(currentCost / 5000) * 5}k
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount('')}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          title="Limpiar para ingresar monto manual"
                        >
                          ✏️
                        </button>
                      </div>
                    )}

                    {paymentAmount && currentCost && (
                      <div className="mt-1 text-xs">
                        {isUnderpaid() ? (
                          <span className="text-red-600 font-medium">
                            ⚠️ Falta: ${(currentCost - parseFloat(paymentAmount)).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            ✅ Cambio: ${calculateChange().toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!canRegisterExit || !searchedVehicle || !paymentMethod || !paymentAmount || isUnderpaid()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canRegisterExit ? 'No tienes permisos para registrar salidas' : undefined}
                >
                  ✓ Confirmar Salida - ${currentCost?.toLocaleString() || 0}
                </Button>
              </>
            )}
          </form>
        </div>

        {/* Modal de confirmación mejorado */}
        <ExitConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          vehicle={searchedVehicle}
          calculatedCost={currentCost || 0}
          paymentMethod={paymentMethod as 'cash' | 'card' | 'digital' | 'transfer'}
          onConfirm={() => {
            // 🐛 FIX: Double-check payment amount is valid before submitting
            const amount = parseFloat(paymentAmount);
            if (!Number.isFinite(amount) || amount <= 0) {
              addToast('Error: Monto de pago inválido', 'error');
              setConfirmOpen(false);
              return;
            }

            setConfirmOpen(false);
            registerExit.mutate({
              parkingLotId: selectedParkingLot!.id!,
              vehicleData: {
                plate: normalizePlate(plate),
                payment_amount: amount,
                payment_method: paymentMethod as 'cash' | 'card' | 'digital'
              }
            });
          }}
          isProcessing={registerExit.isPending}
        />
      </div>
    );
  }

  // Renderizado normal para páginas completas
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-red-700">
          <div className="p-2 bg-red-100 rounded-lg">
            <Car className="w-6 h-6 text-red-600 rotate-180" />
          </div>
          Registrar Salida de Vehículo
        </CardTitle>
        <p className="text-sm text-gray-600">
          Busque el vehículo y procese el pago de salida
        </p>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <PrinterSelector />
        </div>
        {!isOperatorAuthorized && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              No tiene permisos para operar salidas. Contacte al administrador.
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selector de Parqueadero */}
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
                  setPlate(''); // Reset vehicle search
                  setSearchedVehicle(null);
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

          {/* Información del parqueadero seleccionado */}
          {selectedParkingLot && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <span className="font-medium">{selectedParkingLot.name}</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">{selectedParkingLot.address}</p>
              <div className="flex gap-4 mt-2 text-xs text-blue-600">
                <span>Tarifa: ${selectedParkingLot.price_per_hour}/hora</span>
              </div>
            </div>
          )}

          {!selectedParkingLot && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Debe seleccionar un parqueadero para continuar
              </AlertDescription>
            </Alert>
          )}

          {/* Búsqueda por Placa */}
          <div>
            <Label htmlFor="searchPlate" className="text-base font-medium">
              Placa del Vehículo
            </Label>
            <div className="relative mt-2">
              <Input
                id="searchPlate"
                type="text"
                placeholder="Buscar por placa..."
                value={plate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setPlate(value);
                  const normalized = normalizePlate(value);
                  if (!normalized) {
                    setPlateError(null);
                    return;
                  }
                  const validAny = (
                    validatePlate(normalized, 'car').isValid ||
                    validatePlate(normalized, 'motorcycle').isValid ||
                    validatePlate(normalized, 'truck').isValid ||
                    validatePlate(normalized, 'bicycle').isValid
                  );
                  setPlateError(validAny ? null : 'Placa inválida');
                }}
                className="uppercase text-center text-lg font-bold tracking-wider pl-12"
                maxLength={8}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {plateError && (
              <p className="text-xs text-red-600 mt-1">{plateError}</p>
            )}

            {searchVehicle.isLoading && plate.length >= 3 && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                Buscando vehículo...
              </p>
            )}
          </div>

          {/* Información del Vehículo Encontrado */}
          {searchedVehicle && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <VehicleIcon className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      {vehicleLabels[searchedVehicle.vehicle_type]}
                    </h3>
                    <Badge className="font-mono text-sm">
                      {searchedVehicle.plate}
                    </Badge>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-blue-700">Espacio:</p>
                  <Badge variant="info" className="font-mono">
                    {searchedVehicle.spot_number}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Hora de entrada:
                  </p>
                  <p className="font-mono text-blue-900">
                    {new Date(searchedVehicle.entry_time).toLocaleString('es-CO')}
                  </p>
                </div>

                <div>
                  <p className="text-blue-700 flex items-center gap-1">
                    <Calculator className="w-4 h-4" />
                    Tiempo transcurrido:
                  </p>
                  <p className="font-bold text-blue-900">
                    {searchedVehicle.duration_minutes} minutos
                    <span className="text-xs text-blue-600 ml-1">
                      ({Math.round(searchedVehicle.duration_minutes / 60 * 10) / 10}h)
                    </span>
                  </p>
                </div>
              </div>

              {/* Costo Actual */}
              {currentCost && (
                <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-medium flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Costo actual:
                    </span>
                    <span className="text-xl font-bold text-blue-900">
                      ${currentCost.toLocaleString()}
                    </span>
                  </div>

                  {/* Indicador de Tarifa Fija */}
                  {costCalculator.calculateCost(searchedVehicle.entry_time, searchedVehicle.vehicle_type).is_fixed_rate && (
                    <Alert className="mt-2 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-700">
                        <strong>Tarifa fija aplicada</strong> - Tiempo excedido ({Math.round(searchedVehicle.duration_minutes / 60)} horas)
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No se encontró el vehículo */}
          {!searchVehicle.isLoading && !searchedVehicle && plate.length >= 3 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No se encontró ningún vehículo con placa <strong>{plate.toUpperCase()}</strong> en este parqueadero.
              </AlertDescription>
            </Alert>
          )}

          {/* Método de Pago */}
          {searchedVehicle && (
            <>
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Método de Pago
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.value;

                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                          isSelected
                            ? `${method.color} text-white shadow-lg transform scale-105`
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {method.label}
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                          {method.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monto de Pago */}
              <div>
                <Label htmlFor="paymentAmount" className="text-base font-medium">
                  Monto Recibido
                </Label>
                <div className="mt-2">
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="100"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                    className={`text-center text-xl font-bold ${
                      isUnderpaid() ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
                    }`}
                  />
                </div>

                {/* Validación de Pago */}
                {paymentAmount && currentCost && (
                  <div className="mt-2">
                    {isUnderpaid() ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Falta: ${(currentCost - parseFloat(paymentAmount)).toLocaleString()}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-green-200 bg-green-50">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                          <div className="flex justify-between items-center">
                            <span>Cambio:</span>
                            <span className="font-bold">${calculateChange().toLocaleString()}</span>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              {/* Resumen de Pago */}
              {paymentMethod && paymentAmount && currentCost && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-3">Resumen de Pago</h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Costo total:</span>
                      <span className="font-bold">${currentCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monto recibido:</span>
                      <span>${parseFloat(paymentAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Cambio:</span>
                      <span className="font-bold text-green-600">
                        ${calculateChange().toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    Método: {paymentMethods.find(m => m.value === paymentMethod)?.label}
                  </div>
                </div>
              )}

              {/* Botón de Confirmar Salida */}
              <Button
                type="submit"
                disabled={
                  !canRegisterExit ||
                  registerExit.isPending ||
                  !searchedVehicle ||
                  !paymentMethod ||
                  isUnderpaid() ||
                  !isOperatorAuthorized
                }
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canRegisterExit ? 'No tienes permisos para registrar salidas' : undefined}
              >
                {registerExit.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Procesando Salida...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Confirmar Salida - ${currentCost?.toLocaleString()}
                  </>
                )}
              </Button>
            </>
          )}

          {registerExit.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error al registrar salida: {registerExit.error.message}
              </AlertDescription>
            </Alert>
          )}
        </form>

        {/* Confirmación de salida mejorado */}
        <ExitConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          vehicle={searchedVehicle}
          calculatedCost={currentCost || 0}
          paymentMethod={paymentMethod as 'cash' | 'card' | 'digital' | 'transfer'}
          onConfirm={() => {
            // 🐛 FIX: Double-check payment amount is valid before submitting
            const amount = parseFloat(paymentAmount);
            if (!Number.isFinite(amount) || amount <= 0) {
              addToast('Error: Monto de pago inválido', 'error');
              setConfirmOpen(false);
              return;
            }

            setConfirmOpen(false);
            registerExit.mutate({
              parkingLotId: selectedParkingLot!.id!,
              vehicleData: {
                plate: normalizePlate(plate),
                payment_amount: amount,
                payment_method: paymentMethod as 'cash' | 'card' | 'digital'
              }
            });
          }}
          isProcessing={registerExit.isPending}
        />
      </CardContent>
    </Card>
  );
};
