import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVISO_SIN_TIMBRADO, textoBotonGuardar, tituloModalDocumento } from './textosFacturacion';

/** No hay proveedor de timbrado (PAC): la pantalla no ofrece timbrar ni "generar" un CFDI, solo registrarlo. */
const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

describe('Facturación sin timbrado', () => {
  it('el aviso explica el flujo manual', () => {
    expect(AVISO_SIN_TIMBRADO).toBe(
      'El sistema no timbra facturas: timbra el CFDI en tu proveedor o en el portal del SAT y registra aquí su folio y archivo.',
    );
  });

  it('el botón del modal registra el CFDI (no lo genera) y la nota sí se genera', () => {
    expect(textoBotonGuardar('cfdi', { guardando: false, subiendoPdf: false })).toBe('Registrar CFDI timbrado');
    expect(textoBotonGuardar('cfdi', { guardando: true, subiendoPdf: false })).toBe('Registrando…');
    expect(textoBotonGuardar('cfdi', { guardando: true, subiendoPdf: true })).toBe('Subiendo PDF…');
    expect(textoBotonGuardar('nota', { guardando: false, subiendoPdf: false })).toBe('Generar nota de venta');
    expect(textoBotonGuardar('nota', { guardando: true, subiendoPdf: false })).toBe('Generando…');
    expect(tituloModalDocumento('cfdi')).toBe('Registrar CFDI timbrado');
    expect(tituloModalDocumento('nota')).toBe('Generar nota de venta');
  });

  it('la pantalla muestra el aviso a la vista (fuera del modal) y no trae acciones de timbrar ni de generar CFDI', () => {
    const antesDelModal = pagina.slice(0, pagina.indexOf('<Modal'));
    expect(antesDelModal).toContain('{AVISO_SIN_TIMBRADO}');
    expect(pagina).not.toMatch(/>\s*Timbrar/i);
    expect(pagina).not.toMatch(/Generar (CFDI|Documento|factura)/i);
    expect(pagina).toContain('textoBotonGuardar(formTipo');
    expect(pagina).toContain('tituloModalDocumento(formTipo)');
  });
});

describe('Facturación: carga de las celdas sin decenas de regiones vivas', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('el skeleton de cada celda no es un role="status": la tabla entera lleva un solo aria-busy', () => {
    const skeleton = pagina.match(/const skeletonCelda = [^\n]*/)?.[0] ?? '';
    expect(skeleton).not.toBe('');
    expect(skeleton).not.toContain('role="status"');
    expect(skeleton).toContain('aria-hidden');
    expect(pagina).toMatch(/<Table\b[^>]*\bocupada=\{cargandoPedidos\}/);
  });
});
