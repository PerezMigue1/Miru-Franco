import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EncabezadoPagoEnLinea from './EncabezadoPagoEnLinea';

type Props = Parameters<typeof EncabezadoPagoEnLinea>[0];
const base: Props = {
  estado: null,
  esperando: true,
  venceEn: null,
  reintentando: false,
  onReintentar: () => {},
  errorConsulta: null,
};
const texto = (props: Partial<Props>) =>
  renderToStaticMarkup(createElement(EncabezadoPagoEnLinea, { ...base, ...props }))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

/** Si falla crear la preferencia o consultar el estado (503), la pantalla no puede quedarse consultando. */
describe('Confirmación de compra: error al consultar el pago', () => {
  it('sin respuesta todavía muestra que está consultando', () => {
    expect(texto({})).toContain('Consultando el estado de tu pago');
  });

  it('con la consulta fallida muestra el error en español y el botón Reintentar pago', () => {
    const t = texto({ esperando: false, errorConsulta: 'El servicio no está disponible en este momento.' });
    expect(t).not.toContain('Consultando el estado de tu pago');
    expect(t).toContain('No pudimos consultar tu pago');
    expect(t).toContain('El servicio no está disponible en este momento.');
    expect(t).toContain('Reintentar pago');
  });

  it('un pago aprobado sigue mostrando el pago recibido aunque una consulta posterior falle', () => {
    expect(texto({ estado: 'aprobado', errorConsulta: 'x' })).toContain('¡Pago recibido!');
  });

  it('el rechazo sigue ofreciendo Reintentar pago', () => {
    const t = texto({ estado: 'rechazado', esperando: false });
    expect(t).toContain('Tu pago no se completó');
    expect(t).toContain('Reintentar pago');
  });
});
