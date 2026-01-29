import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/common/Dialog';
import { Button } from '@/components/common/Button';
import { AlertTriangle, Clock, DollarSign, CreditCard } from 'lucide-react';
import type { ActiveVehicle } from '@/types/parking';

interface ExitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: ActiveVehicle | null;
  calculatedCost: number;
  paymentMethod: 'cash' | 'card' | 'digital' | 'transfer';
  onConfirm: () => void;
  isProcessing?: boolean;
}

const paymentMethodLabels = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  digital: 'Pago Digital',
  transfer: 'Transferencia'
};

const paymentMethodIcons = {
  cash: DollarSign,
  card: CreditCard,
  digital: CreditCard,
  transfer: CreditCard
};

export const ExitConfirmationDialog: React.FC<ExitConfirmationDialogProps> = ({
  open,
  onOpenChange,
  vehicle,
  calculatedCost,
  paymentMethod,
  onConfirm,
  isProcessing = false
}) => {
  if (!vehicle) return null;

  const PaymentIcon = paymentMethodIcons[paymentMethod];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const entryTime = vehicle.entry_time ? new Date(vehicle.entry_time) : null;
  const now = new Date();

  // 🐛 FIX: Use vehicle.duration_minutes if available to match the frozen cost calculation
  // Otherwise calculate it locally (fallback for offline scenarios)
  const durationMinutes = vehicle.duration_minutes ??
    (entryTime ? Math.floor((now.getTime() - entryTime.getTime()) / 60000) : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Confirmar Salida de Vehículo
          </DialogTitle>
          <DialogDescription>
            Por favor, revise los detalles antes de procesar la salida
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del Vehículo */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Placa:</span>
              <span className="text-lg font-bold font-mono">{vehicle.plate.toUpperCase()}</span>
            </div>

            {vehicle.vehicle_type && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tipo:</span>
                <span className="text-sm font-medium capitalize">{vehicle.vehicle_type}</span>
              </div>
            )}

            {vehicle.spot_number && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Espacio:</span>
                <span className="text-sm font-medium font-mono">{vehicle.spot_number}</span>
              </div>
            )}

            {entryTime && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Entrada:</span>
                <span className="text-sm">{entryTime.toLocaleString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Tiempo:
              </span>
              <span className="text-sm font-medium">{formatDuration(durationMinutes)}</span>
            </div>
          </div>

          {/* Información de Pago */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <PaymentIcon className="w-4 h-4" />
                Método de pago:
              </span>
              <span className="text-sm font-medium">{paymentMethodLabels[paymentMethod]}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
              <span className="text-base font-semibold text-gray-900">Total a cobrar:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${calculatedCost.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Advertencia */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ Esta acción no se puede deshacer. Asegúrese de que el monto es correcto antes de confirmar.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Procesando...
              </div>
            ) : (
              'Confirmar Salida'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExitConfirmationDialog;
