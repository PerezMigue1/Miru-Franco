import { formatearFechaSoloDia } from './fechaSoloDia';

/**
 * Registro de los documentos legales publicados. Las páginas legales muestran su versión y vigencia desde
 * aquí, y los consentimientos guardan qué versión aceptó la clienta: para publicar una versión nueva se
 * cambia aquí y todo lo demás la toma sola. La forma { slug, titulo, version, vigenteDesde, ruta, hash } es
 * un contrato con otras pantallas y con el backend (versiones_documentos_legales): no la cambies sin revisarlos.
 * Al cambiar el texto de una página legal (o un plazo, horario o teléfono que la página pinta): sube su versión,
 * corre node scripts/hash-documentos-legales.mjs y copia aquí el hash nuevo. La prueba "Hash del texto publicado"
 * de components/legal/paginasLegales.test.ts falla si el hash no coincide con el texto que la página muestra.
 * Las versiones publicadas desde Admin > Documentos legales viven en el backend (las páginas las muestran con
 * DocumentoVigente y services/documentosLegales.ts da su versión y hash): este registro es el respaldo cuando el
 * backend no responde y lo que siguen mandando hoy las casillas.
 */
export type SlugDocumentoLegal = 'terminos' | 'aviso-privacidad' | 'cookies' | 'reembolsos' | 'anticipos';

export interface DocumentoLegalRegistrado {
  slug: SlugDocumentoLegal;
  titulo: string;
  /** "X.Y". */
  version: string;
  /** Día de calendario YYYY-MM-DD desde el que rige esta versión. */
  vigenteDesde: string;
  /** Ruta absoluta de la página (puede llevar ancla). */
  ruta: string;
  /**
   * SHA-256 en hexadecimal (UTF-8) del texto visible de la página ya pintada (src/app<ruta sin ancla>/page.tsx con
   * renderToStaticMarkup, sin el Header ni el Footer): sin etiquetas, con las entidades decodificadas y con los
   * espacios y saltos de línea colapsados en uno solo. Cubre el texto que viene de otros módulos (plazos, horario,
   * Profeco). Lo calcula components/legal/paginasLegales.test.ts.
   */
  hash: string;
}

const VIGENTE_DESDE = '2026-10-14';
/** Cookies 1.1: agrega mf_registro_google (estrictamente necesaria, no se vuelve a pedir el aviso). */
const VIGENTE_DESDE_COOKIES = '2026-10-16';
const VERSION_REEMBOLSOS = '1.0';
/** Reembolsos y anticipos viven en la misma página: comparten versión y hash. */
const HASH_REEMBOLSOS = '33d032da7e2d870da8b370b0017ed4b78454964315ec355fe1b4f1d1ad892bf5';

export const DOCUMENTOS_LEGALES: readonly DocumentoLegalRegistrado[] = [
  {
    slug: 'terminos',
    titulo: 'Términos y Condiciones',
    version: '2.0',
    vigenteDesde: VIGENTE_DESDE,
    ruta: '/terminos-y-condiciones',
    hash: '6105ab7970cb21bbc1f8c629bd7da5a9952061cbc83741c5eced5ea68d1b4d69',
  },
  {
    slug: 'aviso-privacidad',
    titulo: 'Aviso de Privacidad',
    version: '2.0',
    vigenteDesde: VIGENTE_DESDE,
    ruta: '/aviso-de-privacidad',
    hash: 'fae1b55c1fc51ab41088fdfdf8bb1ab4a84ad7a9eeca1d050e88cb1d100ef1bd',
  },
  {
    slug: 'cookies',
    titulo: 'Política de Cookies',
    version: '1.1',
    vigenteDesde: VIGENTE_DESDE_COOKIES,
    ruta: '/politica-de-cookies',
    hash: '711f4ceff8d924f7af832522ff43fee726c13b64280ca53efa54b5270cea8607',
  },
  {
    slug: 'reembolsos',
    titulo: 'Política de Reembolsos, Cambios y Cancelaciones',
    version: VERSION_REEMBOLSOS,
    vigenteDesde: VIGENTE_DESDE,
    ruta: '/politica-de-reembolsos',
    hash: HASH_REEMBOLSOS,
  },
  {
    slug: 'anticipos',
    titulo: 'Política de Anticipos',
    version: VERSION_REEMBOLSOS,
    vigenteDesde: VIGENTE_DESDE,
    ruta: '/politica-de-reembolsos#anticipos',
    hash: HASH_REEMBOLSOS,
  },
];

export function documentoLegal(slug: SlugDocumentoLegal): DocumentoLegalRegistrado {
  const doc = DOCUMENTOS_LEGALES.find((d) => d.slug === slug);
  if (!doc) throw new Error(`Documento legal no registrado: ${slug}`);
  return doc;
}

/** "14 de octubre de 2026": la vigencia sin desfase por zona horaria. */
export function fechaVigenciaTexto(slug: SlugDocumentoLegal): string {
  const { vigenteDesde } = documentoLegal(slug);
  return formatearFechaSoloDia(vigenteDesde, { day: 'numeric', month: 'long', year: 'numeric' }) ?? vigenteDesde;
}

/** "Versión 2.0. Vigente desde el 14 de octubre de 2026.": el encabezado visible de cada página legal. */
export function leyendaVersion(slug: SlugDocumentoLegal): string {
  return `Versión ${documentoLegal(slug).version}. Vigente desde el ${fechaVigenciaTexto(slug)}.`;
}

/**
 * Texto visible de un html: sin etiquetas, con &quot; &#x27; &lt; &gt; y &amp; decodificados y con los espacios y
 * saltos colapsados en uno. Es la regla del hash de cada documento legal (la misma de la prueba "Hash del texto
 * publicado" y del backend, que la usa al publicar desde Admin > Documentos legales).
 */
export function textoVisibleDocumento(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** SHA-256 en hexadecimal (UTF-8) del texto visible. Con Web Crypto: sirve en el servidor y en el navegador. */
export async function hashTextoDocumento(html: string): Promise<string> {
  const datos = new TextEncoder().encode(textoVisibleDocumento(html));
  const resumen = await globalThis.crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, '0')).join('');
}
