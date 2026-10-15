'use client';

import Image from 'next/image';
import { useState } from 'react';
import Badge from '../ui/Badge';
import { ServicioImagenPlaceholder } from '../servicios/ServicioImagen';
import { esImagenGenerada } from '../../utils/galeria';

/** Hosts permitidos en next.config `images.remotePatterns`: se pueden optimizar (WebP/AVIF + tamaño correcto). */
const HOSTS_OPTIMIZABLES = new Set(['res.cloudinary.com']);

function puedeOptimizar(src: string): boolean {
  try {
    return HOSTS_OPTIMIZABLES.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

/** Fotos que se pueden mostrar: sin vacías ni las que ya fallaron al cargar (sin ninguna, sale el placeholder). */
export function fotosQueCargan(urls: string[], fallidas: ReadonlySet<string>): string[] {
  return urls.filter((u) => Boolean(u) && !fallidas.has(u));
}

type Props = {
  urls: string[];
  alt: string;
  /** `object-cover` en tarjetas cuadradas (home); `object-contain` en catálogo alto fijo. */
  imageClassName?: string;
};

/**
 * Foto de la tarjeta del catálogo. Sin rotación automática (todas las tarjetas cambiando a la vez
 * distraía mientras se escanea el catálogo): con puntero fino, al pasar por encima se ve la segunda
 * foto; los puntos indican cuántas hay. La segunda foto solo se monta cuando se va a mostrar.
 */
export function ProductoImagenCarruselTarjeta({ urls, alt, imageClassName = 'object-contain' }: Props) {
  // Una foto que no carga se quita (como en ServicioImagen): nunca queda la imagen rota con su alt.
  const [fallidas, setFallidas] = useState<ReadonlySet<string>>(() => new Set());
  const marcarFallida = (src: string) => setFallidas((previas) => new Set(previas).add(src));
  const safe = fotosQueCargan(urls, fallidas);
  const n = safe.length;
  const [encima, setEncima] = useState(false);
  const [segundaVista, setSegundaVista] = useState(false);
  const i = encima && n > 1 ? 1 : 0;

  if (!n) {
    // Placeholder de marca en vez de "Sin imagen" en gris.
    return <ServicioImagenPlaceholder />;
  }

  const alEntrar = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || n < 2) return;
    setSegundaVista(true);
    setEncima(true);
  };

  return (
    <div
      className="relative z-0 isolate h-full w-full"
      onPointerEnter={alEntrar}
      onPointerLeave={() => setEncima(false)}
    >
      {safe.slice(0, segundaVista ? 2 : 1).map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          className={`absolute inset-0 transition-opacity duration-200 ease-[ease] motion-reduce:transition-none ${
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
            quality={75}
            loading="lazy"
            onError={() => marcarFallida(src)}
          />
        </div>
      ))}
      {n > 1 && (
        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 z-[5] flex justify-center gap-1"
          aria-hidden
        >
          {safe.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 w-1.5 rounded-full bg-blanco transition-opacity duration-150 motion-reduce:transition-none ${
                idx === i ? 'opacity-90' : 'opacity-45'
              }`}
            />
          ))}
        </div>
      )}
      {/* La misma insignia que en servicios, sobre la foto que se ve si es generada con IA o ilustrativa. */}
      {esImagenGenerada(safe[i]) && (
        <span className="pointer-events-none absolute left-2 top-2 z-[6]">
          <Badge size="sm">Imagen ilustrativa</Badge>
        </span>
      )}
    </div>
  );
}
