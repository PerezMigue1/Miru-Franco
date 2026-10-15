import type { MetadataRoute } from 'next';
import { getProductosSinRedirigir } from './services/productos';
import { getServicios } from './services/servicios';
import { SITE_URL } from './utils/seo';
import { DOCUMENTOS_LEGALES } from './utils/documentosLegales';

/** Se regenera cada hora; si el backend no responde, se publican solo las rutas fijas. */
export const revalidate = 3600;

const RUTAS_FIJAS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/home', changeFrequency: 'weekly', priority: 1 },
  { path: '/cliente/servicios-citas', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/cliente/tienda-online', changeFrequency: 'daily', priority: 0.9 },
  { path: '/sobre-nosotros', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contacto', changeFrequency: 'monthly', priority: 0.6 },
  // Páginas legales del registro (sin anclas: anticipos vive dentro de la política de reembolsos).
  ...[...new Set(DOCUMENTOS_LEGALES.map((d) => d.ruta.split('#')[0]))].map((path) => ({
    path,
    changeFrequency: 'yearly' as const,
    priority: 0.2,
  })),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();
  const fijas: MetadataRoute.Sitemap = RUTAS_FIJAS.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: ahora,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const [{ data: productos }, { data: servicios }] = await Promise.all([
    getProductosSinRedirigir(),
    getServicios(),
  ]);

  const deProductos: MetadataRoute.Sitemap = productos.map((p) => ({
    url: `${SITE_URL}/cliente/tienda-online/productos/${encodeURIComponent(String(p.id))}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
  const deServicios: MetadataRoute.Sitemap = servicios.map((s) => ({
    url: `${SITE_URL}/cliente/servicios-citas/servicios/${encodeURIComponent(String(s.id))}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...fijas, ...deServicios, ...deProductos];
}
