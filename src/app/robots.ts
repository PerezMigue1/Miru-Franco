import type { MetadataRoute } from 'next';
import { SITE_URL } from './utils/seo';
import { RUTAS_CON_SESION } from './utils/rutasConSesion';

/**
 * /robots.txt — el catálogo (tienda, servicios) y las páginas informativas son públicas;
 * paneles internos, cuenta del cliente, flujos de compra/cita y utilidades de auth no.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/operacion',
        '/api/',
        '/auth/',
        '/oauth/',
        '/400',
        '/403',
        '/500',
        '/test-errores-http',
        '/forgot-password',
        '/reset-password',
        // Carritos de invitado y el alias /cliente/mi-perfil: públicos, pero no se indexan.
        '/cliente/carrito',
        '/cliente/mi-perfil',
        '/cliente/tienda-online/carrito',
        ...RUTAS_CON_SESION,
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
