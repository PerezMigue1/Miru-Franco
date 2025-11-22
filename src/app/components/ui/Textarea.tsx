'use client';

import { TextareaHTMLAttributes } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

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
          style={{ color: colors.menuTextoPrincipal }}
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
      />
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

