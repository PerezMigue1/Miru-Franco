'use client';

import { frasesHorario, type HorarioDia } from '../../../services/configuracionSitio';
import { nombreDia } from './cambiosConfiguracion';
import { AvisoCampoLegal, COLOR_SUAVE, COLOR_TEXTO, MensajeError, VistaPrevia } from './piezas';
import type { Errores } from './validacionConfiguracion';

/** Horas que toma un día al reabrirlo si no tenía. */
const ABRE_POR_OMISION = '09:30';
const CIERRA_POR_OMISION = '19:30';

interface Props {
  dias: HorarioDia[];
  errores: Errores;
  onCambiar: (dias: HorarioDia[]) => void;
  /** El horario también aparece en los documentos legales. */
  legal?: boolean;
}

/**
 * Un renglón por día: casilla "Cerrado" y horas de apertura y cierre. En móvil el día y la casilla van
 * arriba y las dos horas abajo; desde 768 px, todo en una fila. El error va en el renglón de su día.
 */
export function FormHorario({ dias, errores, onCambiar, legal }: Props) {
  const cambiarDia = (i: number, cambio: Partial<HorarioDia>) => onCambiar(dias.map((d, k) => (k === i ? { ...d, ...cambio } : d)));
  const alternarCerrado = (i: number, cerrado: boolean) => {
    const d = dias[i];
    cambiarDia(i, cerrado ? { cerrado } : { cerrado, abre: d.abre || ABRE_POR_OMISION, cierra: d.cierra || CIERRA_POR_OMISION });
  };

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mf-etiqueta">Horario de atención (hora del centro de México)</legend>
      {legal && <AvisoCampoLegal />}
      {errores.dias && <MensajeError>{errores.dias}</MensajeError>}
      <ul className="divide-y" style={{ borderColor: 'var(--mf-linea)' }}>
        {dias.map((d, i) => {
          const idBase = `horario-${d.dia}`;
          const error = errores[`dias.${i}`];
          const nombre = nombreDia(d.dia);
          return (
            <li key={d.dia} className="py-3" style={{ borderColor: 'var(--mf-linea)' }}>
              <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 md:grid-cols-[8rem_8rem_minmax(0,1fr)_minmax(0,1fr)]">
                <p className="font-semibold" style={{ color: COLOR_TEXTO }} id={`${idBase}-nombre`}>
                  {nombre}
                </p>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 justify-self-end text-sm md:justify-self-start" style={{ color: COLOR_TEXTO }}>
                  <input
                    type="checkbox"
                    checked={d.cerrado}
                    onChange={(e) => alternarCerrado(i, e.target.checked)}
                    aria-describedby={`${idBase}-nombre`}
                    className="h-5 w-5 shrink-0"
                  />
                  <span>Cerrado</span>
                </label>
                <div className="min-w-0">
                  <label htmlFor={`${idBase}-abre`} className="mb-1 block text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
                    {`Abre (${nombre.toLowerCase()})`}
                  </label>
                  <input
                    id={`${idBase}-abre`}
                    type="time"
                    value={d.cerrado ? '' : d.abre}
                    disabled={d.cerrado}
                    onChange={(e) => cambiarDia(i, { abre: e.target.value })}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${idBase}-error` : undefined}
                    className="mf-campo w-full px-3 py-2 tabular-nums disabled:opacity-50"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor={`${idBase}-cierra`} className="mb-1 block text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
                    {`Cierra (${nombre.toLowerCase()})`}
                  </label>
                  <input
                    id={`${idBase}-cierra`}
                    type="time"
                    value={d.cerrado ? '' : d.cierra}
                    disabled={d.cerrado}
                    onChange={(e) => cambiarDia(i, { cierra: e.target.value })}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${idBase}-error` : undefined}
                    className="mf-campo w-full px-3 py-2 tabular-nums disabled:opacity-50"
                  />
                </div>
              </div>
              {error && <MensajeError id={`${idBase}-error`}>{error}</MensajeError>}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/** Cómo se lee el horario en el pie, Contacto y la compra (frasesHorario). */
export function VistaPreviaHorario({ dias, errores }: { dias: HorarioDia[]; errores: Errores }) {
  const hayErrores = Object.keys(errores).length > 0;
  return (
    <VistaPrevia titulo="Así se lee en el sitio">
      {hayErrores ? (
        <p className="text-sm">Corrige el horario para ver la vista previa.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {frasesHorario(dias).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </VistaPrevia>
  );
}
