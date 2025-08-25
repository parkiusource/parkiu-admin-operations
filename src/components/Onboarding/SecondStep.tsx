import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ParkingForm } from '@/components/admin/ParkingForm/ParkingForm';
import { Card } from '@/components/common/Card/Card';
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
        price_per_hour: 0,
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
        if ((data.price_per_hour || data.car_rate_per_minute * 60) <= 0) {
          throw new Error('El precio por hora debe ser mayor a 0');
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
      <Card className="w-full max-w-2xl mx-auto p-6 relative">
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-6">Registra tu parqueadero</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
        )}
        <ParkingForm
          ref={formRef}
          onSubmit={onSubmit}
          isLoading={isPending}
          inheritSubmit={true}
        />
      </Card>
    );
  }
);

SecondStep.displayName = 'SecondStep';
