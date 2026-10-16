import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { conUnidad, llenarTexto, normalizarTextos, piezasTexto, TEXTOS_POR_OMISION, textoSitio } from './textosSitio';

/** Textos del sitio en la web: valores de hoy, variables llenas (nunca "undefined") y piezas de React. */
describe('Textos del sitio (web)', () => {
  it('trae los valores de hoy: procesos, botones importantes y listas vacías', () => {
    expect(TEXTOS_POR_OMISION['citas.crear.botonConfirmar']).toBe('Confirmar cita');
    expect(TEXTOS_POR_OMISION['anticipos.botonPagar']).toBe('Pagar anticipo');
    expect(TEXTOS_POR_OMISION['checkout.recogerAviso']).toContain('Te avisamos en la app y por correo');
    expect(TEXTOS_POR_OMISION['citas.lista.vacia']).toBe('No tienes citas agendadas');
    expect(Object.values(TEXTOS_POR_OMISION).join(' ')).not.toContain(String.fromCharCode(0x2014));
    // Solo textos públicos: nada de correos ni avisos internos.
    expect(Object.keys(TEXTOS_POR_OMISION).some((c) => c.startsWith('correos.') || c.startsWith('avisos.'))).toBe(false);
  });

  it('llena variables de reglas y de contexto; una variable sin valor queda vacía', () => {
    expect(llenarTexto('Tienes {plazoAnticipo} y {nada}.', { plazoAnticipo: '2 horas' })).toBe('Tienes 2 horas y .');
    expect(textoSitio({ 'citas.lista.vacia': 'Sin citas en {nombreSalon}' }, 'citas.lista.vacia', { nombreSalon: 'Mi salón' })).toBe('Sin citas en Mi salón');
    expect(textoSitio(undefined, 'citas.lista.vacia')).toBe('No tienes citas agendadas');
    expect(textoSitio({}, 'no.existe')).toBe('');
  });

  it('normaliza lo que manda el API', () => {
    expect(normalizarTextos(null)['anticipos.botonPagar']).toBe('Pagar anticipo');
    expect(normalizarTextos({ 'anticipos.botonPagar': '  ' })['anticipos.botonPagar']).toBe('Pagar anticipo');
  });

  it('piezas: una variable puede ser una pieza de React', () => {
    const monto = createElement('strong', { key: 'm' }, '$300.00');
    const r = piezasTexto('Pagas {saldo} en el salón, {x}.', { x: 'hoy' }, { saldo: monto });
    expect(r).toEqual(['Pagas ', monto, ' en el salón, ', 'hoy', '.']);
  });

  it('unidades', () => {
    expect(conUnidad(1, 'hora', 'horas')).toBe('1 hora');
    expect(conUnidad(3, 'hora', 'horas')).toBe('3 horas');
  });
});
