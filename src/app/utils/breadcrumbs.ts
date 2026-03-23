import type { BreadcrumbItem } from '../components/ui/Breadcrumb';

/**
 * Genera la migaja de pan jerárquica completa desde "Inicio" para cualquier pathname.
 * Así, aunque se abra un enlace directo a una pantalla interna, siempre se muestra el camino completo.
 */
export function getBreadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [{ label: 'Inicio', href: '/' }];
  if (!pathname || pathname === '/') return base;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return base;

  const first = segments[0];

  // Páginas públicas
  if (first === 'login') return [...base, { label: 'Iniciar sesión' }];
  if (first === 'register') return [...base, { label: 'Registro' }];
  if (first === 'forgot-password') return [...base, { label: 'Recuperar contraseña' }];
  if (first === 'reset-password') return [...base, { label: 'Restablecer contraseña' }];
  if (first === 'terminos') return [...base, { label: 'Términos y condiciones' }];
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
      'gestion-citas': { label: 'Gestión de citas', href: '/admin/gestion-citas' },
      'agenda-calendario': { label: 'Agenda', href: '/admin/agenda-calendario' },
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
      'entregas-envios': { label: 'Entregas y envíos', href: '/admin/entregas-envios' },
      'ejecucion-servicios': { label: 'Ejecución de servicios', href: '/admin/ejecucion-servicios' },
      'atencion-sin-cita': { label: 'Atención sin cita', href: '/admin/atencion-sin-cita' },
      'seguimiento-post-servicio': { label: 'Seguimiento post servicio', href: '/admin/seguimiento-post-servicio' },
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
        else if (section === 'servicios') admin.push({ label: 'Detalle de servicio' });
        else if (section === 'clientes-crm') admin.push({ label: 'Perfil de cliente' });
      }
    }
    return admin;
  }

  // Navegación por secciones reales del sitio (sin niveles inventados)
  // Rutas /cliente/* → Inicio / [Sección] / [Subsección]
  if (first === 'cliente') {
    if (segments.length === 1) return [...base, { label: 'Área de cliente' }];

    const section = segments[1];

    const sectionLabels: Record<string, { label: string; href: string }> = {
      'tienda-online': { label: 'Tienda online', href: '/cliente/tienda-online' },
      galeria: { label: 'Galería', href: '/cliente/galeria' },
      'mi-perfil': { label: 'Mi perfil', href: '/perfil' },
      direcciones: { label: 'Mis direcciones', href: '/cliente/direcciones' },
      carrito: { label: 'Carrito', href: '/cliente/carrito' },
      cotizaciones: { label: 'Cotizaciones', href: '/cliente/cotizaciones' },
      devoluciones: { label: 'Devoluciones', href: '/cliente/devoluciones' },
      facturas: { label: 'Facturas', href: '/cliente/facturas' },
      notificaciones: { label: 'Notificaciones', href: '/cliente/notificaciones' },
      garantias: { label: 'Garantías', href: '/cliente/garantias' },
      promociones: { label: 'Promociones', href: '/cliente/promociones' },
      seguimientos: { label: 'Seguimientos', href: '/cliente/seguimientos' },
      'servicios-citas': { label: 'Servicios y citas', href: '/cliente/servicios-citas' },
      'rastreo-pedidos': { label: 'Rastreo de pedidos', href: '/cliente/tienda-online/rastreo-pedidos' },
      'mis-pedidos': { label: 'Mis pedidos', href: '/cliente/tienda-online/mis-pedidos' },
    };

    const sectionInfo = sectionLabels[section];
    if (!sectionInfo) return [...base];

    // Direcciones: Inicio → Mi perfil (/perfil) → Mis direcciones
    if (section === 'direcciones') {
      return [...base, { label: 'Mi perfil', href: '/perfil' }, { label: 'Mis direcciones' }];
    }

    // Nivel 2 = sección real del sitio (Tienda online, Galería, Servicios y citas, etc.)
    const items: BreadcrumbItem[] = [...base, { label: sectionInfo.label, href: sectionInfo.href }];

    if (section === 'tienda-online') {
      const third = segments[2];
      if (!third) return items; // Inicio / Tienda online
      if (third === 'productos') {
        items.push({ label: 'Productos', href: '/cliente/tienda-online' });
        if (segments[3]) items.push({ label: 'Detalle de producto' });
      } else if (third === 'carrito') items.push({ label: 'Carrito' });
      else if (third === 'checkout') items.push({ label: 'Checkout' });
      else if (third === 'confirmacion') items.push({ label: 'Confirmación' });
      else if (third === 'mis-pedidos') {
        items.push({ label: 'Mis pedidos', href: '/cliente/tienda-online/mis-pedidos' });
        if (segments[3]) items.push({ label: 'Detalle de pedido' });
      } else if (third === 'rastreo-pedidos') items.push({ label: 'Rastreo de pedidos' });
      return items;
    }

    if (section === 'servicios-citas') {
      const third = segments[2];
      if (!third) return items; // Inicio / Servicios y citas
      if (third === 'crear-cita') items.push({ label: 'Crear cita' });
      else if (third === 'calendario') items.push({ label: 'Calendario' });
      else if (third === 'confirmacion') items.push({ label: 'Confirmación' });
      else if (third === 'mis-citas') {
        items.push({ label: 'Mis citas', href: '/cliente/servicios-citas/mis-citas' });
        if (segments[3]) items.push({ label: 'Detalle de cita' });
      } else if (third === 'servicios') {
        items.push({ label: 'Servicios' });
        if (segments[3]) items.push({ label: 'Detalle' });
      } else if (third === 'reprogramar' && segments[3]) items.push({ label: 'Reprogramar' });
      else if (third === 'cancelar' && segments[3]) items.push({ label: 'Cancelar cita' });
      return items;
    }

    return items;
  }

  // Perfil (pantalla única de cuenta)
  if (first === 'perfil') {
    const perfil: BreadcrumbItem[] = [...base, { label: 'Mi perfil', href: '/perfil' }];
    if (segments[1]) {
      const rolLabels: Record<string, string> = {
        administrador: 'Administrador',
        becario: 'Becario',
        cliente: 'Cliente',
        empleado: 'Empleado',
        estilista: 'Estilista',
      };
      perfil.push({ label: rolLabels[segments[1]] ?? segments[1] });
    }
    return perfil;
  }

  // Subir imágenes
  if (first === 'subir-imagenes') return [...base, { label: 'Subir imágenes' }];

  return [...base, { label: segments[segments.length - 1] || pathname }];
}
