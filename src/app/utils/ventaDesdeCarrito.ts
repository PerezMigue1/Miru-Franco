/**
 * Reglas de negocio del flujo carrito → pedido (totales, notas, validación de líneas).
 * Todo pedido se recoge en el salón: no hay costo de envío.
 * Mantener aquí la fuente única de verdad para que checkout y carrito no diverjan.
 */

/** Mínima forma de línea para cálculos y validación (compatible con CartItem). */
export interface LineaCarritoVenta {
  precio: number;
  cantidad: number;
  productoId: number;
  presentacionId: number;
  nombre: string;
  presentacion?: string;
}

export interface ResumenVentaCarrito {
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  moneda: 'MXN';
}

/**
 * Subtotal = Σ precio × cantidad.
 * Total = subtotal + impuestos − descuento (sin envío: se recoge en el salón).
 */
export function calcularResumenVentaCarrito(
  lineas: LineaCarritoVenta[],
  opciones?: { impuestos?: number; descuento?: number }
): ResumenVentaCarrito {
  const subtotal = lineas.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const impuestos = opciones?.impuestos ?? 0;
  const descuento = opciones?.descuento ?? 0;
  return {
    subtotal,
    impuestos,
    descuento,
    total: subtotal + impuestos - descuento,
    moneda: 'MXN',
  };
}

/** Vista previa en carrito: el mismo cálculo que el checkout. */
export function calcularResumenCarritoVistaPrevia(lineas: LineaCarritoVenta[]): ResumenVentaCarrito {
  return calcularResumenVentaCarrito(lineas);
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
  if (input.esTarjeta && input.mesesMSI !== '1') {
    partes.push(`MSI: ${input.mesesMSI} meses`);
  }
  if (input.solicitaFactura && input.rfcFactura?.trim()) {
    partes.push(`Factura: RFC ${input.rfcFactura.trim()}`);
  }
  const s = partes.filter(Boolean).join(' — ');
  return s || undefined;
}
