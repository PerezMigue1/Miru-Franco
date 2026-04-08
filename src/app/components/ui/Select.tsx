'use client';

import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
}

export default function Select({
  label,
  error,
  helperText,
  options,
  fullWidth = false,
  className = '',
  onFocus,
  onBlur,
  ...props
}: SelectProps) {
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
      <select
        className={`
          w-full px-4 py-2.5 rounded-lg border transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        style={{
          backgroundColor: 'var(--input-bg)',
          borderColor: error ? 'var(--danger)' : 'var(--encabezados-alterno)',
          color: 'var(--menu-texto-principal)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--hover)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--hover)';
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--encabezados-alterno)';
          e.currentTarget.style.boxShadow = 'none';
          onBlur?.(e);
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ color: 'var(--menu-texto-principal)', backgroundColor: 'var(--input-bg)' }}>
            {option.label}
          </option>
        ))}
      </select>
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

