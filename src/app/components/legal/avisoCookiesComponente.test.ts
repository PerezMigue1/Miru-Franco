// AvisoCookies: el envoltorio, no solo BannerCookies (propuesta del verificador, integrada).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { documentoLegal } from '../../utils/documentosLegales';

const botones = vi.hoisted(() => new Map<string, () => void>());
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  // Sin DOM: se pinta con la lectura del cliente (localStorage) en vez de la del servidor.
  return { ...react, useSyncExternalStore: (_s: unknown, leer: () => boolean) => leer() };
});
vi.mock('../ui/Button', async () => {
  const { createElement: ce } = await vi.importActual<typeof import('react')>('react');
  return {
    default: (props: { children: ReactNode; onClick?: () => void }) => {
      botones.set(String(props.children).trim(), props.onClick ?? (() => undefined));
      return ce('button', null, props.children);
    },
  };
});

const { default: AvisoCookies } = await import('./AvisoCookies');
const { CLAVE_AVISO_COOKIES, reiniciarAvisoCookiesEnMemoria } = await import('./avisoCookiesEstado');
const fuente = readFileSync(join(__dirname, 'AvisoCookies.tsx'), 'utf8');

afterEach(() => {
  vi.unstubAllGlobals();
  reiniciarAvisoCookiesEnMemoria();
  botones.clear();
});

describe('AvisoCookies', () => {
  it('"Entendido" guarda la versión de la política en localStorage', () => {
    const almacen = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => almacen.get(k) ?? null,
      setItem: (k: string, v: string) => void almacen.set(k, v),
    });
    vi.stubGlobal('window', { dispatchEvent: () => true, addEventListener: () => undefined, removeEventListener: () => undefined });
    const html = renderToStaticMarkup(createElement(AvisoCookies));
    expect(html).toContain('Aviso de cookies');
    botones.get('Entendido')?.();
    expect(almacen.get(CLAVE_AVISO_COOKIES)).toBe(documentoLegal('cookies').version);
  });

  it('en el servidor se da por visto (no se pinta antes de leer la preferencia)', () => {
    expect(fuente).toContain('useSyncExternalStore(suscribir, avisoCookiesVisto, () => true)');
  });
});
