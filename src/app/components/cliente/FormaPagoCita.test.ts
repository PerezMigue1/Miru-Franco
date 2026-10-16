// Crear cita, paso Confirmar: "Forma de pago" siempre visible (vitest corre sin DOM: renderToStaticMarkup).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FormaPagoCita from './FormaPagoCita';
import { normalizarReglasPublicas, REGLAS_PUBLICAS_POR_OMISION } from '../../utils/reglasNegocio';
import { consecuenciaNoAsistir, opcionesAnticipo, opcionInicial, plazoDeOpcion, saldoEnSalon, textoBotonConfirmar, textoSinAnticipo } from '../../utils/formaPago';

const HOY = REGLAS_PUBLICAS_POR_OMISION;
const pintar = (props: Partial<Parameters<typeof FormaPagoCita>[0]>) =>
  renderToStaticMarkup(createElement(FormaPagoCita, { precio: '450.00', anticipo: 0, reglas: HOY, opcion: 'linea', onOpcion: () => undefined, ...props }));

describe('Sin anticipo', () => {
  it('dice cuánto se paga en el salón y con qué métodos', () => {
    const html = pintar({ anticipo: 0 });
    expect(html).toContain('Forma de pago');
    expect(html).toContain('Pagas $450 en el salón el día de tu cita.');
    expect(html).toContain('En el salón puedes pagar con efectivo, tarjeta o transferencia.');
  });

  it('solo los métodos activos', () => {
    const reglas = normalizarReglasPublicas({ pagos: { metodosSalon: ['efectivo'] } });
    expect(pintar({ anticipo: 0, reglas })).toContain('En el salón puedes pagar con efectivo.');
  });
});

describe('Con anticipo', () => {
  it('monto, saldo, las dos opciones con su plazo y las consecuencias', () => {
    const html = pintar({ anticipo: 150 });
    expect(html).toContain('$150<');
    expect(html).toContain('$300<');
    expect(html).toContain('Pagar anticipo en línea');
    expect(html).toContain('Pagar anticipo en el salón');
    expect(html).toContain('Tienes 2 horas para pagarlo');
    expect(html).toContain('Llega entre 20 y 15 minutos antes');
    expect(html).toContain('el anticipo no se devuelve');
  });

  it('una opción apagada en las reglas no se ofrece', () => {
    const sinSalon = normalizarReglasPublicas({ citas: { permitirAnticipoEnSalon: false } });
    expect(pintar({ anticipo: 150, reglas: sinSalon })).not.toContain('Pagar anticipo en el salón');
    const sinLinea = normalizarReglasPublicas({ pagos: { mercadoPagoAnticipos: false } });
    expect(opcionesAnticipo(sinLinea)).toEqual(['salon']);
    expect(opcionInicial(sinLinea)).toBe('salon');
  });

  it('el plazo sale de la regla (3 horas)', () => {
    expect(plazoDeOpcion('linea', normalizarReglasPublicas({ citas: { plazoAnticipoHoras: 3 } }))).toContain('3 horas');
  });

  it('si la regla dice que no se pierde el anticipo, no lo promete', () => {
    expect(consecuenciaNoAsistir(normalizarReglasPublicas({ citas: { noAsistio: { pierdeAnticipo: false, mesesSoloPagoEnLinea: 0 } } }))).toBe(
      'Si no llegas a tu cita, el salón revisa la devolución de tu anticipo.',
    );
  });
});

describe('Botón y saldo', () => {
  it('el botón cambia con la forma de pago', () => {
    expect(textoBotonConfirmar(150, 'linea', false)).toBe('Confirmar y pagar anticipo');
    expect(textoBotonConfirmar(150, 'salon', false)).toBe('Confirmar y pagar en el salón');
    expect(textoBotonConfirmar(0, 'linea', false)).toBe('Confirmar cita');
  });

  it('saldo y textos con precio en texto o sin precio', () => {
    expect(saldoEnSalon('450.00', 150)).toBe(300);
    expect(saldoEnSalon(null, 150)).toBeNull();
    expect(textoSinAnticipo(undefined)).toBe('Pagas tu servicio en el salón el día de tu cita.');
  });
});
