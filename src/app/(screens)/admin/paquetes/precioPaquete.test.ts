import { describe, expect, it } from 'vitest';
import { leerPrecioPaquete, mostrarPrecioPaquete } from './precioPaquete';

/** B15: el mismo precio salía como $1100, $1,100 y $1,100.00. Un solo formato: el de pesos del proyecto. */
describe('mostrarPrecioPaquete', () => {
  it('1100, "1100", "$1,100.00" y 1100.0 se ven igual', () => {
    for (const v of [1100, '1100', '$1,100.00', 1100.0]) expect(mostrarPrecioPaquete(v)).toBe('$1,100');
  });

  it('los centavos se conservan', () => {
    expect(mostrarPrecioPaquete('1250.5')).toBe('$1,250.50');
  });

  it('sin precio lo dice en palabras', () => {
    expect(mostrarPrecioPaquete(undefined)).toBe('Sin precio');
    expect(mostrarPrecioPaquete('')).toBe('Sin precio');
  });
});

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
