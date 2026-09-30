import { describe, expect, it } from 'vitest';
import { formatearPrecioMXN, precioParaMostrar } from './formatoPrecio';

describe('formatearPrecioMXN', () => {
  it('unifica "1200" y "$1,200" y respeta centavos', () => {
    expect(formatearPrecioMXN('1200')).toBe('$1,200');
    expect(formatearPrecioMXN('$1,200')).toBe('$1,200');
    expect(formatearPrecioMXN(350.5)).toBe('$350.50');
  });

  it('no inventa un precio cuando no lo hay', () => {
    expect(formatearPrecioMXN(undefined)).toBe('');
    expect(formatearPrecioMXN('A consultar')).toBe('A consultar');
  });
});

describe('precioParaMostrar', () => {
  it('formatea precios reales en texto o número', () => {
    expect(precioParaMostrar('$1,200')).toBe('$1,200');
    expect(precioParaMostrar('400')).toBe('$400');
    expect(precioParaMostrar(535)).toBe('$535');
  });

  it('devuelve null sin precio real (vacío, no numérico o cero)', () => {
    expect(precioParaMostrar('$0')).toBeNull();
    expect(precioParaMostrar(0)).toBeNull();
    expect(precioParaMostrar('')).toBeNull();
    expect(precioParaMostrar(null)).toBeNull();
    expect(precioParaMostrar('A consultar')).toBeNull();
  });
});
