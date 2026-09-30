'use client';

import { Check } from 'lucide-react';

/**
 * Indicador de pasos de un flujo (reservar cita, comprar). La persona ve dónde está y qué
 * falta antes de comprometerse (ui-ux-pro-max: multi-step-progress). Solo presentación: no
 * navega ni cambia la lógica del flujo.
 */
export default function PasosFlujo({
  pasos,
  actual,
  etiqueta,
}: {
  pasos: string[];
  /** Índice (0) del paso en curso; `pasos.length` = flujo terminado. */
  actual: number;
  etiqueta: string;
}) {
  return (
    <nav aria-label={etiqueta} className="mb-8">
      <ol className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
        {pasos.map((paso, i) => {
          const hecho = i < actual;
          const activo = i === actual;
          return (
            <li key={paso} className="flex items-center gap-2 sm:gap-3 shrink-0" aria-current={activo ? 'step' : undefined}>
              <span className="flex items-center gap-2">
                <span
                  className="mf-cifras w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: hecho || activo ? 'var(--botones-principales)' : 'transparent',
                    color: hecho || activo ? 'var(--texto-fondo-oscuro)' : 'var(--encabezados-alterno)',
                    boxShadow: activo
                      ? '0 0 0 3px color-mix(in srgb, var(--logo-branding) 45%, transparent)'
                      : hecho
                        ? 'none'
                        : 'inset 0 0 0 1.5px color-mix(in srgb, var(--encabezados-alterno) 50%, transparent)',
                    transition: 'background-color 240ms ease, box-shadow 240ms ease',
                  }}
                >
                  {hecho ? <Check size={14} aria-hidden /> : i + 1}
                </span>
                <span
                  className={`text-sm ${activo ? 'font-semibold' : ''}`}
                  style={{ color: activo ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)' }}
                >
                  {paso}
                </span>
              </span>
              {i < pasos.length - 1 && (
                <span
                  className="w-6 sm:w-10 h-px"
                  style={{ backgroundColor: hecho ? 'var(--botones-principales)' : 'var(--mf-linea)' }}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Pasos del flujo de reserva, compartidos por detalle de servicio, calendario, crear cita y confirmación. */
export const PASOS_RESERVA = ['Servicio', 'Fecha y hora', 'Confirmar'];
