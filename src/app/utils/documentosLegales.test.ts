import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOCUMENTOS_LEGALES, documentoLegal, hashTextoDocumento, leyendaVersion, textoVisibleDocumento } from './documentosLegales';

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

  it('cada entrada tiene título, versión X.Y, vigencia (cookies 1.1 desde el 16, los demás desde el 14 de octubre) y ruta absoluta', () => {
    for (const d of DOCUMENTOS_LEGALES) {
      expect(d.titulo.trim().length, d.slug).toBeGreaterThan(0);
      expect(d.version, d.slug).toMatch(/^\d+\.\d+$/);
      expect(d.vigenteDesde, d.slug).toBe(d.slug === 'cookies' ? '2026-10-16' : '2026-10-14');
      expect(d.ruta.startsWith('/'), d.slug).toBe(true);
    }
  });

  it('términos y aviso quedan en versión 2.0; cookies en 1.1 (agrega mf_registro_google); reembolsos en 1.0', () => {
    expect(documentoLegal('terminos').version).toBe('2.0');
    expect(documentoLegal('aviso-privacidad').version).toBe('2.0');
    expect(documentoLegal('cookies').version).toBe('1.1');
    expect(documentoLegal('cookies').vigenteDesde).toBe('2026-10-16');
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
    expect(leyendaVersion('cookies')).toBe('Versión 1.1. Vigente desde el 16 de octubre de 2026.');
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

/**
 * La misma regla del texto visible que usan la prueba "Hash del texto publicado" (components/legal/paginasLegales.test.ts)
 * y el backend (backend-miru documentos-legales/html-seguro.ts, con estos mismos casos en html-seguro.spec.ts). La web
 * la usa para comprobar que el html que manda el backend da el hash publicado antes de mostrarlo.
 */
describe('Texto visible y hash de un html publicado', () => {
  it('quita etiquetas, decodifica las entidades de React y colapsa espacios y saltos', async () => {
    const a = textoVisibleDocumento('<p class="x">Hola,\r\n   <strong>mundo</strong> &amp; más</p>');
    const b = textoVisibleDocumento('<div><span>Hola,</span> <em>mundo</em>\n&amp; más</div>');
    expect(a).toBe('Hola, mundo & más');
    expect(await hashTextoDocumento('<p class="x">Hola,\r\n   <strong>mundo</strong> &amp; más</p>')).toBe(await hashTextoDocumento('<div><span>Hola,</span> <em>mundo</em>\n&amp; más</div>'));
    expect(b).toBe(a);
  });

  it('decodifica &quot; &#x27; &lt; &gt; y &amp; en ese orden y no separa elementos pegados', () => {
    expect(textoVisibleDocumento('<p>&quot;listo&quot; y &#x27;ya&#x27; &lt;b&gt; &amp;amp;</p>')).toBe(`"listo" y 'ya' <b> &amp;`);
    expect(textoVisibleDocumento('<ol><li>a.</li><li>b</li></ol>')).toBe('a.b');
  });

  it('el hash es el SHA-256 hexadecimal en UTF-8 del texto (mismo valor que el backend)', async () => {
    expect(await hashTextoDocumento('<p> abc </p>')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
