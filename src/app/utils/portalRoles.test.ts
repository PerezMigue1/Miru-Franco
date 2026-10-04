import { describe, expect, it } from 'vitest';
import { rutaDeRegreso } from '../components/auth/redireccionTrasLogin';
import { panelDeRol } from './adminAuth';

describe('Regreso después de iniciar sesión', () => {
  it('cualquier página interna del sitio es un regreso válido, para todos los roles', () => {
    for (const r of ['/home', '/servicios', '/cliente/tienda-online/carrito', '/perfil', '/operacion/punto-de-venta', '/admin', '/contacto?x=1#y']) {
      expect(rutaDeRegreso(r)).toBe(r);
    }
  });
  it('rechaza destinos externos o raros (sin open redirect)', () => {
    for (const r of [null, '', 'https://malo.com', '//malo.com', '/\\malo.com', 'javascript:alert(1)', 'home']) {
      expect(rutaDeRegreso(r)).toBeNull();
    }
  });
  it('no regresa a las pantallas de acceso (evita el ciclo)', () => {
    for (const r of ['/login', '/login?returnUrl=/home', '/register', '/forgot-password', '/reset-password', '/auth/callback']) {
      expect(rutaDeRegreso(r)).toBeNull();
    }
  });
});

describe('Acceso al panel desde el menú de cuenta', () => {
  it('admin ve su panel de administración y el personal el de operación', () => {
    expect(panelDeRol('admin')).toEqual({ href: '/admin', etiqueta: 'Panel de administración' });
    for (const r of ['estilista', 'empleado', 'becario', 'becado']) expect(panelDeRol(r)).toEqual({ href: '/operacion', etiqueta: 'Panel de operación' });
  });
  it('la clienta no tiene panel', () => {
    expect(panelDeRol('cliente')).toBeNull();
    expect(panelDeRol(undefined)).toBeNull();
  });
});
