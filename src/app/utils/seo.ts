import type { Metadata } from 'next';

/**
 * Base para metadata SEO (canonical, og:url, sitemap, robots).
 * `NEXT_PUBLIC_SITE_URL` permite apuntar previews/staging a su propio dominio; en producción
 * el dominio público es www.mirufranco.com, así que ese es el valor por defecto.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.mirufranco.com').replace(/\/+$/, '');

export const SITE_NAME = 'Mirú Franco Beauty Salón';

/** Imagen por defecto para og:image / twitter:image (servida desde /public). */
export const OG_IMAGE_DEFAULT = {
  url: '/logo-miru.jpg',
  alt: 'Mirú Franco Beauty Salón',
};

/**
 * Metadata de una ruta pública: title, description, canonical y Open Graph coherentes.
 * `openGraph` se repite completo porque Next reemplaza (no fusiona) ese objeto del layout padre.
 */
export function metadataPublica({
  title,
  description,
  path,
  image,
  absoluteTitle = false,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt?: string };
  /** true = no agregar el sufijo " | Mirú Franco Beauty Salón" (home). */
  absoluteTitle?: boolean;
  noIndex?: boolean;
}): Metadata {
  const images = [image ?? OG_IMAGE_DEFAULT];
  return {
    // `absolute` y no la plantilla del layout raíz: un layout intermedio con título propio
    // (tienda-online, servicios-citas) corta la herencia de la plantilla hacia sus subrutas.
    title: { absolute: absoluteTitle ? title : `${title} | ${SITE_NAME}` },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'es_MX',
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Recorta un texto largo (descripción de producto/servicio) al tamaño útil de una meta description. */
export function recortarDescripcion(texto: string | undefined | null, max = 155): string | undefined {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!limpio) return undefined;
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio;
}
