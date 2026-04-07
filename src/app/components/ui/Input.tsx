'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  className = '',
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          className="block mb-2 font-medium"
          style={{ color: 'var(--menu-texto-principal)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2.5 rounded-lg border transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? 'var(--danger)' : 'var(--encabezados-alterno)',
            color: 'var(--menu-texto-principal)',
          }}
          onFocus={(e) => {
            onFocus?.(e);
            e.currentTarget.style.borderColor = 'var(--hover)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--hover)';
          }}
          onBlur={(e) => {
            onBlur?.(e);
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--encabezados-alterno)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}

