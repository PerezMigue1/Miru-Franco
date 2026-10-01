import { describe, expect, it } from 'vitest';
import { fotosDeServicios } from './galeria';
import type { Servicio } from '../services/servicios';

const base = (x: Partial<Servicio>): Servicio => ({ id: 1, nombre: 'Corte', ...x });

describe('fotosDeServicios', () => {
  it('toma todas las fotos de servicios activos con su nombre y categoría', () => {
    const fotos = fotosDeServicios([
      base({ id: 1, nombre: 'Corte', categoria: 'Cortes', imagenes: ['https://a/1.jpg', 'https://a/2.jpg'] }),
      base({ id: 2, nombre: 'Color', imagen: 'https://a/3.jpg' }),
    ]);
    expect(fotos.map((f) => f.url)).toEqual(['https://a/1.jpg', 'https://a/2.jpg', 'https://a/3.jpg']);
    expect(fotos[0]).toMatchObject({ servicioId: 1, servicio: 'Corte', categoria: 'Cortes' });
  });

  it('omite servicios inactivos, URLs no absolutas y duplicados', () => {
    const fotos = fotosDeServicios([
      base({ id: 1, activo: false, imagenes: ['https://a/1.jpg'] }),
      base({ id: 2, imagenes: ['/local.jpg', 'https://a/2.jpg'] }),
      base({ id: 3, imagenes: ['https://a/2.jpg'] }),
    ]);
    expect(fotos.map((f) => f.url)).toEqual(['https://a/2.jpg']);
  });

  it('sin fotos devuelve una lista vacía (estado vacío, sin relleno)', () => {
    expect(fotosDeServicios([base({})])).toEqual([]);
  });
});
