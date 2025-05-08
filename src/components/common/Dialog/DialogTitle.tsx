import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={twMerge('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  )
);

DialogTitle.displayName = 'DialogTitle';
