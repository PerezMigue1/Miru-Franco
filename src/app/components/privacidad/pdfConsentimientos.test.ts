import { describe, expect, it } from 'vitest';
import {
  columnasPdfConsentimientos,
  COLUMNAS_PDF_CONSENTIMIENTOS,
  crearPdfConsentimientos,
  encabezadoConstancia,
  filasPdfConsentimientos,
  nombrePdfConsentimientos,
} from './pdfConsentimientos';
import { RESPONSABLE_DATOS } from './responsable';
import type { ConsentimientoAdmin } from '../../services/consentimientosAdmin';

const HASH = 'c35462c4e7ac7cb8a2c2366c14ae6040526037bafa62adafdeca61d2a6dfe227';

const filas: ConsentimientoAdmin[] = [
  {
    id: '10',
    usuarioId: 'u-1',
    visitanteId: null,
    tipo: 'aviso_privacidad',
    documentoSlug: 'aviso-privacidad',
    documentoVersion: '2.0',
    documentoHash: HASH,
    accion: 'aceptado',
    creadoEn: '2026-10-15T03:05:00.000Z',
    ip: '189.203.1.20',
    userAgent: 'Mozilla/5.0 (iPhone)',
    formulario: 'registro',
    rutaOrigen: '/register',
    metodo: 'casilla_marcada',
    usuario: { id: 'u-1', nombre: 'Ana López', email: 'ana@correo.com', rol: 'cliente' },
  },
  {
    id: '11',
    usuarioId: 'u-1',
    visitanteId: null,
    tipo: 'promociones',
    documentoSlug: null,
    documentoVersion: null,
    documentoHash: null,
    accion: 'revocado',
    creadoEn: '2026-10-16T18:00:00.000Z',
    ip: null,
    userAgent: null,
    formulario: 'arco_oposicion',
    rutaOrigen: null,
    metodo: 'casilla_marcada',
    usuario: { id: 'u-1', nombre: 'Ana López', email: 'ana@correo.com', rol: 'cliente' },
  },
];

