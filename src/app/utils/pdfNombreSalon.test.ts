import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const textos: string[] = [];
vi.mock('jspdf', () => {
  class Doc {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    lastAutoTable = { finalY: 100 };
    setFillColor() {}
    rect() {}
    setTextColor() {}
    setFontSize() {}
    setFont() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    roundedRect() {}
    splitTextToSize(t: string) { return [t]; }
    getTextWidth() { return 10; }
    text(t: string | string[]) { textos.push(...(Array.isArray(t) ? t : [t])); }
    save() {}
    output() { return new Blob(); }
  }
  return { default: Doc };
});
vi.mock('jspdf-autotable', () => ({ default: () => undefined }));
vi.mock('../services/configuracionSitio', async (original) => ({
  ...(await original<typeof import('../services/configuracionSitio')>()),
  cargarConfiguracionPublicaCliente: async () => ({ salon: { nombre: 'Nombre del Ticket' } }),
}));

const { generarTicketVentaPdf } = await import('./ticketVenta');
const { generarNotaVentaPdf } = await import('./generarNotaPdf');

/** Ticket y nota de venta en PDF: el nombre del salón sale de Configuración del sitio y no llevan guiones largos. */
describe('PDF del ticket y de la nota con el nombre de la configuración', () => {
  it('el ticket usa el nombre configurado', async () => {
    textos.length = 0;
    await generarTicketVentaPdf({ id: 1, total: 100, metodoPago: 'efectivo', items: [], creadoEn: '2026-10-15T15:00:00.000Z' } as never);
    expect(textos.some((t) => t.includes('Nombre del Ticket'))).toBe(true);
  });

  it('la nota usa el nombre configurado', async () => {
    textos.length = 0;
    await generarNotaVentaPdf({ id: 1, clienteNombre: 'Ana', concepto: 'Corte', monto: 100, fecha: '2026-10-15' });
    expect(textos.some((t) => t.includes('Nombre del Ticket'))).toBe(true);
  });

  it('sin el nombre escrito a mano ni guiones largos en el código', () => {
    for (const archivo of ['ticketVenta.ts', 'generarNotaPdf.ts']) {
      const fuente = readFileSync(join(__dirname, archivo), 'utf8');
      expect(fuente).not.toContain('Beauty Salón');
      expect(fuente).not.toContain('\u2014');
    }
  });
});
