import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));
vi.mock('../utils/security', () => ({ hasSession: () => true }));

import {
  confirmacionImportacion,
  confirmacionImportacionEscrita,
  confirmacionTruncate,
  errorConfirmacionImportacion,
  importarDatos,
  truncarTabla,
} from './database';

type LlamadaFetch = [string, RequestInit];

function fetchQueResponde(status: number, cuerpo: Record<string, unknown>) {
  const fetchFalso = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
    new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Truncate e importar escriben en la base: el backend exige un campo `confirmacion` con el texto
 * exacto ("TRUNCATE <tabla>" o "IMPORTAR <tabla>") y sin él responde 400.
 */
describe('Gestor de base de datos: la confirmación viaja al backend', () => {
  it('los textos de confirmación son los que exige el backend', () => {
    expect(confirmacionTruncate('servicios')).toBe('TRUNCATE servicios');
    expect(confirmacionImportacion('servicios')).toBe('IMPORTAR servicios');
  });

  it('truncarTabla manda la confirmación escrita en el formulario junto con las opciones', async () => {
    const fetchFalso = fetchQueResponde(200, { success: true, tabla: 'servicios', message: 'Se vació la tabla servicios' });
    const r = await truncarTabla('servicios', 'TRUNCATE servicios', { restartIdentity: false, cascade: true });
    expect(r.success).toBe(true);
    const [url, init] = fetchFalso.mock.calls[0] as LlamadaFetch;
    expect(url).toBe('http://api.test/api/db/truncate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      tabla: 'servicios',
      restartIdentity: false,
      cascade: true,
      confirmacion: 'TRUNCATE servicios',
    });
  });

  it('importarDatos manda tabla, archivo, modo y confirmación en el multipart', async () => {
    const fetchFalso = fetchQueResponde(200, { success: true, importados: 2 });
    const archivo = new File(['[]'], 'servicios.json', { type: 'application/json' });
    const r = await importarDatos('servicios', archivo, 'append', 'IMPORTAR servicios');
    expect(r).toMatchObject({ success: true, importados: 2 });
    const [url, init] = fetchFalso.mock.calls[0] as LlamadaFetch;
    expect(url).toBe('http://api.test/api/db/import');
    const cuerpo = init.body as FormData;
    expect(cuerpo.get('tabla')).toBe('servicios');
    expect(cuerpo.get('modo')).toBe('append');
    expect(cuerpo.get('confirmacion')).toBe('IMPORTAR servicios');
    expect((cuerpo.get('archivo') as File).name).toBe('servicios.json');
  });
});

describe('Importar: la confirmación se escribe en el modal, como en el truncate', () => {
  it('para una tabla se escribe "IMPORTAR <tabla>"; para toda la base, "IMPORTAR TODAS"', () => {
    expect(confirmacionImportacionEscrita('servicios')).toBe('IMPORTAR servicios');
    expect(confirmacionImportacionEscrita('__todas__')).toBe('IMPORTAR TODAS');
  });

  it('si no coincide, el mensaje dice exactamente qué escribir (el mismo texto que pide el backend)', () => {
    expect(errorConfirmacionImportacion('servicios', '')).toBe('Escribe exactamente: IMPORTAR servicios');
    expect(errorConfirmacionImportacion('servicios', 'IMPORTAR productos')).toBe('Escribe exactamente: IMPORTAR servicios');
    expect(errorConfirmacionImportacion('__todas__', 'importar todas')).toBe('Escribe exactamente: IMPORTAR TODAS');
  });

  it('si coincide (sin espacios de sobra), no hay error', () => {
    expect(errorConfirmacionImportacion('servicios', '  IMPORTAR servicios ')).toBeNull();
    expect(errorConfirmacionImportacion('__todas__', 'IMPORTAR TODAS')).toBeNull();
  });
});

describe('Gestor de base de datos: se muestra el error del backend', () => {
  it('un 400 de validación muestra el texto del campo confirmacion, no el genérico', async () => {
    const texto = 'Confirmación requerida: escribe exactamente "TRUNCATE <tabla>" en el campo confirmacion';
    fetchQueResponde(400, {
      success: false,
      error: 'Errores de validación',
      message: 'Revisa los campos del formulario',
      errors: { confirmacion: texto },
    });
    const r = await truncarTabla('servicios', '', {});
    expect(r).toEqual({ success: false, error: texto });
  });

  it('un 400 por confirmación distinta muestra el mensaje del backend tal cual', async () => {
    const texto = 'Confirmación requerida: escribe exactamente "IMPORTAR servicios" en el campo confirmacion';
    fetchQueResponde(400, { success: false, error: texto, message: texto });
    const archivo = new File(['[]'], 'servicios.json', { type: 'application/json' });
    const r = await importarDatos('servicios', archivo, 'append', 'IMPORTAR productos');
    expect(r).toEqual({ success: false, error: texto });
  });

  it('un 403 por tabla bloqueada muestra el mensaje del backend', async () => {
    fetchQueResponde(403, { success: false, error: 'tabla bloqueada por seguridad', message: 'tabla bloqueada por seguridad' });
    const r = await truncarTabla('pagos', 'TRUNCATE pagos');
    expect(r).toEqual({ success: false, error: 'tabla bloqueada por seguridad' });
  });
});
