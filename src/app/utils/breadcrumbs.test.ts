import { describe, expect, it } from 'vitest';
import { RUTAS_PORTAL, getBreadcrumbsForPath, getMigasPortal } from './breadcrumbs';

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
    expect(cadena('/cliente/tienda-online/checkout/elegir-domicilio')).toBe('Inicio > Carrito > Checkout > Elegir domicilio');
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
