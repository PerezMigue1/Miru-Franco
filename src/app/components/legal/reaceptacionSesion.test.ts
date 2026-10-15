// Cuándo consulta ReaceptacionDocumentos los documentos pendientes (propuesta del verificador, integrada).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Sin DOM: el efecto se corre al pintar para poder observar cuándo consulta.
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react, useEffect: (fn: () => void) => void fn() };
});

const estado = vi.hoisted(() => ({ sesion: false, oyentes: [] as Array<() => void> }));
const { get, post } = vi.hoisted(() => ({
  get: vi.fn(async (_ruta: string, _opciones?: unknown) => ({ success: true, data: [] as unknown[] })),
  post: vi.fn(async () => ({ success: true, data: [] })),
}));
vi.mock('../../services/client', () => ({ apiClient: { get, post } }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));
vi.mock('../../services/auth', () => ({ api: { logout: vi.fn(async () => ({ success: true })) } }));
vi.mock('../../utils/security', () => ({ hasSession: () => estado.sesion, clearAuthData: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/home', useRouter: () => ({ push: () => undefined, replace: () => undefined }) }));

const { default: ReaceptacionDocumentos } = await import('./ReaceptacionDocumentos');

const esperar = () => new Promise((r) => setTimeout(r, 0));
const avisarCambioDeSesion = async () => {
  for (const fn of estado.oyentes) fn();
  await esperar();
};
const consultasDePendientes = () => get.mock.calls.filter((c) => c[0] === '/api/consentimientos/pendientes').length;

beforeEach(() => {
  estado.oyentes = [];
  vi.stubGlobal('window', {
    addEventListener: (_tipo: string, fn: () => void) => void estado.oyentes.push(fn),
    removeEventListener: () => undefined,
    location: { pathname: '/home' },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  get.mockClear();
});

describe('ReaceptacionDocumentos: cuándo consulta los pendientes', () => {
  it('sin sesión no consulta', async () => {
    estado.sesion = false;
    renderToStaticMarkup(createElement(ReaceptacionDocumentos));
    await avisarCambioDeSesion();
    expect(get).not.toHaveBeenCalled();
  });

  it('con sesión consulta una sola vez por carga aunque lleguen avisos de cambio de usuario', async () => {
    estado.sesion = true;
    renderToStaticMarkup(createElement(ReaceptacionDocumentos));
    await esperar();
    await avisarCambioDeSesion();
    await avisarCambioDeSesion();
    expect(consultasDePendientes()).toBe(1);
    expect(get.mock.calls[0][0]).toBe('/api/consentimientos/pendientes');
  });

  it('si cierra sesión y vuelve a entrar sin recargar (login con correo usa router.push), consulta otra vez', async () => {
    estado.sesion = true;
    renderToStaticMarkup(createElement(ReaceptacionDocumentos));
    await esperar();
    estado.sesion = false; // "No acepto" > Cerrar sesión, o logout del menú (router.push, sin recarga)
    await avisarCambioDeSesion();
    estado.sesion = true; // vuelve a entrar con correo y contraseña (router.push, sin recarga)
    await avisarCambioDeSesion();
    expect(consultasDePendientes()).toBe(2);
  });

  it('si entra otra cuenta en la misma pestaña (sin recargar), consulta los pendientes de esa cuenta', async () => {
    const almacen = new Map<string, string>([['user', JSON.stringify({ id: 'u-ana' })]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => almacen.get(k) ?? null });
    estado.sesion = true;
    renderToStaticMarkup(createElement(ReaceptacionDocumentos));
    await esperar();
    almacen.set('user', JSON.stringify({ id: 'u-bety' }));
    await avisarCambioDeSesion();
    await avisarCambioDeSesion();
    expect(consultasDePendientes()).toBe(2);
  });

  it('la consulta de fondo no manda al login si la sesión venció (skip401Redirect)', async () => {
    estado.sesion = true;
    renderToStaticMarkup(createElement(ReaceptacionDocumentos));
    await esperar();
    expect(get.mock.calls[0][1]).toMatchObject({ skip401Redirect: true });
  });

  it('también revisa la sesión al cambiar de ruta (el logout del menú navega sin avisar)', () => {
    const fuente = readFileSync(join(__dirname, 'ReaceptacionDocumentos.tsx'), 'utf8');
    expect(fuente).toMatch(/window\.removeEventListener\(MIRU_USER_STORAGE_UPDATED, consultar\);\s*\}, \[pathname\]\);/);
  });
});
