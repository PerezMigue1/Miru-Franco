'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  urls: string[];
  nombreProducto: string;
};

/**
 * Galería con flechas para la ficha de producto.
 */
export function ProductoGaleriaDetalle({ urls, nombreProducto }: Props) {
  const safe = urls.filter(Boolean);
  const n = safe.length;
  const [i, setI] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setI(0);
  }, [safe.join('|')]);

  const prev = () => setI((j) => (j - 1 + n) % n);
  const next = () => setI((j) => (j + 1) % n);

  if (!n) {
    return (
      <span className="text-sm sm:text-base" style={{ color: 'var(--menu-texto-principal)' }}>
        Imagen del producto
      </span>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[12rem]">
      {safe.map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          className={`absolute inset-0 transition-opacity duration-300 ${idx === i ? 'z-[1] opacity-100' : 'z-0 opacity-0'}`}
          aria-hidden={idx !== i}
        >
          <Image
            src={src}
            alt={n > 1 ? `${nombreProducto} — imagen ${idx + 1} de ${n}` : nombreProducto}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={idx === 0}
            unoptimized
          />
        </div>
      ))}

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              prev();
            }}
            className="absolute left-1 top-1/2 z-[3] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-opacity hover:opacity-90 sm:left-2 sm:h-11 sm:w-11"
            style={{
              backgroundColor: 'var(--tarjetas-paneles)',
              color: 'var(--menu-texto-principal)',
              border: '2px solid var(--fondos-suaves)',
            }}
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              next();
            }}
            className="absolute right-1 top-1/2 z-[3] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-opacity hover:opacity-90 sm:right-2 sm:h-11 sm:w-11"
            style={{
              backgroundColor: 'var(--tarjetas-paneles)',
              color: 'var(--menu-texto-principal)',
              border: '2px solid var(--fondos-suaves)',
            }}
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
          </button>
          <div
            className="pointer-events-none absolute bottom-2 left-0 right-0 z-[2] flex justify-center"
            aria-hidden
          >
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'rgba(0,0,0,0.55)',
                color: 'var(--menu-texto-principal)',
              }}
            >
              {i + 1} / {n}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
