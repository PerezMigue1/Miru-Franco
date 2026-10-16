'use client';

import { ENLACE_POLITICA_ANTICIPOS, TEXTO_POLITICA_ANTICIPOS } from './consentimientoAnticipo';
import { useEffect } from 'react';
import { precargarVersionesVigentes } from '../../services/consentimientos';

interface CasillaPoliticaAnticiposProps {
  id: string;
  checked: boolean;
  onChange: (marcada: boolean) => void;
  error?: string | null;
}

/**
 * "Leí la Política de anticipos y cancelación": casilla real, sin marcar por defecto, con la política en otra
 * pestaña y un resumen de cuándo se devuelve el anticipo. Estilos en sistema.css (`.mf-consentimiento`).
 */
export default function CasillaPoliticaAnticipos({ id, checked, onChange, error }: CasillaPoliticaAnticiposProps) {
  // La casilla lleva la versión vigente del documento (la publicada en el panel, si hay).
  useEffect(() => {
    void precargarVersionesVigentes();
  }, []);
  const idError = `${id}-error`;
  const idResumen = `${id}-resumen`;
  return (
    <div className="mf-consentimiento">
      <p id={idResumen} className="text-sm text-encabezados-alterno">
        {TEXTO_POLITICA_ANTICIPOS}
      </p>
      <label htmlFor={id}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idResumen} ${idError}` : idResumen}
        />
        <span>
          Leí la{' '}
          <a href={ENLACE_POLITICA_ANTICIPOS} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            Política de anticipos y cancelación<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </span>
      </label>
      {error && (
        <p id={idError} role="alert" className="mf-consentimiento__error">
          {error}
        </p>
      )}
    </div>
  );
}
