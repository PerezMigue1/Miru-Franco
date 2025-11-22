'use client';

import { SelectHTMLAttributes, ReactNode } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

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
  ...props
}: SelectProps) {
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
      <select
        className={`
          w-full px-4 py-2.5 rounded-lg border transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        style={{
          backgroundColor: colors.textoFondoOscuro,
          borderColor: error ? colors.danger : colorsWithOpacity.bordeVisible,
          color: colors.menuTextoPrincipal,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.hover;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${colorsWithOpacity.hover20}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? colors.danger : colorsWithOpacity.bordeVisible;
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ color: colors.menuTextoPrincipal, backgroundColor: colors.textoFondoOscuro }}>
            {option.label}
          </option>
        ))}
      </select>
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

