import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    >
      {children}
    </div>
  )
);

DialogHeader.displayName = 'DialogHeader';
