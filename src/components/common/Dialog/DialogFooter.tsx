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
        // Mobile: stack buttons vertically with gap
        'flex flex-col-reverse gap-2 pt-4 border-t border-gray-100',
        // Desktop: horizontal layout
        'sm:flex-row sm:justify-end sm:gap-2 sm:pt-0 sm:border-t-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

DialogFooter.displayName = 'DialogFooter';
