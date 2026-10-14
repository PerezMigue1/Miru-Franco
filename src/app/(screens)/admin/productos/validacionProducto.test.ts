import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/client', () => ({ apiClient: {} }));
vi.mock('../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { validarProductoNuevo } from './validacionProducto';
import { productoPayloadToApiBody } from '../../../services/productos';

const base = { nombre: 'Shampoo', descripcion: 'Hidratante', categoria: 'Cabello', marca: 'AVYNA', precio: '250' };

afterEach(() => vi.restoreAllMocks());

describe('Producto nuevo: validación en el front', () => {
  it('un producto completo pasa', () => {
    expect(validarProductoNuevo(base)).toBeNull();
  });

  it('exige marca (el backend la pide y respondería en inglés)', () => {
    expect(validarProductoNuevo({ ...base, marca: '  ' })).toBe('Elige una marca.');
  });

  it('exige un precio mayor que 0 (vacío no se guarda como $0)', () => {
    expect(validarProductoNuevo({ ...base, precio: '' })).toBe('El precio debe ser mayor que 0.');
    expect(validarProductoNuevo({ ...base, precio: '0' })).toBe('El precio debe ser mayor que 0.');
    expect(validarProductoNuevo({ ...base, precio: '-5' })).toBe('El precio debe ser mayor que 0.');
  });
});

describe('Cuerpo del producto para el API', () => {
  it('no manda marca vacía', () => {
    const body = productoPayloadToApiBody({ nombre: 'X', descripcion: 'Y', categoria: 'Z', marca: '' });
    expect('marca' in body).toBe(false);
    const sinMarca = productoPayloadToApiBody({ nombre: 'X', descripcion: 'Y', categoria: 'Z' });
    expect('marca' in sinMarca).toBe(false);
  });

  it('sí manda la marca cuando hay una', () => {
    expect(productoPayloadToApiBody({ nombre: 'X', descripcion: 'Y', categoria: 'Z', marca: ' AVYNA ' }).marca).toBe('AVYNA');
  });
});
