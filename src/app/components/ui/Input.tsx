'use client';

import { InputHTMLAttributes, ReactNode } from 'react';
import { colors } from '../../utils/colors';

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
  ...props
}: InputProps) {
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          className="block mb-2 font-medium"
          style={{ color: colors.menuTextoPrincipal }}
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
            backgroundColor: colors.textoFondoOscuro,
            borderColor: error ? colors.danger : colors.encabezadosAlterno,
            color: colors.menuTextoPrincipal,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.hover;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.hover}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? colors.danger : colors.encabezadosAlterno;
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm" style={{ color: colors.danger }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm" style={{ color: colors.encabezadosAlterno }}>
          {helperText}
        </p>
      )}
    </div>
  );
}

