'use client';

import { SelectHTMLAttributes, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
}

/** Selector del sistema (`.mf-campo`, sistema.css): mismo campo que Input. */
export default function Select({
  label,
  error,
  helperText,
  options,
  fullWidth = false,
  className = '',
  id,
  ...props
}: SelectProps) {
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
      <select
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={ayuda ? idAyuda : undefined}
        className={`mf-campo w-full px-4 py-2.5 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            style={{ color: 'var(--menu-texto-principal)', backgroundColor: 'var(--input-bg)' }}
          >
            {option.label}
          </option>
        ))}
      </select>
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
