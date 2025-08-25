import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, MapPin, Clock, DollarSign, Phone, FileText, User } from 'lucide-react';
import { useCreateParkingLot } from '@/hooks/parking/useParkingLots';
import { usePlaceDetails } from '@/api/hooks/usePlaceDetails';
import { ParkingLot } from '@/services/parking/types';
import { SearchBox } from './SearchBox';

interface CreateParkingLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newParkingLot: ParkingLot) => void;
}

type ParkingLotFormData = Omit<ParkingLot, 'id' | 'status' | 'created_at' | 'updated_at'>;

export function CreateParkingLotModal({ isOpen, onClose, onSuccess }: CreateParkingLotModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdParkingLot, setCreatedParkingLot] = useState<ParkingLot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: createParkingLot, isPending } = useCreateParkingLot({
    onSuccess: (data: ParkingLot) => {
      console.log('✅ Hook onSuccess - Parqueadero creado:', data);

      // 🔄 Usar datos del formulario para la pantalla de éxito
      const formData = watch();
      const displayData: ParkingLot = {
        ...data, // Mantener id, timestamps del backend
        // Usar datos del formulario para mostrar
        name: formData.name || '',
        address: formData.address || '',
        total_spots: formData.total_spots || 0,
        price_per_hour: formData.price_per_hour || 0,
        daily_rate: formData.daily_rate || 0,
        monthly_rate: formData.monthly_rate || 0,
        opening_time: formData.opening_time || '08:00',
        closing_time: formData.closing_time || '20:00',
        contact_name: formData.contact_name || '',
        contact_phone: formData.contact_phone || '',
        description: formData.description || '',
        location: formData.location || { latitude: 0, longitude: 0 },
        status: 'active'
      };

      console.log('🎯 Datos para mostrar:', displayData);

      setCreatedParkingLot(displayData);
      setIsSuccess(true);
      setError(null);
      setIsSubmitting(false);
      onSuccess?.(data); // Pasar datos originales del backend al callback
    },
    onError: (error: Error) => {
      console.error('❌ Error creando parqueadero:', error);
      setError(error.message || 'Error al crear el parqueadero');
      setIsSubmitting(false);
    }
  });

  const { getDetails } = usePlaceDetails();

  const {
    register,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors }
  } = useForm<ParkingLotFormData>({
    defaultValues: {
      name: '',
      address: '',
      location: { latitude: 0, longitude: 0 },
      total_spots: 1,
      price_per_hour: 0,
      daily_rate: 0,
      monthly_rate: 0,
      description: '',
      opening_time: '08:00',
      closing_time: '20:00',
      contact_name: '',
      contact_phone: ''
    }
  });

  const handlePlaceSelect = async (suggestion: { placeId: string; text: string }) => {
    try {
      setValue('address', suggestion.text);

      // Obtener detalles del lugar para conseguir las coordenadas
      const details = await getDetails(suggestion.placeId);
      if (details?.location) {
        setValue('location', {
          latitude: details.location.latitude,
          longitude: details.location.longitude
        });
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  // Función para manejar manualmente la creación del parqueadero
  const handleCreateParkingLot = async () => {
    console.log('🚀 Creación manual del parqueadero iniciada en paso:', currentStep);

    // Solo ejecutar si estamos en el paso 3
    if (currentStep !== 3) {
      console.log('⚠️ No estamos en el paso final. Paso actual:', currentStep);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Obtener datos del formulario
      const formData = watch();
      console.log('📋 Datos del formulario:', formData);

      // Validaciones adicionales
      if (!formData.location.latitude || !formData.location.longitude) {
        throw new Error('Por favor selecciona una dirección válida');
      }

      if (!formData.name.trim()) {
        throw new Error('El nombre del parqueadero es requerido');
      }

      // Asegurar que todos los campos numéricos sean números
      const sanitizedData: ParkingLotFormData = {
        ...formData,
        total_spots: Number(formData.total_spots) || 0,
        price_per_hour: Number(formData.price_per_hour) || 0,
        daily_rate: Number(formData.daily_rate) || 0,
        monthly_rate: Number(formData.monthly_rate) || 0
      };

      console.log('🧹 Datos sanitizados:', sanitizedData);

      if (sanitizedData.total_spots <= 0) {
        throw new Error('El número de espacios debe ser mayor a 0');
      }

      if ((sanitizedData.price_per_hour || sanitizedData.car_rate_per_minute * 60) <= 0) {
        throw new Error('El precio por hora debe ser mayor a 0');
      }

      console.log('🚀 Enviando datos al backend:', sanitizedData);
      const result = await createParkingLot(sanitizedData);
      console.log('✅ Resultado de la creación:', result);
    } catch (error) {
      console.error('Error al crear el parqueadero:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al crear el parqueadero');
      setIsSubmitting(false);
    }
  };



  const handleClose = () => {
    onClose();
    // Reset estados
    setIsSuccess(false);
    setCreatedParkingLot(null);
    setError(null);
    setCurrentStep(1);
    reset();
  };

  const nextStep = async () => {
    if (currentStep < 3) {
      setError(null); // Limpiar errores previos

      // Validar campos específicos según el paso actual
      let fieldsToValidate: (keyof ParkingLotFormData)[] = [];

      if (currentStep === 1) {
        fieldsToValidate = ['name', 'address', 'total_spots'];
      } else if (currentStep === 2) {
        fieldsToValidate = ['price_per_hour'];
      }

      // Validar solo los campos del paso actual
      const isValid = await trigger(fieldsToValidate);

      if (isValid) {
        // Validaciones adicionales específicas del paso
        const formData = watch();

        if (currentStep === 1) {
          if (!formData.location.latitude || !formData.location.longitude) {
            setError('Por favor selecciona una dirección válida usando el buscador');
            return;
          }
        }

        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
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
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <MapPin className="w-7 h-7" />
                  Crear Nuevo Parqueadero
                </h2>
                <p className="text-blue-100 mt-1">
                  Agrega un nuevo parqueadero a tu lista de propiedades
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                disabled={isSubmitting || isPending}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step <= currentStep
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white'
                    }
                  `}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`
                      w-16 h-1 mx-2
                      ${step < currentStep ? 'bg-white' : 'bg-blue-500'}
                    `} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Labels */}
            <div className="mt-2 flex justify-between text-sm text-blue-100 max-w-80">
              <span>Información Básica</span>
              <span>Precios y Horarios</span>
              <span>Contacto</span>
            </div>
          </div>

          {/* Content */}
          {isSuccess && createdParkingLot ? (
            // Pantalla de éxito
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¡Parqueadero Creado Exitosamente!
              </h3>

              <p className="text-gray-600 mb-6">
                El parqueadero <strong>"{createdParkingLot.name}"</strong> ha sido creado y agregado a tu lista de propiedades.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-900 mb-3">Detalles del Parqueadero:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium">{createdParkingLot.name || 'Sin nombre'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Dirección:</span>
                    <span className="ml-2 font-medium">{createdParkingLot.address || 'Sin dirección'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Espacios:</span>
                    <span className="ml-2 font-medium">{createdParkingLot.total_spots || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Precio/hora:</span>
                    <span className="ml-2 font-medium">${createdParkingLot.price_per_hour || 0}</span>
                  </div>
                  {createdParkingLot.daily_rate && createdParkingLot.daily_rate > 0 && (
                    <div>
                      <span className="text-gray-600">Precio diario:</span>
                      <span className="ml-2 font-medium">${createdParkingLot.daily_rate}</span>
                    </div>
                  )}
                  {createdParkingLot.monthly_rate && createdParkingLot.monthly_rate > 0 && (
                    <div>
                      <span className="text-gray-600">Precio mensual:</span>
                      <span className="ml-2 font-medium">${createdParkingLot.monthly_rate}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Horario:</span>
                    <span className="ml-2 font-medium">
                      {createdParkingLot.opening_time || '08:00'} - {createdParkingLot.closing_time || '20:00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {createdParkingLot.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {createdParkingLot.contact_name && (
                    <div>
                      <span className="text-gray-600">Contacto:</span>
                      <span className="ml-2 font-medium">{createdParkingLot.contact_name}</span>
                    </div>
                  )}
                  {createdParkingLot.contact_phone && (
                    <div>
                      <span className="text-gray-600">Teléfono:</span>
                      <span className="ml-2 font-medium">{createdParkingLot.contact_phone}</span>
                    </div>
                  )}
                  {createdParkingLot.description && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Descripción:</span>
                      <span className="ml-2 font-medium">{createdParkingLot.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continuar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="space-y-6">

              {/* Mostrar errores */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error al crear el parqueadero</h3>
                      <p className="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Información Básica */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Información Básica</h3>
                    <p className="text-gray-600">Datos principales del parqueadero</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombre */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-2" />
                        Nombre del parqueadero *
                      </label>
                      <input
                        type="text"
                        {...register('name', {
                          required: 'El nombre es requerido',
                          minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                        })}
                        placeholder="Ej: Parqueadero Central Plaza"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Dirección con Google Places */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Dirección *
                      </label>
                      <div className="space-y-2">
                        <SearchBox onResultSelected={handlePlaceSelect} />
                        <input
                          type="text"
                          {...register('address', { required: 'La dirección es requerida' })}
                          placeholder="Dirección seleccionada aparecerá aquí..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          readOnly
                        />
                      </div>
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                      )}
                    </div>

                    {/* Total de espacios */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número total de espacios *
                      </label>
                      <input
                        type="number"
                        {...register('total_spots', {
                          required: 'El número de espacios es requerido',
                          min: { value: 1, message: 'Mínimo 1 espacio' },
                          max: { value: 1000, message: 'Máximo 1000 espacios' },
                          valueAsNumber: true
                        })}
                        placeholder="50"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.total_spots && (
                        <p className="mt-1 text-sm text-red-600">{errors.total_spots.message}</p>
                      )}
                    </div>

                    {/* Descripción */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        placeholder="Descripción opcional del parqueadero..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Precios y Horarios */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Precios y Horarios</h3>
                    <p className="text-gray-600">Configura las tarifas y horarios de operación</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Precio por hora */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-2" />
                        Precio por hora *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          {...register('price_per_hour', {
                            required: 'El precio por hora es requerido',
                            min: { value: 0, message: 'El precio no puede ser negativo' },
                            valueAsNumber: true
                          })}
                          placeholder="5000"
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {errors.price_per_hour && (
                        <p className="mt-1 text-sm text-red-600">{errors.price_per_hour.message}</p>
                      )}
                    </div>

                    {/* Precio diario */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-2" />
                        Precio diario
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          {...register('daily_rate', {
                            min: { value: 0, message: 'El precio no puede ser negativo' },
                            valueAsNumber: true
                          })}
                          placeholder="40000"
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {errors.daily_rate && (
                        <p className="mt-1 text-sm text-red-600">{errors.daily_rate.message}</p>
                      )}
                    </div>

                    {/* Precio mensual */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-2" />
                        Precio mensual
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          {...register('monthly_rate', {
                            min: { value: 0, message: 'El precio no puede ser negativo' },
                            valueAsNumber: true
                          })}
                          placeholder="800000"
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {errors.monthly_rate && (
                        <p className="mt-1 text-sm text-red-600">{errors.monthly_rate.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Horarios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Hora de apertura
                      </label>
                      <input
                        type="time"
                        {...register('opening_time')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Hora de cierre
                      </label>
                      <input
                        type="time"
                        {...register('closing_time')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Información de Contacto */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Información de Contacto</h3>
                    <p className="text-gray-600">Datos de contacto para el parqueadero</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombre de contacto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-2" />
                        Nombre de contacto
                      </label>
                      <input
                        type="text"
                        {...register('contact_name')}
                        placeholder="Juan Pérez"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Teléfono de contacto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Teléfono de contacto
                      </label>
                      <input
                        type="tel"
                        {...register('contact_phone')}
                        placeholder="+57 301 234 5678"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Resumen del Parqueadero</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Nombre:</span>
                        <span className="ml-2 text-gray-900">{watch('name') || 'Sin especificar'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Espacios:</span>
                        <span className="ml-2 text-gray-900">{watch('total_spots') || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Precio/hora:</span>
                        <span className="ml-2 text-gray-900">${watch('price_per_hour') || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Horario:</span>
                        <span className="ml-2 text-gray-900">
                          {watch('opening_time') || '08:00'} - {watch('closing_time') || '20:00'}
                        </span>
                      </div>
                      {watch('daily_rate') && Number(watch('daily_rate')) > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Precio diario:</span>
                          <span className="ml-2 text-gray-900">${watch('daily_rate')}</span>
                        </div>
                      )}
                      {watch('monthly_rate') && Number(watch('monthly_rate')) > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Precio mensual:</span>
                          <span className="ml-2 text-gray-900">${watch('monthly_rate')}</span>
                        </div>
                      )}
                      {watch('contact_name') && (
                        <div>
                          <span className="font-medium text-gray-700">Contacto:</span>
                          <span className="ml-2 text-gray-900">{watch('contact_name')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-200">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isSubmitting || isPending}
                  >
                    Anterior
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting || isPending}
                >
                  Cancelar
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateParkingLot}
                    disabled={isSubmitting || isPending}
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {(isSubmitting || isPending) ? (
                      <>
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        Crear Parqueadero
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
