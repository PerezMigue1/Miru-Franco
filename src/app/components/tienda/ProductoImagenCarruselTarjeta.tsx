'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const INTERVAL_MS = 4500;

/** Hosts permitidos en next.config `images.remotePatterns`: se pueden optimizar (WebP/AVIF + tamaño correcto). */
const HOSTS_OPTIMIZABLES = new Set(['res.cloudinary.com', 'images.unsplash.com']);

function puedeOptimizar(src: string): boolean {
  try {
    return HOSTS_OPTIMIZABLES.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

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
  const [maxVisto, setMaxVisto] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaxVisto((m) => Math.max(m, i));
  }, [i]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      className="relative z-0 isolate h-full w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {safe.map((src, idx) => (
        // Solo se montan la imagen visible, la siguiente y las ya vistas (evita descargar toda la galería).
        idx > maxVisto + 1 ? null : (
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
            sizes="288px"
            unoptimized={!puedeOptimizar(src)}
            quality={70}
            loading="lazy"
          />
        </div>
        )
      ))}
      {n > 1 && (
        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 z-[5] flex justify-center gap-1"
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
