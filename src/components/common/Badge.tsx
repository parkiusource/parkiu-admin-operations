import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'error' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200'
};

const sizeStyles = {
  small: 'text-[10px] px-1.5 py-0.5',
  medium: 'text-xs px-2 py-1',
  large: 'text-sm px-2.5 py-1.5'
};

export function Badge({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}
