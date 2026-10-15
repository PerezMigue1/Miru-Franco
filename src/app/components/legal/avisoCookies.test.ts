import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { documentoLegal } from '../../utils/documentosLegales';

const {
  CLAVE_AVISO_COOKIES,
  TEXTO_AVISO_COOKIES,
  avisoCookiesVisto,
  marcarAvisoCookiesVisto,
  reiniciarAvisoCookiesEnMemoria,
} = await import('./avisoCookiesEstado');
const { BannerCookies } = await import('./AvisoCookies');

const almacenFalso = () => {
  const almacen = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
  return almacen;
};

afterEach(() => {
  vi.unstubAllGlobals();
  reiniciarAvisoCookiesEnMemoria();
});

describe('Aviso de cookies informativo (estado)', () => {
  it('el texto dice que solo hay almacenamiento necesario, sin publicidad ni analítica', () => {
    expect(TEXTO_AVISO_COOKIES).toBe(
      'Usamos solo cookies y almacenamiento necesarios para tu sesión, tu carrito y tus preferencias. No usamos cookies de publicidad ni analítica.',
    );
  });

  it('sin preferencia guardada se muestra; "Entendido" lo guarda con la versión de la política', () => {
    const almacen = almacenFalso();
    expect(avisoCookiesVisto()).toBe(false);
    marcarAvisoCookiesVisto();
    expect(avisoCookiesVisto()).toBe(true);
    expect(almacen.get(CLAVE_AVISO_COOKIES)).toBe(documentoLegal('cookies').version);
  });

  it('si la política cambia de versión, se vuelve a mostrar', () => {
    const almacen = almacenFalso();
    almacen.set(CLAVE_AVISO_COOKIES, '0.9');
    expect(avisoCookiesVisto()).toBe(false);
  });

  it('sin localStorage (modo privado) no truena y "Entendido" lo oculta en esta carga', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(avisoCookiesVisto()).toBe(false);
    expect(() => marcarAvisoCookiesVisto()).not.toThrow();
    expect(avisoCookiesVisto()).toBe(true);
  });
});

describe('BannerCookies', () => {
  const html = renderToStaticMarkup(createElement(BannerCookies, { onEntendido: () => undefined }));

  it('es una región con nombre accesible, no un diálogo: no bloquea la página', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="Aviso de cookies"|aria-label="Aviso de cookies"[^>]*role="region"/);
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('aria-modal');
    expect(html).not.toContain('mf-velo');
  });

  it('enlaza la Política de cookies y tiene un solo botón "Entendido" de 44 px', () => {
    expect(html).toContain(`href="${documentoLegal('cookies').ruta}"`);
    expect(html).toContain('Política de cookies');
    const botones = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
    expect(botones).toHaveLength(1);
    expect(botones[0]).toContain('Entendido');
    expect(botones[0]).toContain('min-h-11');
    expect(html).not.toMatch(/Aceptar|Rechazar/);
  });

  it('el layout raíz lo monta en todo el sitio', () => {
    const layout = readFileSync(join(__dirname, '..', '..', 'layout.tsx'), 'utf8');
    expect(layout).toContain('<AvisoCookies />');
  });

  it('en móvil es una sola línea compacta: el enlace dice que solo hay cookies necesarias y lleva a la política', () => {
    const region = html.match(/<div[^>]*role="region"[^>]*>/)?.[0] ?? '';
    expect(region).toMatch(/class="[^"]*\bflex items-center\b[^"]*\bsm:block\b/);
    const enlace = html.match(/<a[^>]*href="\/politica-de-cookies"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(enlace).toMatch(/<span class="sm:hidden">Usamos solo cookies necesarias<span class="sr-only">\. Política de cookies<\/span><\/span>/);
    expect(enlace).toMatch(/<span class="hidden sm:inline">Política de cookies<\/span>/);
    // El texto completo solo desde sm (en móvil ocupaba cerca de una cuarta parte de la pantalla).
    expect(html).toMatch(new RegExp(`<p class="hidden sm:block[^"]*">${TEXTO_AVISO_COOKIES}</p>`));
  });

  it('en escritorio va abajo a la izquierda: en /login no tapa "Regístrate" (el formulario está a la derecha)', () => {
    const region = html.match(/<div[^>]*role="region"[^>]*>/)?.[0] ?? '';
    expect(region).toContain('sm:left-6');
    expect(region).not.toContain('sm:right-6');
  });
});

describe('Posición del aviso en las pantallas de acceso (revisión visual pública H1 y H5)', () => {
  it('posicionAvisoCookies: /register a la derecha (su formulario está a la izquierda); /login a la izquierda', async () => {
    const { posicionAvisoCookies } = await import('./AvisoCookies');
    expect(posicionAvisoCookies('/register')).toEqual({ lado: 'derecha', enFlujoEnMovil: true });
    expect(posicionAvisoCookies('/login')).toEqual({ lado: 'izquierda', enFlujoEnMovil: true });
    expect(posicionAvisoCookies('/')).toEqual({ lado: 'izquierda', enFlujoEnMovil: false });
    expect(posicionAvisoCookies(null)).toEqual({ lado: 'izquierda', enFlujoEnMovil: false });
  });

  it('a la derecha desde sm cuando lado es derecha', () => {
    const region = renderToStaticMarkup(createElement(BannerCookies, { onEntendido: () => undefined, lado: 'derecha' })).match(/<div[^>]*role="region"[^>]*>/)?.[0] ?? '';
    expect(region).toContain('sm:right-6');
    expect(region).not.toContain('sm:left-6');
  });

  it('en móvil, en las pantallas de acceso, va en el flujo al final (no fijo): no tapa "Regístrate" a 375 px', () => {
    const region = renderToStaticMarkup(createElement(BannerCookies, { onEntendido: () => undefined, enFlujoEnMovil: true })).match(/<div[^>]*role="region"[^>]*>/)?.[0] ?? '';
    expect(region).toContain('max-sm:static');
    expect(region).toContain('sm:fixed');
  });
});
