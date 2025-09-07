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
  ({ onSubmit, isLoading, initialValues, inheritSubmit, className }, ref) => {
    const { register, handleSubmit, setValue } = useForm<ParkingLot>({
      defaultValues: initialValues,
    });

    const { getDetails } = usePlaceDetails();

    const handlePlaceSelect = async (suggestion: { placeId: string; text: string }) => {
      const details = await getDetails(suggestion.placeId);
      if (details) {
        setValue('name', details.displayName?.text || '');
        setValue('address', details.formattedAddress || '');
        setValue('location', {
          latitude: details.location?.latitude || 0,
          longitude: details.location?.longitude || 0,
        });
      }
    };

    return (
      <form
        id="parking-form"
        ref={ref}
        onSubmit={handleSubmit(onSubmit)}
        className={className}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre del parqueadero
            </label>
            <input
              type="text"
              id="name"
              {...register('name', { required: 'El nombre es requerido' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <SearchBox onResultSelected={handlePlaceSelect} />
            <input
              type="text"
              id="address"
              {...register('address', { required: 'La dirección es requerida' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="total_spots" className="block text-sm font-medium text-gray-700">
              Número de espacios
            </label>
            <input
              type="number"
              id="total_spots"
              {...register('total_spots', {
                required: 'El número de espacios es requerido',
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="price_per_hour" className="block text-sm font-medium text-gray-700">
              Precio por hora
            </label>
            <input
              type="number"
              id="price_per_hour"
              {...register('price_per_hour', {
                required: 'El precio por hora es requerido',
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {!inheritSubmit && (
          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </form>
    );
  }
);

ParkingForm.displayName = 'ParkingForm';
