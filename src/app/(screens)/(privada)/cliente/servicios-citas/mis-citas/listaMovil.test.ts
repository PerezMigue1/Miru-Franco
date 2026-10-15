import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CitaApi } from '../../../../../services/citas';

vi.mock('../../../../../services/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

const { default: TarjetaCitaMovil } = await import('./TarjetaCitaMovil');

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const AHORA = new Date('2026-10-14T12:00:00-06:00');
const cita = (x: Partial<CitaApi> = {}): CitaApi =>
  ({
    id: 41,
    estado: 'confirmada',
    servicioNombre: 'Corte de Cabello Dama',
    especialistaNombre: 'Ana',
    fechaHoraInicio: '2026-10-20T16:00:00.000Z',
    fechaHoraFin: '2026-10-20T17:00:00.000Z',
    ...x,
  }) as CitaApi;
const pintar = (c: CitaApi) =>
  renderToStaticMarkup(
    createElement(TarjetaCitaMovil, { cita: c, ahora: AHORA, fecha: 'mar, 20 oct 2026', hora: '10:00', variante: 'success' }),
  );

/** En móvil la tabla dejaba el estado y "Ver" fuera de vista: por debajo de 640 px cada cita es una tarjeta. */
describe('Mis citas en móvil: tarjetas con el estado bajo el nombre', () => {
  it('el estado va justo debajo del nombre del servicio, con fecha, hora y especialista', () => {
    const html = pintar(cita());
    const nombre = html.indexOf('Corte de Cabello Dama');
    const estado = html.indexOf('Confirmada');
    expect(nombre).toBeGreaterThan(-1);
    expect(estado).toBeGreaterThan(nombre);
    expect(html).toContain('mar, 20 oct 2026');
    expect(html).toContain('10:00');
    expect(html).toContain('Ana');
  });

  it('"Ver" lleva al detalle y mide 44 px', () => {
    const html = pintar(cita());
    const ver = html.match(/<a[^>]*href="\/cliente\/servicios-citas\/mis-citas\/41"[^>]*>/)?.[0] ?? '';
    expect(ver).toMatch(/\bmin-h-11\b/);
  });

  it('una cita que se puede gestionar ofrece Reprogramar y Cancelar; una cancelada no', () => {
    const activa = pintar(cita());
    expect(activa).toContain('href="/cliente/servicios-citas/reprogramar/41"');
    expect(activa).toContain('href="/cliente/servicios-citas/cancelar/41"');
    const cancelada = pintar(cita({ estado: 'cancelada' }));
    expect(cancelada).not.toContain('/reprogramar/41');
    expect(cancelada).not.toContain('/cancelar/41');
  });

  it('la página usa las tarjetas por debajo de 640 px y la tabla desde ahí', () => {
    expect(pagina).toMatch(/<ul className="space-y-3 sm:hidden"[^>]*>[\s\S]*?<TarjetaCitaMovil/);
    expect(pagina).toMatch(/<div className="hidden sm:block">\s*<Table headers=/);
  });
});

describe('Mis citas en móvil: "Pagar anticipo" a 44 px', () => {
  it('el enlace "Pagar anticipo" de la tarjeta mide 44 px (min-h-11), no 36', () => {
    const html = pintar(cita({ anticipoRequerido: 200 } as Partial<CitaApi>));
    const enlace = html.match(/<a[^>]*>\s*Pagar anticipo\s*<\/a>/)?.[0] ?? '';
    expect(enlace).not.toBe('');
    expect(enlace).toContain('min-h-11');
    expect(enlace).not.toContain('min-h-9');
  });
});
