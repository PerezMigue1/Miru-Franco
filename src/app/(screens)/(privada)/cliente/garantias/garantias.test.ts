import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>() }));
vi.mock('../../../../services/client', () => ({ apiClient: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { ETIQUETA_ESTADO_QUEJA, validarQueja } from './garantias';
import { listarMisSeguimientos } from '../../../../services/seguimientos';

afterEach(() => get.mockReset());

/**
 * Portal de la clienta: "Garantías y soporte" y "Seguimientos" ya no muestran casos inventados de 2024. Las quejas y
 * los seguimientos salen de la base y el formulario de garantía registra la queja de verdad.
 */
describe('Garantías y soporte', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('sin datos inventados: lista las quejas de la clienta y el formulario las registra', () => {
    expect(pagina).not.toMatch(/2024-01/);
    expect(pagina).toContain('listarQuejasPorCliente(');
    expect(pagina).toContain('crearQueja(');
    expect(pagina).not.toContain('garantía de satisfacción');
  });

  it('valida asunto y descripción antes de enviar, en español', () => {
    expect(validarQueja('', '')).toEqual({ asunto: 'Escribe de qué se trata (al menos 3 caracteres).', descripcion: 'Cuéntanos qué pasó (al menos 10 caracteres).' });
    expect(validarQueja('Alaciado', 'El resultado no duró.')).toEqual({});
    expect(validarQueja('a'.repeat(121), 'x'.repeat(10))).toEqual({ asunto: 'El asunto tiene como máximo 120 caracteres.' });
  });

  it('estados de la queja en español', () => {
    expect(ETIQUETA_ESTADO_QUEJA).toEqual({ abierta: 'Recibida', en_proceso: 'En revisión', resuelta: 'Resuelta', cerrada: 'Cerrada' });
  });
});

describe('Seguimientos', () => {
  it('la pantalla sin datos inventados usa GET /api/seguimientos/mios y no muestra las notas internas del personal', async () => {
    const pagina = readFileSync(join(__dirname, '..', 'seguimientos', 'page.tsx'), 'utf8');
    expect(pagina).not.toMatch(/2024-01/);
    expect(pagina).toContain('listarMisSeguimientos(');
    expect(pagina).not.toMatch(/\.notas\b/);
    // Un backend anterior todavía manda las notas: la web las descarta.
    get.mockResolvedValueOnce({ data: [{ id: 3, servicio: 'Nanoplastia', fechaContacto: '2026-10-10T16:00:00.000Z', satisfaccion: 5, notas: 'Nota interna.' }] });
    const lista = await listarMisSeguimientos();
    expect(get.mock.calls[0][0]).toBe('/api/seguimientos/mios');
    expect(lista).toEqual([{ id: 3, servicio: 'Nanoplastia', fechaContacto: '2026-10-10T16:00:00.000Z', satisfaccion: 5 }]);
  });
});

describe('Las tres pantallas del portal ya no se esconden', () => {
  it('garantías, promociones y seguimientos tienen datos reales: next.config ya no las redirige a /perfil', () => {
    const config = readFileSync(join(__dirname, '..', '..', '..', '..', '..', '..', 'next.config.ts'), 'utf8');
    for (const ruta of ['/cliente/garantias', '/cliente/promociones', '/cliente/seguimientos']) expect(config).not.toContain(`'${ruta}'`);
  });
});
