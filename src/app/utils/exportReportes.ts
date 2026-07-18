import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Colores de marca fijos (no CSS vars): un PDF/Excel generado es un documento binario sin
 * acceso al DOM ni a modo claro/oscuro, así que se usan los mismos hex estables definidos
 * en globals.css (--danger vino / --logo-branding oro) como constantes aquí.
 */
const COLOR_VINO: [number, number, number] = [113, 0, 20]; // #710014
const COLOR_ORO: [number, number, number] = [159, 109, 31]; // #9f6d1f
const COLOR_TEXTO_CLARO: [number, number, number] = [255, 255, 255];

export interface ReporteParaExportar {
  titulo: string;
  /** Ej. "Del 01/07/2026 al 18/07/2026" */
  subtitulo: string;
  columnas: string[];
  filas: (string | number)[][];
  /** Líneas de totales/resumen mostradas debajo de la tabla. */
  totales?: { label: string; valor: string }[];
}

/** Nunca se llama con datos inventados: si `filas` viene vacía, el PDF/Excel dice "Sin datos en el rango seleccionado". */
export function exportarReportePdf(reporte: ReporteParaExportar): void {
  const doc = new jsPDF();

  // Encabezado con marca
  doc.setFillColor(...COLOR_VINO);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(...COLOR_TEXTO_CLARO);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Mirú Franco — Beauty Salón', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(reporte.titulo, 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(reporte.subtitulo, 14, 35);

  if (reporte.filas.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_VINO);
    doc.text('Sin datos en el rango seleccionado.', 14, 48);
  } else {
    autoTable(doc, {
      startY: 40,
      head: [reporte.columnas],
      body: reporte.filas,
      headStyles: { fillColor: COLOR_ORO, textColor: COLOR_TEXTO_CLARO, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 238, 231] },
      styles: { fontSize: 9 },
    });
  }

  if (reporte.totales?.length) {
    // @ts-expect-error lastAutoTable lo agrega jspdf-autotable en runtime
    const finalY = (doc.lastAutoTable?.finalY as number | undefined) ?? 45;
    let y = finalY + 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_VINO);
    for (const t of reporte.totales) {
      doc.text(`${t.label}: ${t.valor}`, 14, y);
      y += 6;
    }
  }

  doc.save(`${slug(reporte.titulo)}.pdf`);
}

export function exportarReporteExcel(reporte: ReporteParaExportar): void {
  const filas = reporte.filas.length > 0 ? reporte.filas : [['Sin datos en el rango seleccionado']];
  const encabezado = reporte.filas.length > 0 ? [reporte.columnas] : [['']];
  const hoja = XLSX.utils.aoa_to_sheet([...encabezado, ...filas]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
  XLSX.writeFile(libro, `${slug(reporte.titulo)}.xlsx`);
}

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
