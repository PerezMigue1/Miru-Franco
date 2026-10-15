import { describe, expect, it } from 'vitest';
import { RUTAS_PORTAL, esSeccionActiva, getBreadcrumbsForPath, getMigasPortal, seccionPortal } from './breadcrumbs';

const cadena = (pathname: string, actual?: string) => getMigasPortal(pathname, actual)?.items.map((i) => i.label).join(' > ');

describe('Migas del portal: ubicación real, no carpetas de la URL', () => {
  it('las pantallas globales del usuario cuelgan de Inicio y llevan "Volver"', () => {
    for (const [ruta, etiqueta] of [
      ['/cliente/tienda-online/carrito', 'Carrito'],
      ['/perfil', 'Mi perfil'],
      ['/cliente/servicios-citas/mis-citas', 'Mis citas'],
      ['/cliente/tienda-online/mis-pedidos', 'Mis pedidos'],
      ['/cliente/cotizaciones', 'Mis cotizaciones'],
      ['/cliente/notificaciones', 'Notificaciones'],
      ['/cliente/garantias', 'Garantías y soporte'],
      ['/cliente/seguimientos', 'Seguimientos'],
      ['/cliente/promociones', 'Promociones'],
    ]) {
      expect(cadena(ruta)).toBe(`Inicio > ${etiqueta}`);
      expect(getMigasPortal(ruta)?.global).toBe(true);
    }
  });

  it('las que dependen de otra muestran a su padre, con el nombre real si lo hay', () => {
    expect(cadena('/cliente/tienda-online/productos/33', 'Fluido Di Goji')).toBe('Inicio > Tienda > Fluido Di Goji');
    expect(cadena('/cliente/tienda-online/mis-pedidos/12')).toBe('Inicio > Mis pedidos > Detalle de pedido');
    expect(cadena('/cliente/servicios-citas/reprogramar/4022')).toBe('Inicio > Mis citas > Reprogramar cita');
    expect(getMigasPortal('/cliente/tienda-online/productos/33')?.global).toBe(false);
  });

  it('Inicio y los padres enlazan; la miga actual no', () => {
    const items = getMigasPortal('/cliente/tienda-online/checkout')!.items;
    expect(items.map((i) => i.href)).toEqual(['/home', '/cliente/tienda-online/carrito', undefined]);
  });

  it('todo padre del mapa existe en el mapa', () => {
    for (const ruta of Object.values(RUTAS_PORTAL)) if (ruta.padre) expect(RUTAS_PORTAL[ruta.padre]).toBeDefined();
  });

  it('las rutas fuera del portal siguen con sus reglas (admin)', () => {
    expect(getMigasPortal('/admin/inventario')).toBeNull();
    expect(getBreadcrumbsForPath('/admin/inventario').map((i) => i.label)).toEqual(['Inicio', 'Panel de administración', 'Inventario']);
  });

  it('operación: devoluciones lleva su nombre legible', () => {
    expect(getBreadcrumbsForPath('/operacion/devoluciones').map((i) => i.label)).toEqual(['Inicio', 'Panel de operación', 'Devoluciones y cambios']);
  });
});

describe('Pestaña activa de la cabecera con el mismo mapa', () => {
  it('las pantallas globales y las que dependen de ellas no marcan sección', () => {
    for (const ruta of [
      '/cliente/tienda-online/carrito',
      '/cliente/tienda-online/checkout',
      '/cliente/tienda-online/mis-pedidos/12',
      '/cliente/servicios-citas/mis-citas',
      '/cliente/servicios-citas/reprogramar/4022',
      '/perfil',
      '/cliente/cotizaciones',
    ]) {
      expect(seccionPortal(ruta)).toBeNull();
      expect(esSeccionActiva(ruta, '/cliente/tienda-online')).toBe(false);
      expect(esSeccionActiva(ruta, '/cliente/servicios-citas')).toBe(false);
    }
  });

  it('las pantallas de una sección la marcan', () => {
    expect(esSeccionActiva('/cliente/tienda-online', '/cliente/tienda-online')).toBe(true);
    expect(esSeccionActiva('/cliente/tienda-online/productos/33', '/cliente/tienda-online')).toBe(true);
    expect(esSeccionActiva('/cliente/servicios-citas/crear-cita', '/cliente/servicios-citas')).toBe(true);
    expect(esSeccionActiva('/cliente/servicios-citas/crear-cita', '/cliente/tienda-online')).toBe(false);
  });

  it('fuera del portal sigue por prefijo', () => {
    expect(seccionPortal('/home')).toBeUndefined();
    expect(esSeccionActiva('/home', '/home')).toBe(true);
    expect(esSeccionActiva('/contacto', '/home')).toBe(false);
  });
});

