import { describe, expect, it } from 'vitest';
import { leerCantidadEntera } from './cantidadEntera';

describe('Cantidades de inventario y compras (el backend exige enteros)', () => {
  it('acepta enteros desde el mínimo', () => {
    expect(leerCantidadEntera('3')).toBe(3);
    expect(leerCantidadEntera('0', 0)).toBe(0);
  });

  it('rechaza decimales', () => {
    expect(leerCantidadEntera('2.5')).toBeNull();
    expect(leerCantidadEntera('1.0001')).toBeNull();
  });

  it('rechaza vacío, negativos y menores al mínimo', () => {
    expect(leerCantidadEntera('')).toBeNull();
    expect(leerCantidadEntera('-1', 0)).toBeNull();
    expect(leerCantidadEntera('0')).toBeNull();
  });
});
