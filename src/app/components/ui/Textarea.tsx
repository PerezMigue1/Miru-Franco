'use client';

import { TextareaHTMLAttributes, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

/** Área de texto del sistema (`.mf-campo`, sistema.css). */
export default function Textarea({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  ...props
}: TextareaProps) {
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
      <textarea
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={ayuda ? idAyuda : undefined}
        className={`mf-campo w-full px-4 py-2.5 resize-y ${className}`}
        {...props}
      />
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
