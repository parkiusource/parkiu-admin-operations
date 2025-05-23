import { forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/common/Dialog';
import { ParkingForm } from './ParkingForm';
import { ParkingLot } from '@/types/parking';

interface ParkingFormDialogProps {
  children: React.ReactNode;
  onSubmit: (data: ParkingLot) => Promise<void>;
  title: string;
  description?: string;
  initialValues?: Partial<ParkingLot>;
}

export const ParkingFormDialog = forwardRef<HTMLDivElement, ParkingFormDialogProps>(
  ({ children, onSubmit, title, description, initialValues }, ref) => {
    return (
      <Dialog>
        {children}
        <DialogContent ref={ref}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </DialogHeader>
          <ParkingForm
            initialValues={initialValues}
            onSubmit={onSubmit}
          />
        </DialogContent>
      </Dialog>
    );
  }
);

ParkingFormDialog.displayName = 'ParkingFormDialog';
