import { forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/common/Dialog';
import { ParkingForm } from './ParkingForm';
import { ParkingLot } from '@/types/parking';

interface ParkingFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ParkingLot) => Promise<void>;
  initialValues?: Partial<ParkingLot>;
  title?: string;
}

export const ParkingFormDialog = forwardRef<HTMLFormElement, ParkingFormDialogProps>(
  ({ isOpen, onClose, onSubmit, initialValues, title = 'Registrar parqueadero' }, ref) => {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <ParkingForm
            ref={ref}
            onSubmit={onSubmit}
            initialValues={initialValues}
            inheritSubmit={true}
          />
        </DialogContent>
      </Dialog>
    );
  }
);

ParkingFormDialog.displayName = 'ParkingFormDialog';
