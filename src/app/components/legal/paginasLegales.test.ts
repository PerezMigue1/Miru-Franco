import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  DOCUMENTOS_LEGALES,
  documentoLegal,
  fechaVigenciaTexto,
  leyendaVersion,
  type SlugDocumentoLegal,
} from '../../utils/documentosLegales';
import { PLAZOS_TERMINOS } from '../../utils/terminosCondiciones';
import { HORARIO_SALON } from '../../utils/contactoSalon';
import { PROFECO } from './Profeco';

// El armazón de las páginas pinta el Header y el Footer (con sesión, menú y servicios): aquí solo importa el texto.
vi.mock('../../layouts/Header', () => ({ default: () => null }));
vi.mock('../../layouts/Footer', () => ({ default: () => null }));
vi.mock('../../services/productos', () => ({ getProductosSinRedirigir: async () => ({ data: [], error: null }) }));
vi.mock('../../services/servicios', () => ({ getServicios: async () => ({ data: [], error: null }) }));

const RAIZ_APP = join(__dirname, '..', '..');

/**
 * Texto visible de la página: sin etiquetas, con las entidades que escribe React decodificadas y con los
 * espacios y saltos de línea colapsados en un solo espacio. Es la base del hash de cada documento legal.
 */
function texto(html: string): string {
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

/** SHA-256 en hexadecimal del texto visible (UTF-8). */
function hashTexto(t: string): string {
  return createHash('sha256').update(t, 'utf8').digest('hex');
}

/** Archivos .ts y .tsx de la app, sin las pruebas. */
function archivosFuente(dir: string, extensiones = /\.tsx?$/): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return archivosFuente(ruta, extensiones);
    return extensiones.test(n) && !/\.test\.ts$/.test(n) ? [ruta] : [];
  });
}

const rutaRelativa = (ruta: string) => relative(RAIZ_APP, ruta).split(sep).join('/');

/**
 * La regla de anticipos del backend (politicaCancelacionAnticipo en backend-miru anticipos.util.ts): los 10 días
 * hábiles se cuentan desde el pago del anticipo. La casilla (TEXTO_POLITICA_ANTICIPOS) dice lo mismo.
 */
const REGLA_ANTICIPO_REEMBOLSABLE =
  'al pagar tu anticipo faltan más de 10 días hábiles para tu cita, puedes cancelarla dentro de los 5 días hábiles siguientes a tu pago y te devolvemos el anticipo completo';

const PAGINAS: { slug: SlugDocumentoLegal; carpeta: string }[] = [
  { slug: 'terminos', carpeta: 'terminos-y-condiciones' },
  { slug: 'aviso-privacidad', carpeta: 'aviso-de-privacidad' },
  { slug: 'cookies', carpeta: 'politica-de-cookies' },
  { slug: 'reembolsos', carpeta: 'politica-de-reembolsos' },
];

// Las páginas se importan al cargar el archivo (await de nivel superior) y no dentro de cada prueba: la
// compilación en frío de una página pesada no debe contar contra el límite de 5 s de un it con la suite cargada.
const MODULOS: Record<string, { default: ComponentType }> = {
  'terminos-y-condiciones': await import('../../terminos-y-condiciones/page'),
  'aviso-de-privacidad': await import('../../aviso-de-privacidad/page'),
  'politica-de-cookies': await import('../../politica-de-cookies/page'),
  'politica-de-reembolsos': await import('../../politica-de-reembolsos/page'),
};

async function pintar(carpeta: string): Promise<string> {
  const modulo = MODULOS[carpeta];
  if (!modulo) throw new Error(`Página legal no cargada en la prueba: ${carpeta}`);
  return renderToStaticMarkup(createElement(modulo.default));
}

