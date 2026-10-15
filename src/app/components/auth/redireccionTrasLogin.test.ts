import { describe, expect, it } from 'vitest';
import { rutaDeRegreso } from './redireccionTrasLogin';

describe('Pantallas de acceso: después de entrar no se regresa a ellas', () => {
  it('el alta con Google (/auth/completar-registro) tampoco es un regreso válido, con o sin token', () => {
    expect(rutaDeRegreso('/auth/completar-registro')).toBeNull();
    expect(rutaDeRegreso('/auth/completar-registro#token=abc')).toBeNull();
    expect(rutaDeRegreso('/auth/completar-registro?token=abc')).toBeNull();
  });

  it('las demás pantallas de acceso siguen fuera y una página normal sí vale', () => {
    for (const r of ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']) expect(rutaDeRegreso(r)).toBeNull();
    expect(rutaDeRegreso('/cliente/tienda-online')).toBe('/cliente/tienda-online');
  });
});
