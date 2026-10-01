'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';

/**
 * Placeholder de marca para servicios sin foto o cuya foto no carga. Ocupa todo el contenedor
 * (que debe ser `relative`). El monograma se sirve sin optimizar: si falla /_next/image —la
 * causa típica de una tarjeta gris vacía— el placeholder sigue viéndose.
 */
export function ServicioImagenPlaceholder() {
  return (
    <div
      role="img"
      aria-label="Mirú Franco Beauty Salón — imagen no disponible"
      className="@container absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
      style={{ backgroundColor: 'var(--header-footer)' }}
    >
      <div className="relative h-[45%] max-h-28 min-h-14 aspect-[881/1024]">
        <Image
          src="/images/logo-nf.png"
          alt=""
          fill
          unoptimized
          className="object-contain"
          style={{ mixBlendMode: 'lighten' }}
        />
      </div>
      <span
        className="hidden @min-[10rem]:block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em]"
        style={{ color: 'var(--oro-sobre-carbon)' }}
      >
        Mirú Franco
      </span>
    </div>
  );
}

interface ServicioImagenProps {
  src?: string | null;
  alt: string;
  sizes: string;
  /** Qué mostrar si no hay imagen o no carga (por defecto, el placeholder de marca). */
  fallback?: ReactNode;
}

/** Foto del servicio (next/image con `fill`) que cae al placeholder de marca si falta o falla. */
export default function ServicioImagen({ src, alt, sizes, fallback }: ServicioImagenProps) {
  const [srcFallida, setSrcFallida] = useState<string | null>(null);
  const esValida = typeof src === 'string' && (src.startsWith('http') || src.startsWith('/'));

  if (!esValida || srcFallida === src) {
    return <>{fallback ?? <ServicioImagenPlaceholder />}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes={sizes}
      onError={() => setSrcFallida(src)}
    />
  );
}