describe('PDF de consentimientos para presentar ante la autoridad', () => {
  it('cada fila trae fecha y hora de México, tipo, documento y versión, acción, formulario, ruta, IP, navegador y hash', () => {
    expect(COLUMNAS_PDF_CONSENTIMIENTOS).toEqual([
      'Fecha y hora',
      'Consentimiento',
      'Documento y versión',
      'Acción',
      'Formulario',
      'Ruta',
      'IP',
      'Navegador',
      'Hash del documento',
    ]);
    const [primera, segunda] = filasPdfConsentimientos(filas);
    expect(primera).toEqual([
      '14/10/2026 21:05',
      'Aviso de privacidad',
      'Aviso de Privacidad, versión 2.0',
      'Aceptado',
      'registro',
      '/register',
      '189.203.1.20',
      'Mozilla/5.0 (iPhone)',
      HASH,
    ]);
    expect(segunda[3]).toBe('Revocado');
    expect(segunda.slice(5, 9)).toEqual(['Sin dato', 'Sin dato', 'Sin dato', 'Sin dato']);
  });

  it('con varias personas, cada fila dice de quién es: correo, si no el id de la cuenta, si no "Visitante <id>"', () => {
    const deBeto: ConsentimientoAdmin = {
      ...filas[0],
      id: '12',
      usuarioId: 'u-2',
      usuario: { id: 'u-2', nombre: 'Beto Ruiz', email: 'beto@correo.com', rol: 'cliente' },
    };
    const sinCorreo: ConsentimientoAdmin = { ...filas[0], id: '13', usuarioId: 'u-3', usuario: null };
    const visitante: ConsentimientoAdmin = { ...filas[0], id: '14', usuarioId: null, visitanteId: 'v-77', usuario: null, tipo: 'cookies' };
    const todas = [filas[0], deBeto, sinCorreo, visitante];

    expect(columnasPdfConsentimientos(todas)).toEqual(['Fecha y hora', 'Persona', ...COLUMNAS_PDF_CONSENTIMIENTOS.slice(1)]);
    const resultado = filasPdfConsentimientos(todas);
    expect(resultado.map((f) => f[1])).toEqual(['ana@correo.com', 'beto@correo.com', 'u-3', 'Visitante v-77']);
    expect(resultado.every((f) => f.length === COLUMNAS_PDF_CONSENTIMIENTOS.length + 1)).toBe(true);
    expect(resultado[1][0]).toBe('14/10/2026 21:05');
    expect(resultado[1][2]).toBe('Aviso de privacidad');
  });

  it('con una sola persona la tabla queda igual (la persona ya va en el encabezado)', () => {
    expect(columnasPdfConsentimientos(filas)).toEqual(COLUMNAS_PDF_CONSENTIMIENTOS);
    expect(filasPdfConsentimientos(filas)[0]).toHaveLength(COLUMNAS_PDF_CONSENTIMIENTOS.length);
  });

  it('el PDF de varias personas lleva la columna Persona con el correo de cada fila', () => {
    const deBeto: ConsentimientoAdmin = {
      ...filas[0],
      id: '12',
      usuarioId: 'u-2',
      usuario: { id: 'u-2', nombre: 'Beto Ruiz', email: 'beto@correo.com', rol: 'cliente' },
    };
    const salida = crearPdfConsentimientos({ filas: [filas[0], deBeto], persona: null, busqueda: '', ahora: new Date() }).output();
    expect(salida).toContain('Persona');
    expect(salida).toContain('beto@correo.com');
  });

  it('el encabezado identifica al responsable, la fecha de emisión y a la persona consultada', () => {
    const lineas = encabezadoConstancia({
      persona: { id: 'u-1', nombre: 'Ana López', email: 'ana@correo.com', rol: 'cliente' },
      busqueda: 'ana',
      total: 2,
      emitidoPor: 'Mildred Franco',
      ahora: new Date('2026-10-15T03:05:00.000Z'),
    });
    const texto = lineas.join('\n');
    expect(texto).toContain(RESPONSABLE_DATOS.nombre);
    expect(texto).toContain(RESPONSABLE_DATOS.domicilio);
    expect(texto).toContain('Fecha de emisión: 14/10/2026 21:05 (hora del centro de México)');
    expect(texto).toContain('Ana López (ana@correo.com), id u-1');
    expect(texto).toContain('Registros: 2');
    expect(texto).toContain('Emitido por: Mildred Franco');
  });

  it('sin una sola persona, el encabezado dice qué búsqueda se exportó', () => {
    const texto = encabezadoConstancia({ persona: null, busqueda: 'lopez', total: 5, ahora: new Date() }).join('\n');
    expect(texto).toContain('Búsqueda: "lopez"');
    const todo = encabezadoConstancia({ persona: null, busqueda: '', total: 9, ahora: new Date() }).join('\n');
    expect(todo).toContain('Todas las personas');
  });

  it('el PDF incluye el encabezado, las filas y el número de página', () => {
    const doc = crearPdfConsentimientos({
      filas,
      persona: filas[0].usuario,
      busqueda: 'ana',
      ahora: new Date('2026-10-15T03:05:00.000Z'),
    });
    const salida = doc.output();
    expect(salida).toContain('Constancia de consentimientos');
    expect(salida).toContain('Fecha de emisi');
    expect(salida).toContain('189.203.1.20');
    expect(salida).toContain('gina 1 de 1');
  });

  it('el archivo se nombra con la persona y el día de México', () => {
    expect(nombrePdfConsentimientos('u-1', new Date('2026-10-15T03:05:00.000Z'))).toBe('consentimientos-u-1-2026-10-14.pdf');
    expect(nombrePdfConsentimientos(null, new Date('2026-10-15T03:05:00.000Z'))).toBe('consentimientos-todos-2026-10-14.pdf');
  });
});
