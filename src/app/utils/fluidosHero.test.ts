import { describe, expect, it } from 'vitest';
import { seleccionarFluidos } from './fluidosHero';
import type { Producto } from '../services/productos';

const producto = (id: number, nombre: string, precio: string): Producto => ({
  id,
  nombre,
  descripcion: '',
  precio,
  categoria: 'Tratamiento capilar',
  stock: true,
  disponible: true,
});

describe('seleccionarFluidos', () => {
  it('toma nombre y precio del catálogo por id, en el orden del hero (Goji al frente)', () => {
    const r = seleccionarFluidos([
      producto(33, 'Fluido Di Argan', '535'),
      producto(34, 'Fluido Di Goji', '535'),
      producto(35, 'Fluido Di Platino', '645'),
      producto(36, 'Fluido Ialuronico', '535'),
      producto(2, 'Otro', '100'),
    ]);
    expect(r.map((f) => f.clave)).toEqual(['goji', 'argan', 'platino', 'hialuronico']);
    expect(r[0]).toMatchObject({ id: 34, nombre: 'Fluido Di Goji', precio: '$535' });
    expect(r[2]).toMatchObject({ id: 35, precio: '$645' });
  });

  it('sin el producto en el catálogo no inventa nombre ni precio', () => {
    const r = seleccionarFluidos([]);
    expect(r).toHaveLength(4);
    expect(r.every((f) => f.nombre === null && f.precio === null)).toBe(true);
  });
});
