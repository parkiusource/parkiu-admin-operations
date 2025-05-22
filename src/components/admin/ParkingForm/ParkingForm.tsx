import { forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { SearchBox } from '@/components/parking/SearchBox';
import { usePlaceDetails } from '@/api/hooks/usePlaceDetails';

interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  total_spots: number;
  price_per_hour: number;
}

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
        console.log(details);
        setValue('address', details.formattedAddress || '');
        setValue('location', {
          latitude: details.location?.latitude || 0,
          longitude: details.location?.longitude || 0,
        });
      } else {
        // Mostrar error al usuario
        console.error('No se pudo obtener la ubicación del parqueadero');
      }
    };

    const handleFormSubmit = async (data: ParkingLot) => {
      await onSubmit(data);
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit(handleFormSubmit)}
        className={`space-y-6 ${className}`}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nombre del parqueadero
          </label>
          <input
            type="text"
            id="name"
            {...register('name', { required: 'El nombre es requerido' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && (
            <span className="text-sm text-red-600">{errors.name.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="address" className="text-sm font-medium text-gray-700">
            Dirección
          </label>
          <SearchBox
            placeholder="Buscar dirección..."
            onResultSelected={handleAddressSelect}
            value={addressValue}
            locationBias={{ lat: 4.710989, lng: -74.072092, radius: 20000 }}
          />
          {errors.address && (
            <span className="text-sm text-red-600">{errors.address.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="total_spots" className="text-sm font-medium text-gray-700">
            Número total de espacios
          </label>
          <input
            type="number"
            id="total_spots"
            {...register('total_spots', {
              required: 'El número de espacios es requerido',
              min: { value: 1, message: 'Debe tener al menos 1 espacio' },
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.total_spots && (
            <span className="text-sm text-red-600">{errors.total_spots.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="price_per_hour" className="text-sm font-medium text-gray-700">
            Precio por hora
          </label>
          <input
            type="number"
            id="price_per_hour"
            {...register('price_per_hour', {
              required: 'El precio por hora es requerido',
              min: { value: 0, message: 'El precio no puede ser negativo' },
            })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.price_per_hour && (
            <span className="text-sm text-red-600">{errors.price_per_hour.message}</span>
          )}
        </div>

        {inheritSubmit && (
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </form>
    );
  }
);

ParkingForm.displayName = 'ParkingForm';