describe('Migas del panel admin: subpantallas con su nombre real', () => {
  const migas = (ruta: string) => getBreadcrumbsForPath(ruta).map((i) => i.label);

  it('segmentación de clientes no se presenta como perfil de cliente', () => {
    expect(migas('/admin/clientes-crm/segmentacion')).toEqual(['Inicio', 'Panel de administración', 'Clientes (CRM)', 'Segmentación de clientes']);
    expect(migas('/admin/clientes-crm/abc-123')).toEqual(['Inicio', 'Panel de administración', 'Clientes (CRM)', 'Perfil de cliente']);
  });

  it('nuevo servicio no se presenta como detalle de servicio', () => {
    expect(migas('/admin/servicios/nuevo')).toEqual(['Inicio', 'Panel de administración', 'Servicios', 'Nuevo servicio']);
    expect(migas('/admin/servicios/12')).toEqual(['Inicio', 'Panel de administración', 'Servicios', 'Detalle de servicio']);
  });

  it('las pantallas de privacidad llevan su nombre', () => {
    expect(migas('/admin/consentimientos')).toEqual(['Inicio', 'Panel de administración', 'Consentimientos']);
    expect(migas('/admin/solicitudes-arco')).toEqual(['Inicio', 'Panel de administración', 'Solicitudes ARCO']);
  });

  it('paquetes y su detalle no terminan en "Panel de administración"', () => {
    expect(migas('/admin/paquetes')).toEqual(['Inicio', 'Panel de administración', 'Paquetes especiales']);
    expect(migas('/admin/paquetes/7')).toEqual(['Inicio', 'Panel de administración', 'Paquetes especiales', 'Detalle de paquete']);
    expect(getBreadcrumbsForPath('/admin/paquetes/7')[2].href).toBe('/admin/paquetes');
  });

  it('editar clienta e historial de ventas terminan en la página actual', () => {
    expect(migas('/admin/clientes-crm/c-1/editar')).toEqual([
      'Inicio',
      'Panel de administración',
      'Clientes (CRM)',
      'Perfil de cliente',
      'Editar cliente',
    ]);
    expect(getBreadcrumbsForPath('/admin/clientes-crm/c-1/editar')[3].href).toBe('/admin/clientes-crm/c-1');
    expect(migas('/admin/inventario/historial-ventas')).toEqual(['Inicio', 'Panel de administración', 'Inventario', 'Historial de ventas']);
  });

  it('nuevo y editar usuario muestran la página actual después de "Usuarios y roles"', () => {
    expect(migas('/admin/usuarios-roles/nuevo')).toEqual(['Inicio', 'Panel de administración', 'Usuarios y roles', 'Nuevo usuario']);
    expect(migas('/admin/usuarios-roles/0b9f-uuid')).toEqual(['Inicio', 'Panel de administración', 'Usuarios y roles', 'Editar usuario']);
  });

  it('la miga actual no enlaza: solo las anteriores llevan href', () => {
    const items = getBreadcrumbsForPath('/admin/usuarios-roles/nuevo');
    expect(items.at(-1)?.href).toBeUndefined();
    expect(items.slice(0, -1).every((i) => i.href)).toBe(true);
  });
});
