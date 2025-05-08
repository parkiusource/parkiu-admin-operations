import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