/** Carpeta de la página de un documento del registro: su ruta sin "/" ni ancla (anticipos usa la de reembolsos). */
const carpetaDe = (ruta: string) => ruta.split('#')[0].replace(/^\//, '');

/** Hash del texto visible de la página ya pintada: la regla del hash de cada documento legal. */
async function hashDePagina(ruta: string): Promise<string> {
  return hashTexto(texto(await pintar(carpetaDe(ruta))));
}

const fuente = (carpeta: string) => readFileSync(join(RAIZ_APP, carpeta, 'page.tsx'), 'utf8');

describe('Páginas legales: versión y vigencia desde el registro', () => {
  it.each(PAGINAS)('$carpeta muestra "Versión X. Vigente desde el …" con su fecha del registro', async ({ slug, carpeta }) => {
    const html = await pintar(carpeta);
    expect(texto(html)).toContain(leyendaVersion(slug));
    expect(html).toContain(`dateTime="${documentoLegal(slug).vigenteDesde}"`);
  });

  it.each(PAGINAS)('$carpeta no escribe la versión a mano: la lee del registro', ({ slug, carpeta }) => {
    const src = fuente(carpeta);
    expect(src).toContain(`<EncabezadoVersion slug="${slug}" />`);
    expect(src).not.toMatch(/Versión \d/);
  });

  it.each(PAGINAS)('$carpeta muestra la fecha una sola vez: solo el encabezado de versión, sin "Última actualización"', async ({ slug, carpeta }) => {
    const t = texto(await pintar(carpeta));
    expect(t).not.toContain('Última actualización');
    expect(t.split(fechaVigenciaTexto(slug)).length - 1).toBe(1);
  });
});

/**
 * El hash amarra el texto publicado a su versión. Es el SHA-256 del texto visible de la página ya pintada
 * (con los plazos de PLAZOS_TERMINOS, el horario del salón, los teléfonos de Profeco y todo lo que la página
 * importe), no del archivo page.tsx: un cambio de texto en cualquier módulo cambia el hash y un cambio solo de
 * clases o etiquetas no. Si esta prueba falla, el texto cambió: sube la versión del documento, corre
 * node scripts/hash-documentos-legales.mjs, copia el hash nuevo al registro y siembra esa versión en el backend.
 * Con HASH_DOCUMENTOS_LEGALES_SALIDA=<archivo>, la prueba escribe ahí los hashes calculados (lo usa el script).
 */
describe('Hash del texto publicado', () => {
  it('el hash registrado de cada documento es el SHA-256 del texto visible de su página pintada', async () => {
    const calculados = [];
    for (const d of DOCUMENTOS_LEGALES) {
      const t = texto(await pintar(carpetaDe(d.ruta)));
      calculados.push({ slug: d.slug, version: d.version, ruta: d.ruta, hash: hashTexto(t), registrado: d.hash, texto: t });
    }
    const salida = process.env.HASH_DOCUMENTOS_LEGALES_SALIDA;
    if (salida) writeFileSync(salida, JSON.stringify(calculados, null, 2));
    for (const c of calculados) {
      expect(
        c.registrado,
        `El texto de "${c.slug}" cambió: sube su versión, corre node scripts/hash-documentos-legales.mjs y actualiza el hash`,
      ).toBe(c.hash);
    }
  });

  /** Cambia una propiedad de un módulo de texto mientras corre `fn` y la restaura (son objetos normales en ejecución). */
  async function conCambio(obj: object, clave: PropertyKey, nuevo: (antes: unknown) => unknown, fn: () => Promise<void>) {
    const antes: unknown = Reflect.get(obj, clave);
    Reflect.set(obj, clave, nuevo(antes));
    try {
      await fn();
    } finally {
      Reflect.set(obj, clave, antes);
    }
  }

  const masUno = (v: unknown) => Number(v) + 1;
  const otroTexto = (v: unknown) => `${String(v)} 9`;
  const CAMBIOS: { que: string; slug: SlugDocumentoLegal; obj: object; clave: PropertyKey; nuevo: (antes: unknown) => unknown }[] = [
    { que: 'un plazo (PLAZOS_TERMINOS)', slug: 'terminos', obj: PLAZOS_TERMINOS, clave: 'diasCambioProducto', nuevo: masUno },
    { que: 'un plazo (PLAZOS_TERMINOS)', slug: 'reembolsos', obj: PLAZOS_TERMINOS, clave: 'diasApartadoListo', nuevo: masUno },
    { que: 'el horario del salón (HORARIO_SALON)', slug: 'terminos', obj: HORARIO_SALON.frases, clave: 0, nuevo: otroTexto },
    { que: 'un teléfono de Profeco (PROFECO)', slug: 'terminos', obj: PROFECO.telefonoCdmx, clave: 'visible', nuevo: otroTexto },
    { que: 'un teléfono de Profeco (PROFECO)', slug: 'reembolsos', obj: PROFECO.telefonoPais, clave: 'visible', nuevo: otroTexto },
  ];

  it.each(CAMBIOS)('$slug: cambiar $que cambia el hash aunque page.tsx no cambie', async ({ slug, obj, clave, nuevo }) => {
    const { ruta } = documentoLegal(slug);
    const antes = await hashDePagina(ruta);
    await conCambio(obj, clave, nuevo, async () => {
      expect(await hashDePagina(ruta)).not.toBe(antes);
    });
    expect(await hashDePagina(ruta)).toBe(antes);
  });

  it('cambiar solo etiquetas, clases o saltos de línea no cambia el hash', () => {
    const a = texto('<p class="x">Hola,\r\n   <strong>mundo</strong> &amp; más</p>');
    const b = texto('<div><span>Hola,</span> <em>mundo</em>\n&amp; más</div>');
    expect(a).toBe('Hola, mundo & más');
    expect(hashTexto(a)).toBe(hashTexto(b));
  });

  it('cada documento del registro apunta a una página que esta prueba pinta', () => {
    for (const d of DOCUMENTOS_LEGALES) expect(Object.keys(MODULOS), d.slug).toContain(carpetaDe(d.ruta));
  });
});

describe('Términos y Condiciones 2.0', () => {
  it('revocación del artículo 56: 5 días hábiles desde la entrega en el salón, sin dar razones y con reintegro total', async () => {
    const t = texto(await pintar('terminos-y-condiciones'));
    expect(t).toContain('artículo 56 de la Ley Federal de Protección al Consumidor');
    expect(t).toContain('5 días hábiles');
    expect(t).toContain('sin dar razones');
    expect(t).toContain('reintegramos el total que pagaste');
    expect(t).toContain('beneficio adicional');
  });

  it('el reembolso no queda limitado a una lista cerrada y la cancelación del anticipo sigue la política de anticipos', async () => {
    const html = await pintar('terminos-y-condiciones');
    const t = texto(html);
    expect(t).not.toContain('Sí hay reembolso en estos casos');
    expect(t).not.toContain('si cancelas una cita con el anticipo pagado, el anticipo no se devuelve.');
    expect(t).toContain('10 días hábiles');
    expect(html).toContain('href="/politica-de-reembolsos"');
    expect(html).toContain('href="/politica-de-reembolsos#anticipos"');
  });

  it('datos del proveedor, pago con Mercado Pago o en el salón y entrega en el salón', async () => {
    const t = texto(await pintar('terminos-y-condiciones'));
    expect(t).toContain('Mildred Rubí Franco Martínez');
    expect(t).toContain('Mirú Franco Salón Beauty');
    expect(t).toContain('Segunda Cerrada de Allende No. 15');
    expect(t).toContain('Mercado Pago');
    expect(t).toContain('Todos los pedidos se entregan en el salón');
    expect(t).toContain('precios son totales');
  });

  it('bloque de Profeco en quejas', async () => {
    const html = await pintar('terminos-y-condiciones');
    const t = texto(html);
    expect(t).toContain('Teléfono del Consumidor 55 5568 8722 (CDMX y zona metropolitana) y 800 468 8722 (resto del país)');
    expect(html).toContain('href="https://www.gob.mx/profeco"');
  });

  it('datos personales: remite al Aviso para los usos y no los limita a cuenta, pedidos y citas', async () => {
    const html = await pintar('terminos-y-condiciones');
    const t = texto(html);
    expect(t).not.toContain('Solo los usamos para gestionar tu cuenta');
    expect(t).toContain('Ahí te explicamos qué datos recabamos, para qué los usamos');
    expect(html).toContain('href="/aviso-de-privacidad"');
  });

  it('cancelar con anticipo: los 10 días hábiles se cuentan desde el pago del anticipo, como en el backend', async () => {
    const t = texto(await pintar('terminos-y-condiciones'));
    expect(t).toContain(REGLA_ANTICIPO_REEMBOLSABLE);
    expect(t).toContain('Si faltan 10 días hábiles o menos, al cancelar el anticipo no se devuelve');
    expect(t).not.toContain('agendaste');
  });

  it('no dice que no guarda ningún dato de la tarjeta: solo que no recibe el número completo ni el código', async () => {
    const t = texto(await pintar('terminos-y-condiciones'));
    expect(t).not.toContain('no recibe ni guarda los datos de tu tarjeta');
    expect(t).toContain('no recibe ni guarda el número completo ni el código de seguridad de tu tarjeta');
  });
});

describe('Aviso de Privacidad 2.0', () => {
  it('ley de 2025 y la Secretaría Anticorrupción y Buen Gobierno con el plazo de 15 días', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain('Diario Oficial de la Federación el 20 de marzo de 2025');
    expect(t).toContain('Secretaría Anticorrupción y Buen Gobierno');
    expect(t).toContain('dentro de los 15 días siguientes');
  });

  it('persona designada de datos personales con el correo de privacidad', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain('Persona designada de datos personales: Mildred Rubí Franco Martínez');
    expect(t).toContain('mildredfranco24@gmail.com');
  });

  it('plazos ARCO en días hábiles, ampliables una sola vez, gratuitos, y revocación por el mismo canal', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain('20 días (hábiles, conforme a la ley del procedimiento administrativo)');
    expect(t).toContain('15 días siguientes');
    expect(t).toContain('una sola vez por un periodo igual');
    expect(t).toContain('es gratuito');
    expect(t).toContain('Para revocar tu consentimiento');
    expect(t).not.toContain('20 días hábiles');
  });

  it('conservación fiscal y enlace a la política de cookies', async () => {
    const html = await pintar('aviso-de-privacidad');
    expect(texto(html)).toContain('al menos 5 años (artículo 30 del Código Fiscal de la Federación)');
    expect(html).toContain('href="/politica-de-cookies"');
  });

  it('promociones: nombra el control real del perfil', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain('desactiva «Recibir promociones» en «Mis datos y privacidad» de tu perfil');
    expect(t).not.toContain('desactiva "Recibir promociones" en tu perfil');
  });

  it('derechos ARCO y revocación también desde «Mis datos y privacidad», además del correo', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain(
      'desde «Mis datos y privacidad» en tu perfil: ahí puedes descargar tus datos, pedir una rectificación o la cancelación de tu cuenta y revocar tus consentimientos',
    );
    expect(t).toContain('Si prefieres el correo, escribe a mildredfranco24@gmail.com con:');
    expect(t).toMatch(/Para revocar tu consentimiento[^.]*«Mis datos y privacidad»[^.]*mildredfranco24@gmail\.com/);
  });

  it('la fecha de nacimiento y el perfil capilar son opcionales', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain('La fecha de nacimiento es opcional');
    expect(t).toContain('Perfil capilar (opcional):');
    expect(t).not.toContain('teléfono, fecha de nacimiento y foto de perfil');
  });

  it('dice qué borramos y qué conservamos al cancelar tu cuenta, igual que el backend', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).toContain(
      'borramos o anonimizamos tus datos de identificación y contacto, tus datos de salud y de tu cabello, tus direcciones, tus tarjetas guardadas, las notas sobre ti en pedidos, cotizaciones, ventas y seguimientos, y tus sesiones y avisos; conservamos, ya sin tu nombre, lo que la ley nos obliga a guardar (pedidos, pagos, facturas y ventas, por 5 años) y el historial de tus citas, quejas y valoraciones, junto con la constancia de tus consentimientos y de tu solicitud',
    );
  });

  it('no niega que haya tarjetas guardadas: dice qué se conserva de ellas', async () => {
    const t = texto(await pintar('aviso-de-privacidad'));
    expect(t).not.toContain('no guardamos los datos de tu tarjeta');
    expect(t).toContain('nunca recibimos ni guardamos el número completo ni el código de seguridad de tu tarjeta');
  });
});

