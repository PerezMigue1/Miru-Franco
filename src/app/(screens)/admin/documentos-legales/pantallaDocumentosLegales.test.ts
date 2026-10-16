import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AvisoReglasEnDocumentos, { rutaPrepararVersion, textoAvisoDocumento } from '../../../components/legal/AvisoReglasEnDocumentos';
import VistaDocumento from './VistaDocumento';

/** Admin > Documentos legales. Sin DOM en vitest: se revisa el código de la pantalla y se pintan las piezas sin estado. */
const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf8');
const pagina = leer('page.tsx');
const editor = leer('EditorDocumento.tsx');
const dialogo = leer('DialogoPublicar.tsx');
const historial = leer('HistorialDocumento.tsx');

describe('Pantalla', () => {
  it('monta AdminLayout con el título y la lista de documentos', () => {
    expect(pagina).toContain('<AdminLayout>');
    expect(pagina).toContain('Documentos legales');
    expect(pagina).toContain('listarDocumentosLegalesAdmin');
    expect(pagina).toContain('<AvisoReglasEnDocumentos');
  });

  it('un 403 se muestra en la pantalla en vez de mandar a /403', () => {
    expect(pagina).toContain("setEstado('sin-permiso')");
  });

  it('prepara el borrador al llegar con ?preparar=slug (desde Configuración del sitio)', () => {
    expect(pagina).toContain("get('preparar')");
    expect(pagina).toContain('prepararVersionDocumentoLegal');
    expect(rutaPrepararVersion('terminos')).toBe('/admin/documentos-legales?preparar=terminos');
  });
});

describe('Editor y "Publicar nueva versión"', () => {
  it('el editor tiene barra de formato, variables de reglas, etiqueta del texto y vista previa', () => {
    expect(editor).toContain('role="toolbar"');
    expect(editor).toContain('Insertar variable');
    expect(editor).toContain('Texto del documento');
    expect(editor).toContain('vistaPreviaDocumentoLegal');
    expect(editor).toContain('Publicar nueva versión');
    expect(editor).toContain('Cómo dar formato');
  });

  it('no se puede publicar con errores (variables desconocidas o formato no permitido) ni sin vista previa al día', () => {
    expect(editor).toMatch(/const puedePublicar = [^;]*errores\.length === 0[^;]*vistaAlDia/);
    expect(editor).toContain('disabled={!puedePublicar}');
  });

  it('el diálogo pide versión, fecha de vigencia y motivo, y "Pedir que se vuelva a aceptar" viene marcado', () => {
    for (const campo of ['Número de versión', 'Vigente desde', 'Motivo del cambio', 'Pedir que se vuelva a aceptar']) expect(dialogo).toContain(campo);
    expect(dialogo).toContain('const [requiereAceptacion, setRequiereAceptacion] = useState(true);');
    expect(dialogo).toContain('validarPublicacion(');
    expect(dialogo).toContain('publicarVersionDocumentoLegal(');
    expect(dialogo).toContain('type="date"');
  });

  it('el historial es de solo lectura: sin editar ni borrar versiones publicadas', () => {
    expect(historial).toContain('solo para consulta');
    expect(historial).not.toMatch(/eliminar|borrarVersion|editarVersion/i);
    expect(historial).toContain('Pidió volver a aceptar');
    expect(historial).toContain('Corrección menor');
  });

  it('ningún archivo de la pantalla lleva guiones largos', () => {
    for (const archivo of readdirSync(__dirname).filter((n) => /\.tsx?$/.test(n))) {
      expect(leer(archivo), archivo).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe('Aviso "Este cambio requiere publicar una nueva versión"', () => {
  const afectados = [
    { slug: 'terminos' as const, titulo: 'Términos y Condiciones', version: '2.0', variables: [{ nombre: 'plazoPagoLineaHoras', publicado: '24', actual: '48' }] },
  ];

  it('dice qué documento y qué variable cambió, con el botón que prepara la versión', () => {
    expect(textoAvisoDocumento('Términos y Condiciones')).toBe('Este cambio requiere publicar una nueva versión de Términos y Condiciones');
    const html = renderToStaticMarkup(createElement(AvisoReglasEnDocumentos, { afectados }));
    expect(html).toContain('Este cambio requiere publicar una nueva versión de Términos y Condiciones');
    expect(html).toContain('{plazoPagoLineaHoras}: publicado 24, ahora 48');
    expect(html).toContain('href="/admin/documentos-legales?preparar=terminos"');
    expect(html).toContain('Preparar nueva versión');
  });

  it('sin documentos afectados no pinta nada', () => {
    expect(renderToStaticMarkup(createElement(AvisoReglasEnDocumentos, { afectados: [] }))).toBe('');
  });
});

describe('Vista previa', () => {
  it('pinta el documento como bloque (sin un segundo <main>) con las clases de la página', () => {
    const html = renderToStaticMarkup(createElement(VistaDocumento, { html: '<main class="mf-terminos"><p>Hola</p></main>', etiqueta: 'Vista previa' }));
    expect(html).toContain('<div class="mf-terminos"><p>Hola</p></div>');
    expect(html).toContain('mf-terminos-pagina');
    expect(html).not.toContain('<main');
  });

  it('no pinta html que no es un documento seguro', () => {
    const html = renderToStaticMarkup(createElement(VistaDocumento, { html: '<main class="mf-terminos"><script>x</script></main>', etiqueta: 'Vista previa' }));
    expect(html).not.toContain('<script');
    expect(html).toContain('role="alert"');
  });
});
