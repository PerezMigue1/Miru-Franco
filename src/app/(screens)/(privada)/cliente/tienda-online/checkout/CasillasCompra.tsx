'use client';

import { CASILLAS_COMPRA, type EstadoCasillasCompra, type IdCasillaCompra } from './compraLegal';

/** id del input de cada casilla: el checkout lo usa para llevar el foco a la primera sin marcar. */
export const idCasillaCompra = (id: IdCasillaCompra) => `casilla-compra-${id}`;

interface CasillasCompraProps {
  estado: EstadoCasillasCompra;
  errores: Partial<Record<IdCasillaCompra, string>>;
  onCambio: (id: IdCasillaCompra, marcada: boolean) => void;
}

/**
 * Términos de venta y Política de reembolsos: dos casillas reales, sin marcar por defecto, cada una con su
 * documento en otra pestaña (no se pierde lo capturado) y su mensaje de error al lado. Estilos en sistema.css
 * (`.mf-consentimiento`, el mismo de la casilla de datos de salud).
 */
export default function CasillasCompra({ estado, errores, onCambio }: CasillasCompraProps) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
        Antes de confirmar
      </legend>
      {CASILLAS_COMPRA.map((casilla) => {
        const idInput = idCasillaCompra(casilla.id);
        const idError = `${idInput}-error`;
        const error = errores[casilla.id];
        return (
          <div key={casilla.id} className="mf-consentimiento">
            <label htmlFor={idInput}>
              <input
                type="checkbox"
                id={idInput}
                checked={estado[casilla.id]}
                onChange={(e) => onCambio(casilla.id, e.target.checked)}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? idError : undefined}
              />
              <span>
                {casilla.antes}
                <a href={casilla.enlace} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  {casilla.textoEnlace}
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
                {casilla.despues}
              </span>
            </label>
            {error && (
              <p id={idError} role="alert" className="mf-consentimiento__error">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
