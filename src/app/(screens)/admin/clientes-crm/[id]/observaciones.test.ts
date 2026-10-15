import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Entorno node: window y localStorage mínimos antes de importar el cliente real (fetch simulado).
const replace = vi.fn();
vi.stubGlobal('window', {
  location: { pathname: '/admin/clientes-crm/cli-1', search: '', origin: 'http://localhost:3000', replace },
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
vi.mock('../../../../services/config', () => ({
  getApiBaseUrl: () => 'http://api.test/api/auth',
  getBackendBaseUrl: () => 'http://api.test',
}));

let mod: typeof import('./observaciones');
beforeAll(async () => {
  mod = await import('./observaciones');
});

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const responder = (status: number, cuerpo: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status }));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  fetchMock.mockReset();
  replace.mockReset();
  vi.restoreAllMocks();
});

describe('Observaciones de la clienta: servicio', () => {
  it('lista con GET /api/clientes/:id/observaciones, con autor y fecha dd/mm/aaaa (México)', async () => {
    responder(200, {
      success: true,
      count: 1,
      data: [{ id: 3, texto: 'Prefiere tonos fríos', creadoEn: '2026-10-14T05:30:00.000Z', autor: { id: 'adm-1', nombre: 'Admin Salón' } }],
    });
    const lista = await mod.listarObservacionesCliente('cli-1');
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/clientes/cli-1/observaciones');
    expect(lista).toEqual([{ id: 3, texto: 'Prefiere tonos fríos', creadoEn: '2026-10-14T05:30:00.000Z', autor: 'Admin Salón' }]);
    // 05:30 UTC del 14 es el 13 de octubre en México.
    expect(mod.fechaObservacion(lista[0].creadoEn)).toBe('13/10/2026');
  });

  it('agrega con POST { texto } sin espacios de sobra y devuelve la observación nueva', async () => {
    responder(201, { success: true, data: { id: 4, texto: 'Alergia leve', creadoEn: '2026-10-14T18:00:00.000Z', autor: { id: 'est-1', nombre: 'Estilista Uno' } } });
    const nueva = await mod.crearObservacionCliente('cli-1', '  Alergia leve  ');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/clientes/cli-1/observaciones');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ texto: 'Alergia leve' });
    expect(nueva).toEqual({ id: 4, texto: 'Alergia leve', creadoEn: '2026-10-14T18:00:00.000Z', autor: 'Estilista Uno' });
  });

  it('valida antes de enviar: obligatoria y máximo 1000 caracteres', async () => {
    expect(mod.validarTextoObservacion('   ')).toBe('Escribe la observación.');
    expect(mod.validarTextoObservacion('a'.repeat(1001))).toBe('La observación puede tener como máximo 1000 caracteres.');
    expect(mod.validarTextoObservacion('a'.repeat(1000))).toBeNull();
    await expect(mod.crearObservacionCliente('cli-1', '')).rejects.toThrow('Escribe la observación.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un 403 se muestra en la ficha (mensaje del backend) sin mandar a /403', async () => {
    responder(403, { message: 'Solo puedes ver o agregar observaciones de clientas.' });
    await expect(mod.crearObservacionCliente('est-2', 'Nota')).rejects.toThrow('Solo puedes ver o agregar observaciones de clientas.');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('Fichas de clientes-crm', () => {
  const aqui = __dirname;
  const fichaAdmin = readFileSync(join(aqui, 'page.tsx'), 'utf8');
  const fichaOperacion = readFileSync(
    join(aqui, '..', '..', '..', '(privada)', 'operacion', 'clientes-crm', '[id]', 'page.tsx'),
    'utf8',
  );
  const componente = readFileSync(join(aqui, 'ObservacionesCliente.tsx'), 'utf8');

  it('admin: el botón "Agregar observación" ya no está deshabilitado siempre y la ficha muestra las observaciones', () => {
    expect(fichaAdmin).not.toMatch(/<Button[^>]*disabled>\s*Agregar observación/);
    expect(fichaAdmin).toMatch(/<ObservacionesCliente\s/);
  });

  it('operación: lee con clientes:lectura y escribe solo con clientes:escritura', () => {
    expect(fichaOperacion).toMatch(/<ObservacionesCliente\s/);
    expect(fichaOperacion).toContain("puedeLeer={tienePermiso('clientes:lectura')}");
    expect(fichaOperacion).toContain("puedeEscribir={tienePermiso('clientes:escritura')}");
  });

  it('el modal usa Textarea, muestra carga y error visibles, y cada observación lleva autor y fecha', () => {
    expect(componente).toContain('<Modal');
    expect(componente).toContain('<Textarea');
    expect(componente).toMatch(/Guardando…/);
    expect(componente).toContain('role="alert"');
    expect(componente).toContain('Agregar observación');
    expect(componente).toContain('fechaObservacion(');
    expect(componente).toContain('.autor');
  });
});
