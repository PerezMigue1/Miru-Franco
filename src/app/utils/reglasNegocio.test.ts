import { describe, expect, it } from 'vitest';
import { listaMetodosSalon, llenarVariables, normalizarReglasPublicas, REGLAS_PUBLICAS_POR_OMISION } from './reglasNegocio';

describe('Reglas públicas del backend', () => {
  it('sin respuesta del backend: los valores de hoy', () => {
    const r = normalizarReglasPublicas(undefined);
    expect(r.citas.plazoAnticipoHoras).toBe(2);
    expect(r.tienda.diasResguardoPagado).toBe(15);
    expect(r.pagos.metodosSalon).toEqual(['efectivo', 'tarjeta', 'transferencia']);
    expect(r.variables.plazoAnticipoHoras).toBe('2');
  });

  it('lo que manda el backend gana; lo que no es del tipo esperado toma el de hoy', () => {
    const r = normalizarReglasPublicas({
      citas: { plazoAnticipoHoras: 3, minutosAntesPagoSalon: 'x' },
      pagos: { mercadoPagoTienda: false, metodosSalon: ['tarjeta', 'cheque'], transferencia: { banco: 'B', titular: 'T', clabe: '012345678901234567' } },
      variables: { plazoAnticipoHoras: '3' },
    });
    expect(r.citas.plazoAnticipoHoras).toBe(3);
    expect(r.citas.minutosAntesPagoSalon).toBe(15);
    expect(r.pagos.mercadoPagoTienda).toBe(false);
    expect(r.pagos.metodosSalon).toEqual(['tarjeta']);
    expect(r.pagos.transferencia?.banco).toBe('B');
    expect(r.variables.plazoAnticipoHoras).toBe('3');
    expect(r.variables.diasResguardo).toBe('15');
  });

  it('transferencia incompleta: no se muestra', () => {
    expect(normalizarReglasPublicas({ pagos: { transferencia: { banco: 'B', titular: '', clabe: '' } } }).pagos.transferencia).toBeNull();
  });
});

describe('Variables en los textos', () => {
  it('llena las conocidas y deja las desconocidas', () => {
    expect(llenarVariables('Paga en {plazoAnticipoHoras} horas ({otra})', REGLAS_PUBLICAS_POR_OMISION.variables)).toBe('Paga en 2 horas ({otra})');
  });

  it('lista de métodos para una oración', () => {
    expect(listaMetodosSalon(['efectivo', 'tarjeta', 'transferencia'])).toBe('efectivo, tarjeta o transferencia');
    expect(listaMetodosSalon(['tarjeta'])).toBe('tarjeta');
  });
});
