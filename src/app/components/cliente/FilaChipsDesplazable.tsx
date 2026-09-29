'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Fila horizontal de chips con señal de overflow: degradado + flecha en el borde que aún tiene
 * contenido, para que en móvil se note que la fila se puede deslizar (y se pueda avanzar con un toque).
 * Compartida por el catálogo de servicios y la tienda.
 */
export default function FilaChipsDesplazable({
  children,
  etiqueta = 'Filtrar por categoría',
}: {
  children: ReactNode;
  etiqueta?: string;
}) {
  const filaRef = useRef<HTMLDivElement>(null);
  const [masALaIzquierda, setMasALaIzquierda] = useState(false);
  const [masALaDerecha, setMasALaDerecha] = useState(false);

  useEffect(() => {
    const fila = filaRef.current;
    if (!fila) return;
    const actualizar = () => {
      setMasALaIzquierda(fila.scrollLeft > 4);
      setMasALaDerecha(fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 4);
    };
    // ResizeObserver notifica al observar, así que también cubre el cálculo inicial.
    const observer = new ResizeObserver(actualizar);
    observer.observe(fila);
    fila.addEventListener('scroll', actualizar, { passive: true });
    return () => {
      observer.disconnect();
      fila.removeEventListener('scroll', actualizar);
    };
  }, []);

  const desplazar = (sentido: 1 | -1) => {
    const fila = filaRef.current;
    fila?.scrollBy({ left: sentido * fila.clientWidth * 0.7, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={filaRef}
        role="group"
        aria-label={etiqueta}
        className="flex gap-2 overflow-x-auto scrollbar-hide"
      >
        {children}
      </div>
      {masALaIzquierda && (
        <button
          type="button"
          onClick={() => desplazar(-1)}
          aria-label="Ver categorías anteriores"
          className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-start"
          style={{ background: 'linear-gradient(to right, var(--fondo-general) 45%, transparent)' }}
        >
          <ChevronLeft size={20} aria-hidden style={{ color: 'var(--logo-branding)' }} />
        </button>
      )}
      {masALaDerecha && (
        <button
          type="button"
          onClick={() => desplazar(1)}
          aria-label="Ver más categorías"
          className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-end"
          style={{ background: 'linear-gradient(to left, var(--fondo-general) 45%, transparent)' }}
        >
          <ChevronRight size={20} aria-hidden style={{ color: 'var(--logo-branding)' }} />
        </button>
      )}
    </div>
  );
}
