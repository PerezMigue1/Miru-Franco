import { describe, expect, it } from 'vitest';
import { formatearPrecioMXN } from './formatoPrecio';

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
