import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

const APP_DIR = join(__dirname, 'app');

/** Archivos page.tsx / layout.tsx de src/app. */
function archivosDeRuta(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) out.push(...archivosDeRuta(ruta));
    else if (nombre === 'page.tsx' || nombre === 'layout.tsx') out.push(ruta);
  }
  return out;
}

/** URL de cada page.tsx (sin grupos `(x)`; los segmentos dinámicos `[id]` con un valor de ejemplo). */
function urlsDePaginas(): string[] {
  return archivosDeRuta(APP_DIR)
    .filter((f) => f.endsWith(`${sep}page.tsx`))
    .map((f) => {
      const segmentos = relative(APP_DIR, join(f, '..'))
        .split(sep)
        .filter((s) => s && !/^\(.*\)$/.test(s))
        .map((s) => (/^\[.*\]$/.test(s) ? '1' : s));
      return `/${segmentos.join('/')}`;
    });
}

function scriptSrc(csp: string): string[] {
  const directiva = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('script-src '));
  return directiva ? directiva.split(/\s+/).slice(1) : [];
}

describe('CSP del proxy (antes middleware)', () => {
  const urls = urlsDePaginas();

  it('encuentra las páginas de la app', () => {
    expect(urls).toEqual(expect.arrayContaining(['/home', '/contacto', '/sobre-nosotros', '/terminos', '/login']));
  });

  it("ninguna página recibe 'unsafe-inline' en script-src: todas llevan nonce", () => {
    const conUnsafeInline: string[] = [];
    const sinNonce: string[] = [];
    for (const url of urls) {
      const csp = proxy(new NextRequest(`https://www.mirufranco.com${url}`)).headers.get('Content-Security-Policy') ?? '';
      const fuentes = scriptSrc(csp);
      if (fuentes.includes("'unsafe-inline'")) conUnsafeInline.push(url);
      if (!fuentes.some((f) => f.startsWith("'nonce-"))) sinNonce.push(url);
    }
    expect(conUnsafeInline).toEqual([]);
    expect(sinNonce).toEqual([]);
  });

  it("ninguna página se prerenderiza con force-static (su HTML no podría llevar el nonce)", () => {
    const estaticas = archivosDeRuta(APP_DIR)
      .filter((f) => /export const dynamic = ['"]force-static['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(APP_DIR, f));
    expect(estaticas).toEqual([]);
  });
});
