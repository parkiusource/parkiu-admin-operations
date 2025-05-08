import { forwardRef, useImperativeHandle, useState } from 'react';

import { ParkingForm } from '@/components/admin/ParkingForm/ParkingForm';
import { Card } from '@/components/common/Card/Card';
import { useCreateParking } from '@/api/hooks/useCreateParking';

interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  total_spots: number;
  price_per_hour: number;
}

interface SecondStepProps {
  onComplete: (data: ParkingLot) => void;
}

interface StepRef {
  submitForm: () => Promise<void>;
}

export const SecondStep = forwardRef<StepRef, SecondStepProps>(
  ({ onComplete }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const { mutateAsync: createParking, isPending } = useCreateParking({
      onSuccess: (data) => {
        onComplete(data);
      },
    });

    const onSubmit = async (data: ParkingLot) => {
      try {
        setError(null);
        await createParking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear el parqueadero');
      }
    };

    useImperativeHandle(ref, () => ({
      submitForm: async () => {
        const form = document.querySelector('form');
        if (form) {
          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
          form.dispatchEvent(submitEvent);
        }
      },
    }));

    return (
      <Card className="w-full max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Registra tu parqueadero</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <ParkingForm
          onSubmit={onSubmit}
          isLoading={isPending}
          inheritSubmit={false}
        />
      </Card>
    );
  }
);

SecondStep.displayName = 'SecondStep';