/**
 * Claves que el código de la web escribe en localStorage o sessionStorage: el primer argumento de setItem,
 * literal o constante declarada en el mismo archivo. Si una no se puede leer, la prueba lo dice.
 */
function clavesGuardadasEnElNavegador(): { almacen: string; clave: string; archivo: string }[] {
  const claves: { almacen: string; clave: string; archivo: string }[] = [];
  for (const ruta of archivosFuente(RAIZ_APP)) {
    const src = readFileSync(ruta, 'utf8');
    for (const m of src.matchAll(/\b(localStorage|sessionStorage)\.setItem\(\s*([^,]+?)\s*,/g)) {
      const arg = m[2];
      const literal = /^(['"`])([^'"`$]+)\1$/.exec(arg)?.[2];
      const constante = /^[A-Za-z_$][\w$]*$/.test(arg)
        ? new RegExp(`const\\s+${arg}\\s*=\\s*(['"\`])([^'"\`$]+)\\1`).exec(src)?.[2]
        : undefined;
      const clave = literal ?? constante;
      expect(clave, `No se pudo leer la clave de ${m[0]} en ${rutaRelativa(ruta)}`).toBeDefined();
      claves.push({ almacen: m[1], clave: clave as string, archivo: rutaRelativa(ruta) });
    }
  }
  return claves;
}

describe('Política de Cookies 1.0', () => {
  it('dice qué cookies usa (solo necesarias), que no hay analítica ni publicidad y cómo deshabilitarlas', async () => {
    const html = await pintar('politica-de-cookies');
    const t = texto(html);
    expect(t).toContain('mf_session');
    expect(t).toContain('estrictamente necesarias');
    expect(t).toContain('No usamos cookies de analítica ni de publicidad');
    expect(t).toContain('Cómo deshabilitarlas');
    expect(html).toContain('href="/aviso-de-privacidad"');
  });

  it('el inventario nombra cada clave que la web guarda en localStorage o sessionStorage', async () => {
    const html = await pintar('politica-de-cookies');
    const nombradas = new Set([...html.matchAll(/<code>([^<]+)<\/code>/g)].map((m) => texto(m[1])));
    const claves = clavesGuardadasEnElNavegador();
    // Las conocidas hoy, para que la búsqueda en el código no pase en vacío.
    for (const conocida of ['theme', 'miru-cart', 'user', 'lastLoginTime', 'manualLogout', 'mf-aviso-cookies', 'resetPasswordToken', 'resetToken', 'miru:regreso-tras-login', 'backup-miru-auto-enabled']) {
      expect(claves.map((c) => c.clave)).toContain(conocida);
    }
    const faltan = [...new Map(claves.map((c) => [c.clave, c])).values()]
      .filter((c) => !nombradas.has(c.clave))
      .map((c) => `${c.almacen} "${c.clave}" (${c.archivo})`);
    expect(faltan, 'Agrega estas claves a la Política de cookies (y sube su versión)').toEqual([]);
    const t = texto(html);
    expect(t).toContain('localStorage');
    expect(t).toContain('sessionStorage');
  });

  it('cada elemento del inventario dice para qué sirve y cuánto dura', async () => {
    const html = await pintar('politica-de-cookies');
    const elementos = [...html.matchAll(/<li>((?:(?!<\/li>).)*<code>(?:(?!<\/li>).)*)<\/li>/g)].map((m) => texto(m[1]));
    expect(elementos.length).toBeGreaterThanOrEqual(10);
    for (const e of elementos) {
      expect(e, e).toMatch(/Para qué sirve: \S/);
      expect(e, e).toMatch(/Cuánto dura: \S/);
    }
  });

  it('ya no presenta como lista cerrada solo el tema, el carrito y la sesión', async () => {
    const t = texto(await pintar('politica-de-cookies'));
    expect(t).not.toContain('datos básicos de tu sesión, como tu nombre, para mostrarlos en el menú.');
  });
});

describe('Política de Reembolsos, Cambios y Cancelaciones 1.0', () => {
  it('revocación, cambios y garantía con los plazos de los términos, cancelación y Mercado Pago', async () => {
    const t = texto(await pintar('politica-de-reembolsos'));
    expect(t).toContain('artículo 56 de la Ley Federal de Protección al Consumidor');
    expect(t).toContain('5 días hábiles');
    expect(t).toContain('7 días naturales');
    expect(t).toContain('dentro de los 7 días siguientes');
    expect(t).toContain('antes de que lo empecemos a preparar');
    expect(t).toContain('Mercado Pago');
    expect(t).toContain('55 5568 8722');
  });

  it('sección de anticipos con su ancla y la política autorizada, contada desde el pago del anticipo', async () => {
    const html = await pintar('politica-de-reembolsos');
    expect(html).toContain('id="anticipos"');
    const t = texto(html);
    expect(t).toContain(`Si ${REGLA_ANTICIPO_REEMBOLSABLE}.`);
    expect(t).toContain(
      'Si al pagar tu anticipo faltan 10 días hábiles o menos para tu cita, al cancelar el anticipo no se devuelve, pero puedes reagendar con aviso previo',
    );
    expect(t).toContain('Si nosotras cancelamos tu cita, te devolvemos el anticipo completo');
    expect(t).not.toContain('agendaste');
  });
});

describe('Ninguna página visible lleva notas internas', () => {
  it('no hay "[revisar con abogada]" en el código de la web', () => {
    const hallazgos = archivosFuente(RAIZ_APP, /\.(tsx?|css)$/)
      .filter((r) => /revisar con abogada/i.test(readFileSync(r, 'utf8')))
      .map(rutaRelativa);
    expect(hallazgos).toEqual([]);
  });
});

describe('Sitemap', () => {
  it('publica las cuatro páginas legales del registro', async () => {
    const { default: sitemap } = await import('../../sitemap');
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const ruta of ['/terminos-y-condiciones', '/aviso-de-privacidad', '/politica-de-cookies', '/politica-de-reembolsos']) {
      expect(urls).toContain(ruta);
    }
  });
});

describe('Documentos legales en forma neutra', () => {
  it('el Aviso de privacidad y la Política de cookies no dicen "tú misma" ni "tú mismo"', async () => {
    for (const carpeta of ['aviso-de-privacidad', 'politica-de-cookies']) {
      expect(texto(await pintar(carpeta)), carpeta).not.toMatch(/t[úu] mism[ao]/i);
    }
  });
});
