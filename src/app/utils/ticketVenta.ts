import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLOR_VINO, COLOR_ORO, COLOR_TEXTO_CLARO } from './exportReportes';
import type { VentaLocalApi } from '../services/pos';

const ZONA_SALON = 'America/Mexico_City';

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFechaHora(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const fecha = d.toLocaleDateString('es-MX', { timeZone: ZONA_SALON });
  const hora = d.toLocaleTimeString('es-MX', { timeZone: ZONA_SALON, hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
}

const ETIQUETA_METODO_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
};

function etiquetaMetodoPago(metodo: string): string {
  return ETIQUETA_METODO_PAGO[metodo] ?? metodo;
}

/**
 * Genera el PDF del ticket de una venta local (POS) — todo sale de `venta`, nada inventado.
 * Nombres de ítems/cajero/cliente ya vienen resueltos desde el backend (ver
 * `incluirVentaRelaciones()` en pos.service.ts + normalizarVenta en services/pos.ts),
 * nunca se resuelven aquí con catálogos ni se muestran IDs crudos.
 */
export function generarTicketVentaPdf(venta: VentaLocalApi): void {
  const doc = new jsPDF();

  // Encabezado de marca — mismo patrón que exportarReportePdf
  doc.setFillColor(...COLOR_VINO);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(...COLOR_TEXTO_CLARO);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Mirú Franco — Beauty Salón', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Ticket de venta', 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const folio = venta.folio || `Venta #${venta.id}`;
  doc.text(`Folio: ${folio}`, 14, 35);
  doc.text(`Fecha: ${fmtFechaHora(venta.creadoEn)}`, 14, 41);
  doc.text(`Atendió: ${venta.cajeroNombre || 'No especificado'}`, 14, 47);
  doc.text(`Cliente: ${venta.clienteNombre || 'Público en general'}`, 14, 53);

  const filas = venta.items.map((item) => [
    item.nombre || (item.servicioId != null ? 'Servicio' : 'Producto'),
    String(item.cantidad),
    fmtMoneda(item.precioUnitario),
    fmtMoneda(item.subtotal ?? item.cantidad * item.precioUnitario),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Producto / Servicio', 'Cant.', 'P. Unitario', 'Subtotal']],
    body: filas,
    headStyles: { fillColor: COLOR_ORO, textColor: COLOR_TEXTO_CLARO, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 238, 231] },
    styles: { fontSize: 9 },
  });

  // @ts-expect-error lastAutoTable lo agrega jspdf-autotable en runtime
  const finalY = (doc.lastAutoTable?.finalY as number | undefined) ?? 65;
  let y = finalY + 10;

  const subtotal = venta.subtotal ?? venta.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Subtotal: ${fmtMoneda(subtotal)}`, 14, y);
  y += 6;

  if (venta.descuento != null && venta.descuento > 0) {
    doc.text(`Descuento: -${fmtMoneda(venta.descuento)}`, 14, y);
    y += 6;
  }

  y += 2;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_ORO);
  doc.text(`TOTAL: ${fmtMoneda(venta.total ?? 0)}`, 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Método de pago: ${etiquetaMetodoPago(venta.metodoPago)}`, 14, y);
  y += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLOR_VINO);
  doc.text('¡Gracias por tu preferencia! — Mirú Franco Beauty Salón', 14, y);

  doc.save(`ticket-${folio}.pdf`);
}
