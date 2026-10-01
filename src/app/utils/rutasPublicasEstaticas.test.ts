import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RUTAS_PUBLICAS_ESTATICAS } from './rutasPublicasEstaticas';

const APP_DIR = join(__dirname, '..');

/** Rutas cuyo page.tsx o layout.tsx exporta `dynamic = 'force-static'`. */
function rutasForceStatic(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      out.push(...rutasForceStatic(ruta));
      continue;
    }
    if (nombre !== 'page.tsx' && nombre !== 'layout.tsx') continue;
    if (!/export const dynamic = ['"]force-static['"]/.test(readFileSync(ruta, 'utf8'))) continue;
    const segmentos = relative(APP_DIR, dir)
      .split(sep)
      .filter((s) => s && !/^\(.*\)$/.test(s)); // los grupos (x) no forman parte de la URL
    out.push(`/${segmentos.join('/')}`);
  }
  return out;
}

describe('RUTAS_PUBLICAS_ESTATICAS', () => {
  it('coincide con las páginas que se prerenderizan con force-static', () => {
    expect(rutasForceStatic(APP_DIR).sort()).toEqual([...RUTAS_PUBLICAS_ESTATICAS].sort());
  });
});
