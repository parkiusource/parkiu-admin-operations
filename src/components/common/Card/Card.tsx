import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type CardVariant = 'inherit' | 'primary' | 'secondary' | 'white';
type CardSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  size?: CardSize;
}

const variants: Record<CardVariant, string> = {
  inherit: 'bg-inherit',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  white: 'bg-white',
};

const sizes: Record<CardSize, string> = {
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
  xxl: 'p-10',
};

const getCardClassName = ({ className, variant, size }: { className?: string; variant: CardVariant; size: CardSize }) => {
  return twMerge(
    'rounded-lg shadow-sm',
    variants[variant],
    sizes[size],
    className
  );
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'white', size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={getCardClassName({ className, variant, size })}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
