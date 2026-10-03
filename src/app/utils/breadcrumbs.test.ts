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
