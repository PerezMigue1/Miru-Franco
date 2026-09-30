import { describe, expect, it } from 'vitest';
import { seleccionarProductosHero } from './heroProductos';
import type { Producto } from '../services/productos';

const producto = (x: Partial<Producto>): Producto => ({
  id: 1,
  nombre: 'Shampoo',
  descripcion: '',
  precio: '350',
  categoria: 'Shampoo',
  stock: true,
  disponible: true,
  ...x,
});

const IMG = 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg';

describe('seleccionarProductosHero', () => {
  it('solo toma productos disponibles con imagen real', () => {
    const r = seleccionarProductosHero([
      producto({ id: 1, imagenes: [IMG] }),
      producto({ id: 2, imagenes: [] }),
      producto({ id: 3, disponible: false, imagenes: [IMG.replace('a.jpg', 'b.jpg')] }),
    ]);
    expect(r.map((p) => p.id)).toEqual([1]);
    expect(r[0]!.imagen).toContain('/upload/c_fill,g_auto,w_600,h_800,f_auto,q_auto/v1/a.jpg');
    expect(r[0]!.precio).toBe('$350');
  });

  it('prefiere variar categorías y completa hasta el máximo', () => {
    const img = (n: number) => IMG.replace('a.jpg', `${n}.jpg`);
    const r = seleccionarProductosHero(
      [
        producto({ id: 1, categoria: 'Shampoo', imagenes: [img(1)] }),
        producto({ id: 2, categoria: 'Shampoo', imagenes: [img(2)] }),
        producto({ id: 3, categoria: 'Tratamiento', imagenes: [img(3)] }),
      ],
      2
    );
    expect(r.map((p) => p.id)).toEqual([1, 3]);
  });
});
