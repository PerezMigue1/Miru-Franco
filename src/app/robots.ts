import type { MetadataRoute } from 'next';
import { SITE_URL } from './utils/seo';

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
        '/perfil',
        '/api/',
        '/auth/',
        '/oauth/',
        '/400',
        '/403',
        '/500',
        '/test-errores-http',
        '/forgot-password',
        '/reset-password',
        '/cliente/carrito',
        '/cliente/cotizaciones',
        '/cliente/devoluciones',
        '/cliente/direcciones',
        '/cliente/facturas',
        '/cliente/garantias',
        '/cliente/mi-perfil',
        '/cliente/notificaciones',
        '/cliente/seguimientos',
        '/cliente/tarjetas',
        '/cliente/tienda-online/carrito',
        '/cliente/tienda-online/checkout',
        '/cliente/tienda-online/confirmacion',
        '/cliente/tienda-online/mis-pedidos',
        '/cliente/tienda-online/rastreo-pedidos',
        '/cliente/servicios-citas/calendario',
        '/cliente/servicios-citas/cancelar',
        '/cliente/servicios-citas/confirmacion',
        '/cliente/servicios-citas/crear-cita',
        '/cliente/servicios-citas/mis-citas',
        '/cliente/servicios-citas/reprogramar',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
