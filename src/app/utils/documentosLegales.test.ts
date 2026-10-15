import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOCUMENTOS_LEGALES, documentoLegal, leyendaVersion } from './documentosLegales';

/** Página de cada documento: src/app<ruta sin ancla>/page.tsx (anticipos comparte la de reembolsos). */
function archivoDePagina(ruta: string): string {
  return fileURLToPath(new URL(`..${ruta.split('#')[0]}/page.tsx`, import.meta.url));
}

/**
 * El registro de documentos legales es un contrato: las páginas legales muestran su versión y
 * vigencia desde aquí, y los consentimientos guardan qué versión aceptó la clienta. Esta prueba
 * fija la forma { slug, titulo, version, vigenteDesde, ruta } y los cinco slugs.
 */
describe('Registro de documentos legales', () => {
  it('tiene exactamente los 5 slugs acordados', () => {
    expect(DOCUMENTOS_LEGALES.map((d) => d.slug).sort()).toEqual(
      ['anticipos', 'aviso-privacidad', 'cookies', 'reembolsos', 'terminos'],
    );
  });

  it('cada entrada tiene título, versión X.Y, vigencia 2026-10-14 y ruta absoluta', () => {
    for (const d of DOCUMENTOS_LEGALES) {
      expect(d.titulo.trim().length, d.slug).toBeGreaterThan(0);
      expect(d.version, d.slug).toMatch(/^\d+\.\d+$/);
      expect(d.vigenteDesde, d.slug).toBe('2026-10-14');
      expect(d.ruta.startsWith('/'), d.slug).toBe(true);
    }
  });

  it('términos y aviso quedan en versión 2.0; cookies y reembolsos en 1.0', () => {
    expect(documentoLegal('terminos').version).toBe('2.0');
    expect(documentoLegal('aviso-privacidad').version).toBe('2.0');
    expect(documentoLegal('cookies').version).toBe('1.0');
    expect(documentoLegal('reembolsos').version).toBe('1.0');
  });

  it('cada documento apunta a su página', () => {
    expect(documentoLegal('terminos').ruta).toBe('/terminos-y-condiciones');
    expect(documentoLegal('aviso-privacidad').ruta).toBe('/aviso-de-privacidad');
    expect(documentoLegal('cookies').ruta).toBe('/politica-de-cookies');
    expect(documentoLegal('reembolsos').ruta).toBe('/politica-de-reembolsos');
  });

  it('anticipos apunta al ancla de reembolsos y comparte su versión', () => {
    const anticipos = documentoLegal('anticipos');
    expect(anticipos.ruta).toBe('/politica-de-reembolsos#anticipos');
    expect(anticipos.version).toBe(documentoLegal('reembolsos').version);
  });

  it('documentoLegal devuelve la misma entrada que el arreglo', () => {
    for (const d of DOCUMENTOS_LEGALES) expect(documentoLegal(d.slug)).toBe(d);
  });

  it('leyendaVersion arma el encabezado visible con la versión y la fecha en español', () => {
    expect(leyendaVersion('terminos')).toBe('Versión 2.0. Vigente desde el 14 de octubre de 2026.');
    expect(leyendaVersion('cookies')).toBe('Versión 1.0. Vigente desde el 14 de octubre de 2026.');
  });
});

/**
 * El hash amarra el texto publicado a su versión. Es el SHA-256 del texto visible de la página ya pintada, y
 * la prueba que lo recalcula y lo compara con este registro es "Hash del texto publicado", en
 * components/legal/paginasLegales.test.ts (ahí se pintan las páginas). Para publicar un cambio: sube la versión
 * aquí, corre node scripts/hash-documentos-legales.mjs, copia el hash nuevo y siembra esa versión en el backend
 * (versiones_documentos_legales es de solo inserción: va como fila nueva en una migración nueva).
 */
describe('Hash de los documentos legales', () => {
  it('cada entrada lleva un SHA-256 en hexadecimal (64 caracteres)', () => {
    for (const d of DOCUMENTOS_LEGALES) expect(d.hash, d.slug).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cada documento tiene su página (src/app<ruta sin ancla>/page.tsx), que es la que se pinta para el hash', () => {
    for (const d of DOCUMENTOS_LEGALES) expect(existsSync(archivoDePagina(d.ruta)), d.slug).toBe(true);
  });

  it('anticipos comparte el hash de reembolsos (vive en la misma página)', () => {
    expect(documentoLegal('anticipos').hash).toBe(documentoLegal('reembolsos').hash);
  });
});
