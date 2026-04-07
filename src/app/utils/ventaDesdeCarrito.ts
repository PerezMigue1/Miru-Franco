/**
 * Reglas de negocio del flujo carrito → pedido (totales, envío, notas, validación de líneas).
 * Mantener aquí la fuente única de verdad para que checkout y carrito no diverjan.
 */

export type TipoEntregaVenta = 'domicilio' | 'retiro';

/** Mínima forma de línea para cálculos y validación (compatible con CartItem). */
export interface LineaCarritoVenta {
  precio: number;
  cantidad: number;
  productoId: number;
  presentacionId: number;
  nombre: string;
  presentacion?: string;
}

function costoEnvioDomicilioConfig(): number {
  if (typeof process === 'undefined') return 50;
  const raw = process.env.NEXT_PUBLIC_COSTO_ENVIO_DOMICILIO;
  if (raw == null || String(raw).trim() === '') return 50;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) && n >= 0 ? n : 50;
}

export interface ResumenVentaCarrito {
  subtotal: number;
  costoEnvio: number;
  impuestos: number;
  descuento: number;
  total: number;
  moneda: 'MXN';
}

/**
 * Subtotal = Σ precio × cantidad.
 * Envío: 0 en retiro o carrito vacío; en domicilio, costo fijo configurable (def. 50 MXN).
 * Total = subtotal + envío + impuestos − descuento.
 */
export function calcularResumenVentaCarrito(
  lineas: LineaCarritoVenta[],
  tipoEntrega: TipoEntregaVenta,
  opciones?: { impuestos?: number; descuento?: number }
): ResumenVentaCarrito {
  const subtotal = lineas.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const costoEnvio =
    tipoEntrega === 'retiro' || lineas.length === 0 ? 0 : costoEnvioDomicilioConfig();
  const impuestos = opciones?.impuestos ?? 0;
  const descuento = opciones?.descuento ?? 0;
  return {
    subtotal,
    costoEnvio,
    impuestos,
    descuento,
    total: subtotal + costoEnvio + impuestos - descuento,
    moneda: 'MXN',
  };
}

/** Vista previa en carrito: mismo costo de envío a domicilio que en checkout si el cliente elige domicilio. */
export function calcularResumenCarritoVistaPrevia(lineas: LineaCarritoVenta[]): ResumenVentaCarrito {
  return calcularResumenVentaCarrito(lineas, 'domicilio');
}

/** Devuelve mensaje de error o null si las líneas pueden convertirse en ítems de pedido. */
export function mensajeErrorLineasNoVendibles(lineas: LineaCarritoVenta[]): string | null {
  for (const item of lineas) {
    if (!item.productoId || !item.presentacionId) {
      return 'Hay ítems sin producto/presentación válidos. Vaciá el carrito y vuelve a agregar desde la tienda.';
    }
    if (!Number.isFinite(item.cantidad) || item.cantidad < 1) {
      return 'Hay cantidades inválidas en el carrito.';
    }
    if (!Number.isFinite(item.precio) || item.precio < 0) {
      return 'Hay precios inválidos en el carrito.';
    }
  }
  return null;
}

export interface NotasCheckoutVentaInput {
  telefono?: string;
  nombreContacto: string;
  apellidosContacto: string;
  tipoEntrega: TipoEntregaVenta;
  esTarjeta: boolean;
  mesesMSI: string;
  solicitaFactura: boolean;
  rfcFactura?: string;
}

export function construirNotasClienteVenta(input: NotasCheckoutVentaInput): string | undefined {
  const partes: string[] = [];
  const tel = input.telefono?.trim();
  if (tel) partes.push(`Tel: ${tel}`);
  const contacto = `${input.nombreContacto} ${input.apellidosContacto}`.trim();
  if (contacto) partes.push(`Contacto: ${contacto}`);
  partes.push(
    input.tipoEntrega === 'retiro' ? 'Entrega: retiro en estética' : 'Entrega: domicilio'
  );
  if (input.esTarjeta && input.mesesMSI !== '1') {
    partes.push(`MSI: ${input.mesesMSI} meses`);
  }
  if (input.solicitaFactura && input.rfcFactura?.trim()) {
    partes.push(`Factura: RFC ${input.rfcFactura.trim()}`);
  }
  const s = partes.filter(Boolean).join(' — ');
  return s || undefined;
}
