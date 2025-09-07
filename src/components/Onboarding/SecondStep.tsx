import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CircleParking } from 'lucide-react';

import { OnboardingParkingForm } from './OnboardingParkingForm';
import { useRegisterParkingLot } from '@/hooks/parking';
import { ParkingLot } from '@/services/parking/types';

interface SecondStepProps {
  onComplete: (data: ParkingLot) => void;
}

interface StepRef {
  submitForm: () => Promise<void>;
}

const formStorage = {
  save: (data: Partial<ParkingLot>) => {
    localStorage.setItem('onboarding_step2', JSON.stringify(data));
  },
  load: () => {
    const saved = localStorage.getItem('onboarding_step2');
    return saved ? JSON.parse(saved) : null;
  },
  clear: () => {
    localStorage.removeItem('onboarding_step2');
  }
};

export const SecondStep = forwardRef<StepRef, SecondStepProps>(
  ({ onComplete }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutateAsync: createParking, isPending } = useRegisterParkingLot({
      onSuccess: (data: ParkingLot) => {
        formStorage.clear();
        onComplete(data);
      },
    });

    // Ref to access ParkingForm's submit
    const formRef = useRef<HTMLFormElement>(null);

    // Expose submitForm to parent via ref
    useImperativeHandle(ref, () => ({
      submitForm: async () => {
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      },
    }));

    // Form state for persistence
    const { watch, setValue } = useForm<ParkingLot>({
      defaultValues: {
        name: '',
        address: '',
        location: { latitude: 0, longitude: 0 },
        total_spots: 0,
        car_rate_per_minute: 0,
      },
      mode: 'onChange',
    });

    // Load saved form data on mount
    useEffect(() => {
      const savedData = formStorage.load();
      if (savedData) {
        Object.entries(savedData).forEach(([key, value]) => {
          if (key === 'location' && typeof value === 'object' && value !== null) {
            const location = value as { latitude: number; longitude: number };
            setValue('location', { latitude: location.latitude || 0, longitude: location.longitude || 0 });
          } else if (key !== 'location') {
            setValue(key as keyof Omit<ParkingLot, 'location'>, value as string | number);
          }
        });
      }
    }, [setValue]);

    // Save form data on change
    useEffect(() => {
      const subscription = watch((value) => {
        if (value) {
          formStorage.save(value as Partial<ParkingLot>);
        }
      });
      return () => subscription.unsubscribe();
    }, [watch]);

    // Handle form submit
    const onSubmit = async (data: ParkingLot) => {
      setIsSubmitting(true);
      try {
        setError(null);
        // Validations
        if (!data.location.latitude || !data.location.longitude) {
          throw new Error('Por favor selecciona una ubicación válida');
        }
        if (data.total_spots <= 0) {
          throw new Error('El número de espacios debe ser mayor a 0');
        }
        if (data.car_rate_per_minute <= 0) {
          throw new Error('La tarifa por minuto debe ser mayor a 0');
        }
        await createParking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear el parqueadero');
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="relative p-6">
        {/* Loading overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-parkiu-200 border-t-parkiu-600 rounded-full animate-spin"></div>
            <p className="text-parkiu-600 font-medium">Registrando parqueadero...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-parkiu-500 to-parkiu-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CircleParking className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registra tu parqueadero</h2>
          <p className="text-gray-600">Completa la información de tu parqueadero para comenzar a recibir clientes</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-3" role="alert">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
        <OnboardingParkingForm
          ref={formRef}
          onSubmit={onSubmit}
          isLoading={isPending}
          inheritSubmit={true}
        />
      </div>
    );
  }
);

SecondStep.displayName = 'SecondStep';
