import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { patch, post } = vi.hoisted(() => ({
  patch: vi.fn<(ruta: string, cuerpo: unknown, base?: unknown) => Promise<unknown>>(async () => ({ anticipoVenceEn: '2026-10-22T15:45:00.000Z' })),
  post: vi.fn(async () => ({})),
}));
vi.mock('../../services/client', () => ({ apiClient: { get: vi.fn(), post, put: vi.fn(), patch, delete: vi.fn() } }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { puedeElegirPagoEnSalon, textosAdvertenciaAnticipo } from './advertenciaAnticipo';
import OpcionesAnticipo from './OpcionesAnticipo';
import { TEXTO_POLITICA_ANTICIPOS } from './consentimientoAnticipo';
import { pagarAnticipoEnSalon } from '../../services/citas';

afterEach(() => patch.mockClear());

/**
 * Confirmación y detalle de una cita con anticipo pendiente: "Pagar anticipo con Mercado Pago", "Pagar en el salón"
 * (si todavía da tiempo), el plazo y qué pasa con el anticipo. El texto de devolución es el mismo de la casilla y de
 * la Política de anticipos publicada.
 */
const AHORA = new Date('2026-10-20T15:00:00.000Z');
const INICIO = '2026-10-22T16:00:00.000Z';

describe('Cuándo se ofrece "Pagar en el salón"', () => {
  it('con anticipo en línea y tiempo de sobra: sí', () => {
    expect(puedeElegirPagoEnSalon({ fechaHoraInicio: INICIO, anticipoEnSalon: false }, AHORA)).toBe(true);
  });
  it('si ya eligió el salón: no', () => {
    expect(puedeElegirPagoEnSalon({ fechaHoraInicio: INICIO, anticipoEnSalon: true }, AHORA)).toBe(false);
  });
  it('si faltan menos de 20 minutos para la cita (15 de plazo más 5 de margen): no', () => {
    expect(puedeElegirPagoEnSalon({ fechaHoraInicio: '2026-10-20T15:19:00.000Z', anticipoEnSalon: false }, AHORA)).toBe(false);
    expect(puedeElegirPagoEnSalon({ fechaHoraInicio: '2026-10-20T15:21:00.000Z', anticipoEnSalon: false }, AHORA)).toBe(true);
  });
});

describe('Advertencia de plazo y consecuencias', () => {
  it('en línea: 2 horas para pagar o el horario se libera', () => {
    const t = textosAdvertenciaAnticipo({ enSalon: false, venceEn: '2026-10-20T17:00:00.000Z' }).join(' ');
    expect(t).toContain('2 horas');
    expect(t).toContain('el horario se libera');
  });
  it('en el salón: a más tardar 15 minutos antes de la cita', () => {
    const t = textosAdvertenciaAnticipo({ enSalon: true, venceEn: '2026-10-22T15:45:00.000Z' }).join(' ');
    expect(t).toContain('15 minutos antes de tu cita');
    expect(t).toContain('el horario se libera');
  });
  it('cuándo se devuelve y cuándo no: el mismo texto de la casilla y de la política, más la falta sin aviso', () => {
    const t = textosAdvertenciaAnticipo({ enSalon: false, venceEn: null }).join(' ');
    expect(t).toContain(TEXTO_POLITICA_ANTICIPOS);
    expect(t).toContain('Si no llegas a tu cita y no avisas, el anticipo no se devuelve.');
  });
});

describe('Componente', () => {
  it('muestra los dos botones, la casilla, la advertencia y el enlace a la política', () => {
    const html = renderToStaticMarkup(
      createElement(OpcionesAnticipo, {
        cita: { id: 7, fechaHoraInicio: INICIO, anticipoEnSalon: false, anticipoRequerido: 150 } as never,
        venceEn: '2026-10-20T17:00:00.000Z',
        enSalon: false,
        ahora: AHORA,
        rutaOrigen: '/cliente/servicios-citas/confirmacion',
        onCambioASalon: () => undefined,
      }),
    );
    expect(html).toContain('Pagar anticipo con Mercado Pago');
    expect(html).toContain('Pagar en el salón');
    expect(html).toContain('2 horas');
    expect(html).toContain('href="/politica-de-reembolsos#anticipos"');
  });

  it('la confirmación y el detalle de la cita usan este componente', () => {
    expect(readFileSync(join(__dirname, 'EncabezadoAnticipo.tsx'), 'utf8')).toContain('<OpcionesAnticipo');
    expect(readFileSync(join(__dirname, 'AnticipoPortal.tsx'), 'utf8')).toContain('<OpcionesAnticipo');
  });
});

describe('Servicio', () => {
  it('pagar en el salón: PATCH /api/citas/:id/anticipo-en-salon y devuelve el plazo nuevo', async () => {
    await expect(pagarAnticipoEnSalon(7)).resolves.toEqual({ anticipoVenceEn: '2026-10-22T15:45:00.000Z' });
    expect(patch.mock.calls[0][0]).toBe('/api/citas/7/anticipo-en-salon');
  });
});
