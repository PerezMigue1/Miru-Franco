import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLOR_ORO, COLOR_TEXTO_CLARO, COLOR_VINO } from '../../utils/exportReportes';
import { hoyEnMexico } from '../../utils/fechaSoloDia';
import type { ConsentimientoAdmin, PersonaConsentimiento } from '../../services/consentimientosAdmin';
import { documentoYVersion, etiquetaAccion, etiquetaConsentimiento, fechaHoraMexico } from './textosPrivacidad';
import { RESPONSABLE_DATOS } from './responsable';

/**
 * Constancia de consentimientos en PDF para presentarla ante la autoridad: encabezado con el responsable y la
 * fecha de emisión, y cada evento tal como quedó registrado (fecha y hora, documento, versión, hash, IP y
 * navegador). Nada se resume ni se omite: revocar es otra fila. Si las filas son de varias personas, cada una
 * dice de quién es (columna Persona).
 */
export const COLUMNAS_PDF_CONSENTIMIENTOS = [
  'Fecha y hora',
  'Consentimiento',
  'Documento y versión',
  'Acción',
  'Formulario',
  'Ruta',
  'IP',
  'Navegador',
  'Hash del documento',
];

const SIN_DATO = 'Sin dato';

/** De quién es una fila: su correo; si no lo hay, el id de su cuenta; si es visitante, "Visitante <id>". */
export function personaDeFila(f: Pick<ConsentimientoAdmin, 'usuario' | 'usuarioId' | 'visitanteId'>): string {
  if (f.usuario?.email) return f.usuario.email;
  if (f.usuarioId) return f.usuarioId;
  return f.visitanteId ? `Visitante ${f.visitanteId}` : SIN_DATO;
}

/** true si las filas son de más de una persona (cuenta o visitante): entonces cada fila dice de quién es. */
function hayVariasPersonas(filas: ConsentimientoAdmin[]): boolean {
  return new Set(filas.map((f) => (f.usuarioId ? `u:${f.usuarioId}` : `v:${f.visitanteId ?? ''}`))).size > 1;
}

/** Columnas de la tabla: con varias personas se agrega "Persona" después de la fecha. */
export function columnasPdfConsentimientos(filas: ConsentimientoAdmin[]): string[] {
  return hayVariasPersonas(filas)
    ? [COLUMNAS_PDF_CONSENTIMIENTOS[0], 'Persona', ...COLUMNAS_PDF_CONSENTIMIENTOS.slice(1)]
    : COLUMNAS_PDF_CONSENTIMIENTOS;
}

export function filasPdfConsentimientos(filas: ConsentimientoAdmin[]): string[][] {
  const conPersona = hayVariasPersonas(filas);
  return filas.map((f) => [
    fechaHoraMexico(f.creadoEn),
    ...(conPersona ? [personaDeFila(f)] : []),
    etiquetaConsentimiento(f.tipo),
    documentoYVersion(f),
    etiquetaAccion(f.accion),
    f.formulario || SIN_DATO,
    f.rutaOrigen || SIN_DATO,
    f.ip || SIN_DATO,
    f.userAgent || SIN_DATO,
    f.documentoHash || SIN_DATO,
  ]);
}

export function encabezadoConstancia(entrada: {
  persona: PersonaConsentimiento | null;
  busqueda: string;
  total: number;
  emitidoPor?: string;
  ahora: Date;
}): string[] {
  const busqueda = entrada.busqueda.trim();
  const consulta = entrada.persona
    ? `Persona: ${entrada.persona.nombre} (${entrada.persona.email}), id ${entrada.persona.id}`
    : busqueda
      ? `Búsqueda: "${busqueda}"`
      : 'Persona: Todas las personas';
  return [
    `Responsable: ${RESPONSABLE_DATOS.nombre}, nombre comercial ${RESPONSABLE_DATOS.nombreComercial}`,
    `Domicilio: ${RESPONSABLE_DATOS.domicilio}`,
    `Contacto de privacidad: ${RESPONSABLE_DATOS.contacto}`,
    `Fecha de emisión: ${fechaHoraMexico(entrada.ahora)} (hora del centro de México)`,
    ...(entrada.emitidoPor ? [`Emitido por: ${entrada.emitidoPor}`] : []),
    consulta,
    `Registros: ${entrada.total}`,
  ];
}

export function nombrePdfConsentimientos(usuarioId: string | null, ahora: Date = new Date()): string {
  return `consentimientos-${usuarioId ?? 'todos'}-${hoyEnMexico(ahora)}.pdf`;
}

const MARGEN = 12;

/** Documento listo para guardar (la pantalla llama a `.save(...)`). Horizontal para que quepan las 9 columnas. */
export function crearPdfConsentimientos(entrada: {
  filas: ConsentimientoAdmin[];
  persona: PersonaConsentimiento | null;
  busqueda: string;
  emitidoPor?: string;
  ahora?: Date;
}): jsPDF {
  const ahora = entrada.ahora ?? new Date();
  const doc = new jsPDF({ orientation: 'landscape' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLOR_VINO);
  doc.rect(0, 0, ancho, 22, 'F');
  doc.setTextColor(...COLOR_TEXTO_CLARO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Constancia de consentimientos registrados', MARGEN, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(RESPONSABLE_DATOS.nombreComercial, MARGEN, 17);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  const lineas = encabezadoConstancia({ ...entrada, total: entrada.filas.length, ahora });
  lineas.forEach((linea, i) => doc.text(linea, MARGEN, 30 + i * 5));
  let y = 30 + lineas.length * 5;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  const nota = doc.splitTextToSize(
    'Cada fila es un evento tal como lo guardó el sistema al marcar o revocar la casilla: fecha y hora del servidor, documento con su versión y su huella SHA-256, IP y navegador. Las filas no se editan ni se borran; una revocación es una fila nueva.',
    ancho - MARGEN * 2,
  );
  doc.text(nota, MARGEN, y + 2);
  y += 2 + nota.length * 4;

  if (entrada.filas.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_VINO);
    doc.text('Sin consentimientos registrados para esta consulta.', MARGEN, y + 8);
  } else {
    const columnas = columnasPdfConsentimientos(entrada.filas);
    // Con la columna Persona, las de IP, navegador y hash se recorren una posición
    const d = columnas.length - COLUMNAS_PDF_CONSENTIMIENTOS.length;
    autoTable(doc, {
      startY: y + 3,
      head: [columnas],
      body: filasPdfConsentimientos(entrada.filas),
      margin: { left: MARGEN, right: MARGEN, bottom: 16 },
      headStyles: { fillColor: COLOR_ORO, textColor: COLOR_TEXTO_CLARO, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 238, 231] },
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 24 },
        ...(d ? { 1: { cellWidth: 34 } } : {}),
        [6 + d]: { cellWidth: 22 },
        [7 + d]: { cellWidth: d ? 36 : 44 },
        [8 + d]: { cellWidth: d ? 40 : 46, fontSize: 6 },
      },
    });
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Emitida el ${fechaHoraMexico(ahora)}`, MARGEN, alto - 7);
    doc.text(`Página ${p} de ${paginas}`, ancho - MARGEN, alto - 7, { align: 'right' });
  }
  return doc;
}
