import { forwardRef } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'error';
  className?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', className = '' }, ref) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium';
    const variantClasses = {
      default: 'bg-background text-secondary',
      primary: 'bg-primary/10 text-primary',
      success: 'bg-green-50 text-green-700',
      error: 'bg-red-50 text-red-700',
    };

    return (
      <span
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
