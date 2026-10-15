'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Badge from '../ui/Badge';
import { esImagenGenerada, imagenServicioMostrable } from '../../utils/galeria';

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
  /** Pone "Imagen ilustrativa" sobre una imagen generada con IA (tarjeta y detalle del servicio). */
  marcarIlustrativa?: boolean;
}

/** Ruta local del sitio (/public), sin aceptar "//host" (que el navegador trataría como externa). */
const esRutaLocal = (src: string) => src.startsWith('/') && !src.startsWith('//');

/**
 * Foto del servicio (next/image con `fill`) que cae al placeholder de marca si falta o falla. Solo
 * muestra imágenes del salón: archivos locales o las que sube el equipo (Cloudinary).
 */
export default function ServicioImagen({ src, alt, sizes, fallback, marcarIlustrativa = false }: ServicioImagenProps) {
  const [srcFallida, setSrcFallida] = useState<string | null>(null);
  const url = typeof src === 'string' && esRutaLocal(src) ? src : imagenServicioMostrable(src);

  if (!url || srcFallida === url) {
    return <>{fallback ?? <ServicioImagenPlaceholder />}</>;
  }

  return (
    <>
      <Image
        src={url}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        onError={() => setSrcFallida(url)}
      />
      {marcarIlustrativa && esImagenGenerada(url) && (
        <span className="absolute bottom-3 left-3 z-[1]">
          <Badge size="sm">Imagen ilustrativa</Badge>
        </span>
      )}
    </>
  );
}
