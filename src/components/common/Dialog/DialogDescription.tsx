import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={twMerge('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  )
);

DialogDescription.displayName = 'DialogDescription';
