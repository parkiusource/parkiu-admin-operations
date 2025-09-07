import { forwardRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { MapPin, Building, Users, DollarSign } from 'lucide-react';
import { SearchBox } from '@/components/parking/SearchBox';
import { usePlaceDetails } from '@/api/hooks/usePlaceDetails';
import { ParkingLot } from '@/services/parking/types';
import { Label } from '@/components/common/Label';
import { Input } from '@/components/common/Input';

interface OnboardingParkingFormProps {
  onSubmit: (data: ParkingLot) => Promise<void>;
  isLoading?: boolean;
  initialValues?: Partial<ParkingLot>;
  inheritSubmit?: boolean;
  className?: string;
}

export const OnboardingParkingForm = forwardRef<HTMLFormElement, OnboardingParkingFormProps>(
  ({ onSubmit, isLoading, initialValues, inheritSubmit, className }, ref) => {
    const [selectedPlace, setSelectedPlace] = useState<string>('');

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ParkingLot>({
      defaultValues: initialValues,
    });

    const { getDetails } = usePlaceDetails();

    const handlePlaceSelect = async (suggestion: { placeId: string; text: string }) => {
      setSelectedPlace(suggestion.text);
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
        ref={ref}
        onSubmit={handleSubmit(onSubmit)}
        className={`space-y-4 ${className}`}
      >
        {/* Nombre del parqueadero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <Label htmlFor="name" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <Building className="w-3 h-3 text-parkiu-600" />
            </div>
            Nombre del parqueadero
          </Label>
          <div className="relative group">
            <Input
              id="name"
              {...register('name', { required: 'El nombre del parqueadero es requerido' })}
              placeholder="Ej: Parqueadero Centro Comercial"
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10 group-hover:border-parkiu-400'
              }`}
            />
            {!errors.name && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-sm">✓</span>
              </div>
            )}
          </div>
          {errors.name && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {errors.name.message}
            </motion.p>
          )}
        </motion.div>

        {/* Dirección */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <Label htmlFor="address" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-3 h-3 text-parkiu-600" />
            </div>
            Dirección
          </Label>
          <div className="space-y-3">
            <div className="relative">
              <SearchBox
                onResultSelected={handlePlaceSelect}
                placeholder="Buscar dirección..."
              />
            </div>
            {selectedPlace && (
              <div className="p-3 bg-parkiu-50 border border-parkiu-200 rounded-xl">
                <p className="text-sm text-parkiu-700">
                  <span className="font-medium">Ubicación seleccionada:</span> {selectedPlace}
                </p>
              </div>
            )}
            <input
              type="hidden"
              {...register('address', { required: 'La dirección es requerida' })}
            />
          </div>
          {errors.address && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
              role="alert"
            >
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </span>
              {errors.address.message}
            </motion.p>
          )}
        </motion.div>

        {/* Espacios y Tarifa en fila */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Número de espacios */}
          <div className="space-y-2">
            <Label htmlFor="total_spots" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
              <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
                <Users className="w-3 h-3 text-parkiu-600" />
              </div>
              Número de espacios
            </Label>
            <div className="relative group">
              <Input
                id="total_spots"
                type="number"
                min="1"
                {...register('total_spots', {
                  required: 'El número de espacios es requerido',
                  min: { value: 1, message: 'Debe tener al menos 1 espacio' },
                  valueAsNumber: true
                })}
                placeholder="Ej: 50"
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                  errors.total_spots
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10 group-hover:border-parkiu-400'
                }`}
              />
              {!errors.total_spots && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-sm">✓</span>
                </div>
              )}
            </div>
            {errors.total_spots && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs flex items-center gap-1"
                role="alert"
              >
                <span className="text-red-500">⚠</span>
                {errors.total_spots.message}
              </motion.p>
            )}
          </div>

          {/* Tarifa por minuto */}
          <div className="space-y-2">
            <Label htmlFor="car_rate_per_minute" className="text-gray-800 font-semibold text-sm flex items-center gap-2">
              <div className="w-5 h-5 bg-parkiu-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-parkiu-600" />
              </div>
              Tarifa por minuto (COP)
            </Label>
            <div className="relative group">
              <Input
                id="car_rate_per_minute"
                type="number"
                min="0"
                step="1"
                {...register('car_rate_per_minute', {
                  required: 'La tarifa por minuto es requerida',
                  min: { value: 1, message: 'La tarifa debe ser mayor a 0' },
                  valueAsNumber: true
                })}
                placeholder="Ej: 83"
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white shadow-sm hover:shadow-md focus:shadow-lg ${
                  errors.car_rate_per_minute
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 hover:border-parkiu-300 focus:border-parkiu-500 focus:ring-4 focus:ring-parkiu-500/10 group-hover:border-parkiu-400'
                }`}
              />
              {!errors.car_rate_per_minute && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-parkiu-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-sm">✓</span>
                </div>
              )}
            </div>
            {errors.car_rate_per_minute && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs flex items-center gap-1"
                role="alert"
              >
                <span className="text-red-500">⚠</span>
                {errors.car_rate_per_minute.message}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Info compacta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg"
        >
          💡 Las tarifas para otros vehículos se configurarán automáticamente. Puedes ajustar todo desde el dashboard después.
        </motion.div>

        {!inheritSubmit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pt-4"
          >
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-parkiu-600 to-parkiu-700 hover:from-parkiu-700 hover:to-parkiu-800 shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Registrando...
                </div>
              ) : (
                'Registrar parqueadero'
              )}
            </button>
          </motion.div>
        )}
      </form>
    );
  }
);

OnboardingParkingForm.displayName = 'OnboardingParkingForm';
