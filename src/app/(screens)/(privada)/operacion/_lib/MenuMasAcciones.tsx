'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { posicionMenu } from './panelOperacion';

function ocultar(menu: HTMLElement | null) {
  if (menu?.matches(':popover-open')) menu.hidePopover();
}

interface MenuMasAccionesProps {
  /** Nombre del botón para lector de pantalla; empieza con "Más", el texto visible. */
  etiqueta: string;
  /** Las acciones; reciben `cerrar` para soltar el menú antes de abrir un diálogo de la página. */
  acciones: (cerrar: () => void) => ReactNode;
}

/**
 * Botón "Más" con las acciones secundarias de una fila en un popover nativo: vive en la capa superior,
 * así que el marco con scroll de la tabla no lo recorta, y el tabulador entra a sus botones desde el botón
 * "Más". Es "manual" para que el menú decida cuándo cerrarse: Escape, el clic fuera, desplazar o cambiar el
 * tamaño de la ventana lo cierran, salvo que tenga abierto un diálogo propio (las acciones del anticipo abren
 * su confirmación aquí dentro). Con "auto", Escape lo cerraba con el diálogo guardando: el diálogo
 * desaparecía sin desmontarse y el body se quedaba sin scroll.
 */
export default function MenuMasAcciones({ etiqueta, acciones }: MenuMasAccionesProps) {
  const id = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  // Por id y no por ref: se llama desde los botones del menú, nunca durante el render.
  const cerrar = () => ocultar(document.getElementById(id));

  // Se coloca al hacer clic, antes de que el navegador lo abra (popovertarget): sin parpadeo en el centro.
  const colocar = (disparador: HTMLElement) => {
    const menu = menuRef.current;
    if (!menu) return;
    const raiz = document.documentElement;
    const p = posicionMenu(disparador.getBoundingClientRect(), { ancho: raiz.clientWidth, alto: raiz.clientHeight });
    menu.style.inset = 'auto';
    menu.style.right = `${p.right}px`;
    menu.style.top = p.top === undefined ? 'auto' : `${p.top}px`;
    menu.style.bottom = p.bottom === undefined ? 'auto' : `${p.bottom}px`;
    menu.style.maxHeight = `${p.maxHeight}px`;
  };

  useEffect(() => {
    if (!abierto) return;
    const menu = menuRef.current;
    const conDialogo = () => Boolean(menu?.querySelector('[role="dialog"]'));
    const alDesplazar = (e: Event) => {
      if (menu && e.target instanceof Node && menu.contains(e.target)) return;
      if (!conDialogo()) ocultar(menu);
    };
    const alRedimensionar = () => {
      if (!conDialogo()) ocultar(menu);
    };
    const alTeclear = (e: KeyboardEvent) => {
      // Con un diálogo abierto, Escape es del diálogo: el menú sigue abierto debajo.
      if (e.key !== 'Escape' || conDialogo()) return;
      const foco = document.activeElement;
      ocultar(menu);
      if (menu && foco instanceof Node && menu.contains(foco)) {
        (document.querySelector(`[popovertarget="${id}"]`) as HTMLElement | null)?.focus();
      }
    };
    const alTocarFuera = (e: PointerEvent) => {
      if (conDialogo()) return;
      if (!(e.target instanceof Element)) return;
      // El botón "Más" ya lo abre y lo cierra con popovertarget.
      if (menu?.contains(e.target) || e.target.closest(`[popovertarget="${id}"]`)) return;
      ocultar(menu);
    };
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alRedimensionar);
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('pointerdown', alTocarFuera);
    return () => {
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alRedimensionar);
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('pointerdown', alTocarFuera);
    };
  }, [abierto, id]);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="inline-flex items-center gap-1 !min-h-11"
        popoverTarget={id}
        aria-controls={id}
        aria-expanded={abierto}
        aria-label={etiqueta}
        onClick={(e) => colocar(e.currentTarget)}
      >
        <MoreHorizontal size={16} aria-hidden /> Más
      </Button>
      <div
        ref={menuRef}
        id={id}
        popover="manual"
        onToggle={(e) => setAbierto(e.newState === 'open')}
        className="m-0 min-w-48 overflow-y-auto whitespace-normal rounded-[12px] border-0 p-1.5"
        style={{ backgroundColor: 'var(--superficie-modal)', color: 'var(--texto-cuerpo)', boxShadow: 'var(--mf-sombra-2)' }}
      >
        {/* Solo los botones hijos directos (a 44 px): los del diálogo del anticipo (también aquí dentro) no se tocan. */}
        <div className="flex flex-col items-stretch gap-1.5 [&>button]:min-h-11 [&>button]:w-full [&>button]:justify-start [&>button]:text-left">
          {acciones(cerrar)}
        </div>
      </div>
    </>
  );
}
