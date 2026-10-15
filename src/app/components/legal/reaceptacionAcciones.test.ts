// Acciones del diálogo de re-aceptación (propuesta del verificador, integrada y ampliada).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PENDIENTES = [
  { tipo: 'terminos', documentoSlug: 'terminos', version: '2.0', hash: 'a'.repeat(64), vigenteDesde: '2026-10-14', versionAceptada: '1.0' },
];
const forzar = vi.hoisted(() => ({
  paso: null as string | null,
  ruta: '/home',
  rechazo: null as unknown,
  rechazoInicial: null as unknown,
}));
const botones = vi.hoisted(() => new Map<string, () => void>());
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) => {
      if (Array.isArray(inicial) && inicial.length === 0) return react.useState(PENDIENTES);
      if (forzar.paso && inicial === 'aceptar') return react.useState(forzar.paso);
      if (forzar.rechazo && inicial === forzar.rechazoInicial) return react.useState(forzar.rechazo);
      return react.useState(inicial);
    },
  };
});
// Botón que guarda su onClick por texto, para "pulsarlo" sin DOM.
vi.mock('../ui/Button', async () => {
  const { createElement: ce } = await vi.importActual<typeof import('react')>('react');
  return {
    default: (props: { children: ReactNode; onClick?: () => void }) => {
      botones.set(String(props.children), props.onClick ?? (() => undefined));
      return ce('button', null, props.children);
    },
  };
});
const { get, post, logout, push } = vi.hoisted(() => ({
  get: vi.fn(async (_ruta: string, _op?: unknown) => ({ success: true, data: [] as unknown[] })),
  post: vi.fn(async (_ruta: string, _cuerpo: unknown, _op?: unknown) => ({ success: true, data: { folio: 'ARCO-2026-000012' } })),
  logout: vi.fn(async () => ({ success: true })),
  push: vi.fn(),
}));
vi.mock('../../services/client', () => ({ apiClient: { get, post } }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));
vi.mock('../../services/auth', () => ({ api: { logout } }));
vi.mock('../../utils/security', () => ({ hasSession: () => true, clearAuthData: vi.fn() }));
vi.mock('../../utils/toast', () => ({ showToast: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => forzar.ruta, useRouter: () => ({ push, replace: () => undefined }) }));

const { default: ReaceptacionDocumentos } = await import('./ReaceptacionDocumentos');
const { RECHAZO_INICIAL } = await import('./reaceptacion');
forzar.rechazoInicial = RECHAZO_INICIAL;
const fuente = readFileSync(join(__dirname, 'ReaceptacionDocumentos.tsx'), 'utf8');
const esperar = () => new Promise((r) => setTimeout(r, 0));
const pulsar = async (texto: string) => {
  const fn = botones.get(texto);
  if (!fn) throw new Error(`No se pintó el botón "${texto}"`);
  fn();
  await esperar();
};
const pintar = () => renderToStaticMarkup(createElement(ReaceptacionDocumentos));

beforeEach(() => {
  botones.clear();
  vi.stubGlobal('document', { getElementById: () => ({ focus: () => undefined }) });
});
afterEach(() => {
  vi.unstubAllGlobals();
  forzar.paso = null;
  forzar.ruta = '/home';
  forzar.rechazo = null;
  get.mockClear();
  post.mockClear();
  logout.mockClear();
  push.mockClear();
});

describe('Re-aceptación: acciones', () => {
  it('"Aceptar y continuar" sin marcar la casilla no registra nada', async () => {
    pintar();
    await pulsar('Aceptar y continuar');
    expect(post).not.toHaveBeenCalled();
  });

  it('"Cerrar sesión" cierra la sesión de verdad y lleva a /login', async () => {
    forzar.paso = 'rechazo';
    pintar();
    await pulsar('Cerrar sesión');
    expect(logout).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('"Solicitar la cancelación" sin marcar "entiendo" no envía nada ni cierra la sesión', async () => {
    forzar.paso = 'rechazo';
    pintar();
    await pulsar('Solicitar la cancelación de mi cuenta');
    expect(post).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it('"Solicitar la cancelación" con "entiendo" revisa las abiertas, envía la solicitud ARCO y además cierra la sesión', async () => {
    forzar.paso = 'rechazo';
    forzar.rechazo = { entendido: true, errorCasilla: null, abierta: null };
    pintar();
    await pulsar('Solicitar la cancelación de mi cuenta');
    expect(get.mock.calls.map((c) => c[0])).toContain('/api/arco/mias');
    expect(post.mock.calls[0][0]).toBe('/api/arco/solicitudes');
    expect(logout).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('con una cancelación ya abierta no se puede pedir otra', () => {
    forzar.paso = 'rechazo';
    forzar.rechazo = { entendido: false, errorCasilla: null, abierta: { folio: 'ARCO-2026-000007', venceRespuesta: '2026-11-11T06:00:00.000Z' } };
    const html = pintar();
    expect(html).toContain('ARCO-2026-000007');
    expect(botones.has('Solicitar la cancelación de mi cuenta')).toBe(false);
  });

  it('no se pinta sobre una página legal (para poder leerla) y vuelve a salir en cualquier otra ruta', () => {
    forzar.ruta = '/terminos-y-condiciones';
    expect(pintar()).toBe('');
    forzar.ruta = '/aviso-de-privacidad';
    expect(pintar()).toBe('');
    forzar.ruta = '/cliente/tienda-online';
    expect(pintar()).toContain('role="dialog"');
  });

  it('"No acepto" pasa al paso de salida (no cierra el diálogo) y Escape no hace nada', () => {
    expect(fuente).toMatch(/onNoAcepto=\{\(\) => \{\s*setError\(null\);\s*setPaso\('rechazo'\);\s*\}\}/);
    expect(fuente).toMatch(/if \(e\.key === 'Escape'\) \{\s*(\/\/[^\n]*\n\s*)?e\.preventDefault\(\);\s*return;\s*\}/);
  });
});
