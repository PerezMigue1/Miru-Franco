'use client';

import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export default function Textarea({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  ...props
}: TextareaProps) {
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
      <textarea
        className={`
          w-full px-4 py-2.5 rounded-lg border transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-offset-2
          resize-y
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
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--encabezados-alterno)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
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

