import type { BreadcrumbItem } from '../components/ui/Breadcrumb';

/** Una pantalla del portal: su etiqueta, la pantalla de la que depende (si depende de otra) y si es global del usuario. */
interface RutaPortal {
  etiqueta: string;
  padre?: string;
  /** Pantalla propia del usuario a la que se llega desde cualquier parte: lleva el botón "Volver". */
  global?: boolean;
}

/**
 * Ubicación real de cada pantalla del portal de clientas: la cadena de migas sale de aquí, no de las
 * carpetas de la URL (el carrito vive en /cliente/tienda-online/carrito, pero no depende de la tienda).
 * Los segmentos dinámicos se escriben como `[id]`.
 */
export const RUTAS_PORTAL: Record<string, RutaPortal> = {
  // Secciones del sitio
  '/cliente/tienda-online': { etiqueta: 'Tienda' },
  '/cliente/servicios-citas': { etiqueta: 'Servicios y citas' },
  '/cliente/galeria': { etiqueta: 'Galería' },
  '/cliente/promociones': { etiqueta: 'Promociones' },

  // Pantallas globales del usuario
  '/cliente/tienda-online/carrito': { etiqueta: 'Carrito', global: true },
  '/cliente/carrito': { etiqueta: 'Carrito', global: true },
  '/perfil': { etiqueta: 'Mi perfil', global: true },
  '/cliente/mi-perfil': { etiqueta: 'Mi perfil', global: true },
  '/cliente/servicios-citas/mis-citas': { etiqueta: 'Mis citas', global: true },
  '/cliente/tienda-online/mis-pedidos': { etiqueta: 'Mis pedidos', global: true },
  '/cliente/cotizaciones': { etiqueta: 'Mis cotizaciones', global: true },
  '/cliente/notificaciones': { etiqueta: 'Notificaciones', global: true },
  '/cliente/devoluciones': { etiqueta: 'Devoluciones', global: true },
  '/cliente/facturas': { etiqueta: 'Facturas', global: true },
  '/cliente/garantias': { etiqueta: 'Garantías', global: true },
  '/cliente/seguimientos': { etiqueta: 'Seguimientos', global: true },

  // Pantallas que dependen de otra
  '/cliente/tienda-online/productos/[id]': { etiqueta: 'Producto', padre: '/cliente/tienda-online' },
  '/cliente/tienda-online/checkout': { etiqueta: 'Checkout', padre: '/cliente/tienda-online/carrito' },
  '/cliente/tienda-online/confirmacion': { etiqueta: 'Confirmación de compra', padre: '/cliente/tienda-online' },
  '/cliente/tienda-online/mis-pedidos/[id]': { etiqueta: 'Detalle de pedido', padre: '/cliente/tienda-online/mis-pedidos' },
  '/cliente/servicios-citas/servicios/[id]': { etiqueta: 'Servicio', padre: '/cliente/servicios-citas' },
  '/cliente/servicios-citas/crear-cita': { etiqueta: 'Crear cita', padre: '/cliente/servicios-citas' },
  '/cliente/servicios-citas/calendario': { etiqueta: 'Calendario', padre: '/cliente/servicios-citas' },
  '/cliente/servicios-citas/confirmacion': { etiqueta: 'Confirmación', padre: '/cliente/servicios-citas' },
  '/cliente/servicios-citas/mis-citas/[id]': { etiqueta: 'Detalle de cita', padre: '/cliente/servicios-citas/mis-citas' },
  '/cliente/servicios-citas/reprogramar/[id]': { etiqueta: 'Reprogramar cita', padre: '/cliente/servicios-citas/mis-citas' },
  '/cliente/servicios-citas/cancelar/[id]': { etiqueta: 'Cancelar cita', padre: '/cliente/servicios-citas/mis-citas' },
};

function patronPortal(pathname: string): string | null {
  if (RUTAS_PORTAL[pathname]) return pathname;
  const segmentos = pathname.split('/');
  return (
    Object.keys(RUTAS_PORTAL).find((patron) => {
      const partes = patron.split('/');
      return partes.length === segmentos.length && partes.every((p, i) => p.startsWith('[') || p === segmentos[i]);
    }) ?? null
  );
}

