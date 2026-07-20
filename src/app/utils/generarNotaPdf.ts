import jsPDF from 'jspdf';
import { COLOR_VINO, COLOR_ORO, COLOR_TEXTO_CLARO } from './exportReportes';

export interface NotaVentaParaPdf {
  id: number;
  clienteNombre: string;
  concepto: string;
  monto: number;
  fecha: string;
}

/**
 * Genera el PDF de una "nota de venta" (comprobante NO fiscal) 100% en el cliente.
 * Nunca debe verse como un CFDI timbrado — lleva un sello visible y explícito dejando
 * claro que no tiene validez fiscal (regla legal, no cosmética).
 */
export function generarNotaVentaPdf(nota: NotaVentaParaPdf): void {
  const doc = new jsPDF();

  doc.setFillColor(...COLOR_VINO);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(...COLOR_TEXTO_CLARO);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Mirú Franco — Beauty Salón', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Nota de venta', 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`Nota #${nota.id}`, 14, 40);
  doc.text(`Fecha: ${nota.fecha}`, 14, 47);
  doc.text(`Cliente: ${nota.clienteNombre}`, 14, 54);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_VINO);
  doc.text('Concepto', 14, 68);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const conceptoLines = doc.splitTextToSize(nota.concepto, 180);
  doc.text(conceptoLines, 14, 75);

  const yMonto = 75 + conceptoLines.length * 6 + 10;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_ORO);
  doc.text(`Total: $${nota.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yMonto);

  // Sello legal — visible, no decorativo: este documento NUNCA debe confundirse con un CFDI.
  const yFinal = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(...COLOR_VINO);
  doc.setLineWidth(0.8);
  doc.rect(14, yFinal, 182, 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_VINO);
  doc.text('COMPROBANTE NO FISCAL — Sin validez fiscal', 105, yFinal + 10, { align: 'center' });

  doc.save(`nota-venta-${nota.id}.pdf`);
}
