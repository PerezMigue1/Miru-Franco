'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const INTERVAL_MS = 4500;

type Props = {
  urls: string[];
  alt: string;
  /** `object-cover` en tarjetas cuadradas (home); `object-contain` en catálogo alto fijo. */
  imageClassName?: string;
};

/**
 * Carrusel automático para tarjetas del catálogo (pausa al pasar el ratón).
 */
export function ProductoImagenCarruselTarjeta({ urls, alt, imageClassName = 'object-contain' }: Props) {
  const safe = urls.filter(Boolean);
  const n = safe.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setI(0);
  }, [safe.join('|')]);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setI((j) => (j + 1) % n), INTERVAL_MS);
    return () => clearInterval(t);
  }, [n, paused, safe.join('|')]);

  if (!n) {
    return (
      <span className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
        Sin imagen
      </span>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {safe.map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            idx === i ? 'z-[1] opacity-100' : 'z-0 opacity-0'
          }`}
          aria-hidden={idx !== i}
        >
          <Image
            src={src}
            alt={n > 1 ? `${alt} (${idx + 1} de ${n})` : alt}
            fill
            className={imageClassName}
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        </div>
      ))}
      {n > 1 && (
        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 z-[2] flex justify-center gap-1"
          aria-hidden
        >
          {safe.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-4 bg-white/90' : 'w-1.5 bg-white/45'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
