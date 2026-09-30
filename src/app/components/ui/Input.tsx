'use client';

import { InputHTMLAttributes, ReactNode, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/** Campo del sistema (`.mf-campo`, sistema.css): etiqueta vinculada, foco visible y error anunciado. */
export default function Input({
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  className = '',
  id,
  ...props
}: InputProps) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const idAyuda = `${idCampo}-ayuda`;
  const ayuda = error || helperText;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={idCampo} className="mf-etiqueta">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--campo-placeholder)' }}
          >
            {icon}
          </div>
        )}
        <input
          id={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={ayuda ? idAyuda : undefined}
          className={`mf-campo w-full px-4 py-2.5 ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p id={idAyuda} role="alert" className="mt-1.5 text-sm" style={{ color: 'var(--danger-texto)' }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={idAyuda} className="mt-1.5 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
