import { describe, expect, it } from 'vitest';
import { montoTotalCotizaciones, textoCotizacionesRegistradas } from './resumenCotizaciones';

describe('Resumen de cotizaciones', () => {
  it('el monto total no suma las canceladas', () => {
    expect(
      montoTotalCotizaciones([
        { estado: 'pendiente', monto: 5000 },
        { estado: 'confirmada', monto: 8000.5 },
        { estado: 'cancelada', monto: 12000 },
      ]),
    ).toBe(13000.5);
  });

  it('plurales correctos', () => {
    expect(textoCotizacionesRegistradas(0)).toBe('0 cotizaciones registradas');
    expect(textoCotizacionesRegistradas(1)).toBe('1 cotización registrada');
    expect(textoCotizacionesRegistradas(7)).toBe('7 cotizaciones registradas');
  });
});
