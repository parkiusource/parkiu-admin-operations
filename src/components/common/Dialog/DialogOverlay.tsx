import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface DialogOverlayProps {
  className?: string;
}

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={twMerge(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
);

DialogOverlay.displayName = 'DialogOverlay';
