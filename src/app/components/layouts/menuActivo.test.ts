import { describe, expect, it } from 'vitest';
import { scrollTopParaVer } from './menuActivo';

/**
 * A 1440x900 el ítem activo de la parte baja del menú (Notificaciones, Reportes, Usuarios, Base de
 * datos…) quedaba fuera de la zona visible. El menú se desplaza hasta él con la regla de
 * scrollIntoView({ block: 'nearest' }), pero sin mover la página.
 */
describe('scrollTopParaVer (block: nearest)', () => {
  const menu = { scrollTop: 0, alto: 500 };

  it('si el ítem ya se ve completo, el menú no se mueve', () => {
    expect(scrollTopParaVer({ ...menu, inicio: 100, fin: 140 })).toBe(0);
    expect(scrollTopParaVer({ scrollTop: 200, alto: 500, inicio: 300, fin: 340 })).toBe(200);
  });

  it('si queda debajo, lo alinea con el borde de abajo (más el margen)', () => {
    expect(scrollTopParaVer({ ...menu, inicio: 760, fin: 800 })).toBe(300);
    expect(scrollTopParaVer({ ...menu, inicio: 760, fin: 800, margen: 12 })).toBe(312);
  });

  it('si queda arriba, lo alinea con el borde de arriba (menos el margen, nunca negativo)', () => {
    expect(scrollTopParaVer({ scrollTop: 400, alto: 500, inicio: 120, fin: 160 })).toBe(120);
    expect(scrollTopParaVer({ scrollTop: 400, alto: 500, inicio: 120, fin: 160, margen: 12 })).toBe(108);
    expect(scrollTopParaVer({ scrollTop: 400, alto: 500, inicio: 4, fin: 44, margen: 12 })).toBe(0);
  });

  it('un ítem más alto que el menú se alinea arriba', () => {
    expect(scrollTopParaVer({ ...menu, inicio: 600, fin: 1200 })).toBe(600);
  });
});

describe('H10: ítem activo del menú admin en las pantallas hijas', () => {
  it('pagos marca Venta online; caducidad y productos marcan Inventario; compras marca Proveedores', async () => {
    const { esItemActivoAdmin } = await import('./menuActivo');
    expect(esItemActivoAdmin('/admin/pagos', '/admin/venta-online')).toBe(true);
    expect(esItemActivoAdmin('/admin/control-caducidad', '/admin/inventario')).toBe(true);
    expect(esItemActivoAdmin('/admin/productos/12', '/admin/inventario')).toBe(true);
    expect(esItemActivoAdmin('/admin/productos/nuevo', '/admin/inventario')).toBe(true);
    expect(esItemActivoAdmin('/admin/compras-proveedores', '/admin/proveedores')).toBe(true);
    // Sin falsos positivos: cada ruta activa un solo ítem.
    expect(esItemActivoAdmin('/admin/compras-proveedores', '/admin/inventario')).toBe(false);
    expect(esItemActivoAdmin('/admin/pagos', '/admin/facturacion')).toBe(false);
    expect(esItemActivoAdmin('/admin/servicios/3', '/admin/servicios')).toBe(true);
    expect(esItemActivoAdmin('/admin/servicios', '/admin/inventario')).toBe(false);
    expect(esItemActivoAdmin(null, '/admin/inventario')).toBe(false);
  });
});
