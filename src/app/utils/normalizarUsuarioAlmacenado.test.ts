import { describe, expect, it } from 'vitest';
import { normalizarUsuarioAlmacenado } from './normalizarUsuarioAlmacenado';

describe('normalizarUsuarioAlmacenado', () => {
  it('conserva solo lo que la UI necesita y descarta PII del perfil', () => {
    const perfil = {
      id: 'u-1',
      nombre: 'Ana López',
      email: 'ana@example.com',
      rol: 'cliente',
      foto: 'https://res.cloudinary.com/demo/image/upload/ana.jpg',
      permisos: ['tienda:propia'],
      telefono: '7711234567',
      fechaNacimiento: '1990-05-01',
      alergias: 'Amoniaco',
      tipoCabello: 'rizado',
      token: 'eyJhbGciOi...',
      direcciones: [{ calle: 'Centro 1' }],
    };

    expect(normalizarUsuarioAlmacenado(perfil)).toEqual({
      id: 'u-1',
      nombre: 'Ana López',
      email: 'ana@example.com',
      rol: 'cliente',
      foto: 'https://res.cloudinary.com/demo/image/upload/ana.jpg',
      permisos: ['tienda:propia'],
    });
  });

  it('usa la foto de Google y el nombre de OAuth cuando no hay propios', () => {
    const u = normalizarUsuarioAlmacenado({
      _id: 'g-1',
      given_name: 'Ana',
      family_name: 'López',
      picture: 'https://lh3.googleusercontent.com/a/foto',
    });
    expect(u.id).toBe('g-1');
    expect(u.nombre).toBe('Ana López');
    expect(u.foto).toBe('https://lh3.googleusercontent.com/a/foto');
    expect(u).not.toHaveProperty('picture');
  });

  it('segunda defensa: tampoco guarda datos de salud anidados en un campo permitido', () => {
    const u = normalizarUsuarioAlmacenado({
      id: 'u-1',
      permisos: { tienda: true, alergias: 'Amoniaco', perfilCapilar: { tipo: 'liso' } },
    });
    expect(u.permisos).toEqual({ tienda: true });
  });
});
