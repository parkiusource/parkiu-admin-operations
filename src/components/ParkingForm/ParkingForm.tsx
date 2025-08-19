import { forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { SearchBox } from '@/components/parking/SearchBox';
import { usePlaceDetails } from '@/api/hooks/usePlaceDetails';
import { ParkingLot } from '@/services/parking/types';

interface ParkingFormProps {
  onSubmit: (data: ParkingLot) => Promise<void>;
  isLoading?: boolean;
  initialValues?: Partial<ParkingLot>;
  inheritSubmit?: boolean;
  className?: string;
}

export const ParkingForm = forwardRef<HTMLFormElement, ParkingFormProps>(
  ({ onSubmit, isLoading = false, initialValues = {}, inheritSubmit = true, className = '' }, ref) => {
    const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm<ParkingLot>({
      defaultValues: initialValues,
    });

    const { getDetails } = usePlaceDetails();
    const addressValue = watch('address');

    // Handler para selección de dirección desde SearchBox
    const handleAddressSelect = async ({ placeId }: { placeId: string }) => {
      const details = await getDetails(placeId);
      if (details && details.location) {
        setValue('address', details.formattedAddress || '');
        setValue('location', {
          latitude: details.location.latitude,
          longitude: details.location.longitude,
        });
      } else {
        alert('No se pudo obtener la ubicación del parqueadero');
      }
    };

    const handleFormSubmit = async (data: ParkingLot) => {
      if (!data.location || typeof data.location.latitude !== 'number' || typeof data.location.longitude !== 'number') {
        alert('No se pudo obtener la ubicación del parqueadero');
        return;
      }
      await onSubmit(data);
    };

    return (
      <form
        ref={ref}
        onSubmit={inheritSubmit ? handleSubmit(handleFormSubmit) : undefined}
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}
      >
        <div className="col-span-1 md:col-span-3">
          <label className="block text-sm font-medium text-gray-700">
            Nombre del parqueadero
            <input
              type="text"
              {...register('name', { required: 'El nombre es requerido' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/30"
            />
          </label>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="col-span-1 md:col-span-3">
          <label className="block text-sm font-medium text-gray-700">
            Dirección
            <SearchBox
              onResultSelected={handleAddressSelect}
              value={addressValue}
              locationBias={{ lat: 4.710989, lng: -74.072092, radius: 20000 }}
            />
          </label>
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Espacios totales
            <input
              type="number"
              {...register('total_spots', {
                required: 'El número de espacios es requerido',
                min: { value: 1, message: 'Debe tener al menos 1 espacio' },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/30"
            />
          </label>
          {errors.total_spots && (
            <p className="mt-1 text-sm text-red-600">{errors.total_spots.message}</p>
          )}
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">
            Precio por hora
            <input
              type="number"
              {...register('price_per_hour', {
                required: 'El precio por hora es requerido',
                min: { value: 0, message: 'El precio no puede ser negativo' },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/30"
            />
          </label>
          {errors.price_per_hour && (
            <p className="mt-1 text-sm text-red-600">{errors.price_per_hour.message}</p>
          )}
        </div>

        {!inheritSubmit && (
          <div className="col-span-1 md:col-span-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </form>
    );
  }
);
