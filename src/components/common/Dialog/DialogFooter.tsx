import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

DialogFooter.displayName = 'DialogFooter';
