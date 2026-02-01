import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Car, Plus } from 'lucide-react';
import { useCreateRealParkingSpace } from '@/hooks/parking/useParkingSpots';
import { ParkingSpot } from '@/services/parking/types';

interface CreateParkingSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newSpace: ParkingSpot) => void;
  parkingLotId: string;
}

interface SpaceFormData {
  space_number: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  is_reserved: boolean;
  reserved_for?: string;
}

export function CreateParkingSpaceModal({
  isOpen,
  onClose,
  onSuccess,
  parkingLotId
}: CreateParkingSpaceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createParkingSpace, isPending } = useCreateRealParkingSpace({
    onSuccess: (createdSpace) => {
      onSuccess?.(createdSpace);
      onClose();
      reset();
    },
    onError: () => {
      // Error handling is done by the mutation itself
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<SpaceFormData>({
    defaultValues: {
      space_number: '',
      vehicle_type: 'car',
      is_reserved: false,
      reserved_for: ''
    }
  });

  const isReserved = watch('is_reserved');

  const onSubmit = async (data: SpaceFormData) => {
    setIsSubmitting(true);
    try {
      // Convertir los datos del formulario al formato esperado por el hook
      const spaceData: Omit<ParkingSpot, 'id' | 'created_at' | 'updated_at' | 'syncStatus' | 'last_status_change'> = {
        number: data.space_number,
        parking_lot_id: parkingLotId.toString(),
        type: data.vehicle_type,
        status: data.is_reserved ? 'reserved' : 'available',
        is_reserved: data.is_reserved,
        reserved_for: data.is_reserved ? data.reserved_for : undefined,
        floor: 1 // Default floor
      };

      await createParkingSpace({
        spaceData,
        parkingLotId
      });
    } catch (error) {
      console.error('Error al crear el espacio:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-indigo-600" />
                Crear Nuevo Espacio
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Agrega un espacio individual al parqueadero
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting || isPending}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Número del espacio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número del espacio *
              </label>
              <input
                type="text"
                {...register('space_number', {
                  required: 'El número del espacio es requerido',
                  minLength: { value: 1, message: 'Mínimo 1 carácter' }
                })}
                placeholder="Ej: A-01, B-12, 001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.space_number && (
                <p className="mt-1 text-sm text-red-600">{errors.space_number.message}</p>
              )}
            </div>

            {/* Tipo de vehículo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de vehículo *
              </label>
              <select
                {...register('vehicle_type', { required: 'Selecciona un tipo de vehículo' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="car">Automóvil</option>
                <option value="motorcycle">Motocicleta</option>
                <option value="truck">Camión</option>
                <option value="bicycle">Bicicleta</option>
              </select>
              {errors.vehicle_type && (
                <p className="mt-1 text-sm text-red-600">{errors.vehicle_type.message}</p>
              )}
            </div>

            {/* Estado de reserva */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('is_reserved')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Marcar como reservado
                </span>
              </label>
            </div>

            {/* Campo para reserva */}
            {isReserved && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reservado para
                </label>
                <input
                  type="text"
                  {...register('reserved_for', {
                    required: isReserved ? 'Especifica para quién está reservado' : false
                  })}
                  placeholder="Nombre o identificación"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {errors.reserved_for && (
                  <p className="mt-1 text-sm text-red-600">{errors.reserved_for.message}</p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isSubmitting || isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isPending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {(isSubmitting || isPending) ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Espacio
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
