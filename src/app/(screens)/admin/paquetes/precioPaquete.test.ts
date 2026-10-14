import { describe, expect, it } from 'vitest';
import { leerPrecioPaquete } from './precioPaquete';

describe('Precio especial de un paquete', () => {
  it('acepta precios válidos, también con $ y comas', () => {
    expect(leerPrecioPaquete('1500')).toBe(1500);
    expect(leerPrecioPaquete('$1,500.50')).toBe(1500.5);
    expect(leerPrecioPaquete(0)).toBe(0);
  });

  it('rechaza un precio negativo (antes se quitaba el signo y "-500" se guardaba como 500)', () => {
    expect(leerPrecioPaquete('-500')).toBeNull();
  });

  it('rechaza vacío o texto', () => {
    expect(leerPrecioPaquete('')).toBeNull();
    expect(leerPrecioPaquete('abc')).toBeNull();
  });
});