/**
 * Migas de una pantalla del portal: Inicio, las pantallas de las que depende y la actual. `actual`
 * sustituye la etiqueta de la pantalla actual (p. ej. el nombre del producto). null si no es del portal.
 */
export function getMigasPortal(pathname: string, actual?: string): { items: BreadcrumbItem[]; global: boolean } | null {
  const patron = patronPortal(pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname);
  if (!patron) return null;
  const ruta = RUTAS_PORTAL[patron];
  const padres: BreadcrumbItem[] = [];
  for (let p = ruta.padre; p; p = RUTAS_PORTAL[p]?.padre) padres.unshift({ label: RUTAS_PORTAL[p].etiqueta, href: p });
  return { items: [{ label: 'Inicio', href: '/home' }, ...padres, { label: actual || ruta.etiqueta }], global: Boolean(ruta.global) };
}

/**
 * Sección del sitio (raíz de la cadena de RUTAS_PORTAL) a la que pertenece una pantalla del portal.
 * null si la pantalla es global o depende de una global (carrito, checkout, perfil, mis citas…):
 * no pertenece a ninguna sección. undefined si la ruta no es del portal.
 */
export function seccionPortal(pathname: string): string | null | undefined {
  const patron = patronPortal(pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname);
  if (!patron) return undefined;
  let actual = patron;
  for (;;) {
    const ruta = RUTAS_PORTAL[actual];
    if (ruta.global) return null;
    if (!ruta.padre) return actual;
    actual = ruta.padre;
  }
}

/**
 * ¿La pestaña de la cabecera que lleva a `destino` va marcada en `pathname`? En el portal manda el
 * mismo mapa de las migas; fuera de él, el prefijo de la ruta.
 */
export function esSeccionActiva(pathname: string, destino: string): boolean {
  const seccion = seccionPortal(pathname);
  if (seccion !== undefined) return seccion === destino;
  return pathname === destino || pathname.startsWith(`${destino}/`);
}

/**
 * Genera la migaja de pan jerárquica completa desde "Inicio" para cualquier pathname.
 * Así, aunque se abra un enlace directo a una pantalla interna, siempre se muestra el camino completo.
 */
