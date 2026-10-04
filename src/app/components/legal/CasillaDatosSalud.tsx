'use client';

import { useId, type InputHTMLAttributes, type Ref } from 'react';
import type { QuienCaptura } from '../../utils/consentimientoDatosSensibles';

interface CasillaDatosSaludProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 'clienta': la clienta autoriza (con enlace al Aviso). 'personal': el personal confirma que la clienta autorizó. */
  quien?: QuienCaptura;
  error?: string | null;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Casilla de consentimiento expreso para datos de salud (alergias y sensibilidad). Va aparte, sin marcar por
 * defecto, junto al campo de alergias. Sirve igual con react-hook-form (`{...register()}`) que con estado propio.
 * Estilos en sistema.css (`.mf-consentimiento`): se usa en el portal y en los paneles.
 */
export default function CasillaDatosSalud({ quien = 'clienta', error, className = '', id, ...input }: CasillaDatosSaludProps) {
  const propio = useId();
  const idCasilla = id ?? `consentimiento-${propio}`;
  const idError = `${idCasilla}-error`;
  return (
    <div className={`mf-consentimiento ${className}`.trim()}>
      <label htmlFor={idCasilla}>
        <input
          type="checkbox"
          id={idCasilla}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          {...input}
        />
        {quien === 'personal' ? (
          <span>La clienta autorizó el uso de sus datos de salud</span>
        ) : (
          <span>
            Autorizo el uso de mis datos de salud (alergias y sensibilidad) solo para valorar si un tratamiento es seguro
            para mí, conforme al{' '}
            <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              Aviso de Privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </span>
        )}
      </label>
      {error && (
        <p id={idError} role="alert" className="mf-consentimiento__error">
          {error}
        </p>
      )}
    </div>
  );
}
