'use client';

import { useRef, type KeyboardEvent } from 'react';

export interface Pestana {
  id: string;
  etiqueta: string;
}

export const idPestana = (grupo: string, id: string) => `${grupo}-tab-${id}`;
export const idPanel = (grupo: string, id: string) => `${grupo}-panel-${id}`;

interface Props {
  /** Prefijo de los ids de pestañas y paneles. */
  id: string;
  etiqueta: string;
  pestanas: Pestana[];
  activa: string;
  onCambiar: (id: string) => void;
}

/**
 * Pestañas accesibles (patrón ARIA tabs con activación automática): flechas izquierda y derecha, Inicio y
 * Fin mueven el foco y la selección; solo la activa entra en el orden de tabulación. Saltan de línea en
 * pantallas angostas (sin scroll horizontal) y cada una mide al menos 44 px.
 */
export default function Pestanas({ id, etiqueta, pestanas, activa, onCambiar }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = pestanas.length;
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (destino < 0) return;
    e.preventDefault();
    onCambiar(pestanas[destino].id);
    refs.current[destino]?.focus();
  };

  return (
    <div role="tablist" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {pestanas.map((p, i) => {
        const seleccionada = p.id === activa;
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={idPestana(id, p.id)}
            aria-selected={seleccionada}
            aria-controls={idPanel(id, p.id)}
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambiar(p.id)}
            onKeyDown={(e) => alTeclear(e, i)}
            className="mf-btn mf-btn-color min-h-11 rounded-[10px] px-4 py-2 text-sm font-semibold"
            style={
              seleccionada
                ? { ['--btn-bg' as string]: 'var(--botones-principales)', ['--btn-texto' as string]: 'var(--blanco)', ['--btn-bg-hover' as string]: 'var(--botones-principales)', ['--btn-borde' as string]: '1px solid var(--botones-principales)' }
                : { ['--btn-bg' as string]: 'transparent', ['--btn-texto' as string]: 'var(--menu-texto-principal)', ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)', ['--btn-borde' as string]: '1px solid var(--mf-linea-fuerte)' }
            }
          >
            {p.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