export function getBreadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [{ label: 'Inicio', href: '/' }];
  if (!pathname || pathname === '/') return base;

  const portal = getMigasPortal(pathname);
  if (portal) return portal.items;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return base;

  const first = segments[0];

  // Páginas públicas
  if (first === 'login') return [...base, { label: 'Iniciar sesión' }];
  if (first === 'register') return [...base, { label: 'Registro' }];
  if (first === 'forgot-password') return [...base, { label: 'Recuperar contraseña' }];
  if (first === 'reset-password') return [...base, { label: 'Restablecer contraseña' }];
  if (first === 'terminos-y-condiciones') return [...base, { label: 'Términos y Condiciones' }];
  if (first === '403') return [...base, { label: 'Acceso denegado' }];
  if (first === '400') return [...base, { label: 'Solicitud incorrecta' }];
  if (first === '500') return [...base, { label: 'Error del servidor' }];
  if (first === 'auth') return [...base, { label: 'Autenticación' }, ...(segments[1] ? [{ label: 'Callback' }] : [])];
  if (first === 'test-errores-http') return [...base, { label: 'Pruebas de errores' }];

  if (first === 'home') return [...base, { label: 'Inicio web', href: '/home' }];

  // Panel de administración
  if (first === 'admin') {
    const admin: BreadcrumbItem[] = [...base, { label: 'Panel de administración', href: '/admin' }];
    if (segments.length === 1) return admin;

    const section = segments[1];
    const sectionLabels: Record<string, { label: string; href: string }> = {
      inventario: { label: 'Inventario', href: '/admin/inventario' },
      productos: { label: 'Productos', href: '/admin/inventario' },
      servicios: { label: 'Servicios', href: '/admin/servicios' },
      'clientes-crm': { label: 'Clientes (CRM)', href: '/admin/clientes-crm' },
      proveedores: { label: 'Proveedores', href: '/admin/proveedores' },
      'usuarios-roles': { label: 'Usuarios y roles', href: '/admin/usuarios-roles' },
      'venta-local': { label: 'Venta local', href: '/admin/venta-local' },
      'venta-online': { label: 'Venta online', href: '/admin/venta-online' },
      facturacion: { label: 'Facturación', href: '/admin/facturacion' },
      pagos: { label: 'Pagos', href: '/admin/pagos' },
      reportes: { label: 'Reportes', href: '/admin/reportes' },
      marketing: { label: 'Marketing', href: '/admin/marketing' },
      notificaciones: { label: 'Notificaciones', href: '/admin/notificaciones' },
      'gestion-personal': { label: 'Gestión de personal', href: '/admin/gestion-personal' },
      'compras-proveedores': { label: 'Compras a proveedores', href: '/admin/compras-proveedores' },
      'control-caducidad': { label: 'Control de caducidad', href: '/admin/control-caducidad' },
      'cotizaciones-eventos': { label: 'Cotizaciones y eventos', href: '/admin/cotizaciones-eventos' },
      'devoluciones-cambios': { label: 'Devoluciones y cambios', href: '/admin/devoluciones-cambios' },
      'pedidos-por-recoger': { label: 'Pedidos por recoger', href: '/admin/pedidos-por-recoger' },
      'quejas-garantias': { label: 'Quejas y garantías', href: '/admin/quejas-garantias' },
      'base-datos': { label: 'Base de datos', href: '/admin/base-datos' },
    };

    const sectionInfo = sectionLabels[section];
    if (sectionInfo) {
      admin.push({ label: sectionInfo.label, href: sectionInfo.href });
      const third = segments[2];
      if (third) {
        if (section === 'productos' && third === 'nuevo') admin.push({ label: 'Nuevo producto' });
        else if (section === 'productos' && third !== 'nuevo') admin.push({ label: 'Detalle de producto' });
        else if (section === 'inventario' && third === 'prediccion') admin.push({ label: 'Predicción de inventario' });
        else if (section === 'inventario' && third === 'inteligente') admin.push({ label: 'Predicción de inventario' });
        else if (section === 'inventario' && third === 'ventas-analisis') admin.push({ label: 'Análisis de ventas (tienda)' });
        else if (section === 'inventario' && third === 'producto' && segments[3] && segments[4] === 'analisis') {
          admin.push({ label: 'Análisis de ventas por producto' });
        } else if (section === 'servicios') admin.push({ label: 'Detalle de servicio' });
        else if (section === 'clientes-crm') admin.push({ label: 'Perfil de cliente' });
      }
    }
    return admin;
  }

  // Panel de operación (staff): Inicio / Panel de operación / [Módulo]
  if (first === 'operacion') {
    const operacion: BreadcrumbItem[] = [...base, { label: 'Panel de operación', href: '/operacion' }];
    if (segments.length === 1) return operacion;
    const modulos: Record<string, string> = {
      'agenda-calendario': 'Agenda y calendario',
      'clientes-crm': 'Perfil de cliente',
      'cobro-sin-cita': 'Cobro sin cita',
      'cola-atencion': 'Cola de atención',
      'ejecucion-servicios': 'Ejecución de servicios',
      'gestion-citas': 'Gestión de citas',
      'gestion-equipo': 'Gestión de equipo',
      'mi-asistencia': 'Mi asistencia',
      'mis-solicitudes': 'Mis solicitudes',
      'pedidos-online': 'Pedidos online',
      'pedidos-por-recoger': 'Pedidos por recoger',
      'punto-de-venta': 'Punto de venta',
      'segmentacion-clientes': 'Segmentación de clientes',
      'seguimiento-post-servicio': 'Seguimiento posterior al servicio',
      'subir-imagenes': 'Subir imágenes',
    };
    operacion.push({ label: modulos[segments[1]] ?? segments[1] });
    return operacion;
  }

  return [...base, { label: segments[segments.length - 1] || pathname }];
}
