import type { CrearVentaPayload } from '../services/pos';

/** Línea del ticket del punto de venta. El precio es solo para mostrar: el backend cobra el de la base. */
export interface LineaCobro {
  tipo: 'producto' | 'servicio';
  presentacionId?: number;
  servicioId?: number;
  cantidad: number;
  precioUnitario: number;
  /** Cita finalizada que se cobra con esta línea. */
  citaId?: number;
  /** Personal elegido que participó (la especialista de la cita la agrega el backend). */
  participantes?: string[];
  /** Anticipo ya pagado de la cita: se descuenta del saldo (el backend lo recalcula; no viaja en el payload). */
  anticipo?: number;
}

export type MontosMixtos = { efectivo?: string; tarjeta?: string; transferencia?: string };

const centavos = (n: number) => Math.round(n * 100);

export function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Monto de dinero escrito a mano: cero o más con hasta 2 decimales (texto, sin errores de punto flotante). */
export function montoValido(valor: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(valor.trim());
}

export function itemsDeVenta(lineas: LineaCobro[]): CrearVentaPayload['items'] {
  return lineas.map((l) => {
    if (l.tipo === 'producto') return { presentacionId: l.presentacionId, cantidad: l.cantidad };
    return {
      servicioId: l.servicioId,
      cantidad: l.cantidad,
      ...(l.citaId ? { citaId: l.citaId } : {}),
      ...(l.participantes?.length ? { participantes: l.participantes } : {}),
    };
  });
}

export function totalesTicket(lineas: LineaCobro[], descuento: number): { subtotal: number; descuento: number; anticipo: number; total: number } {
  const subtotal = centavos(lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0)) / 100;
  const anticipo = centavos(lineas.reduce((acc, l) => acc + (l.anticipo ?? 0), 0)) / 100;
  const d = Math.max(0, Number(descuento) || 0);
  return { subtotal, descuento: d, anticipo, total: Math.max(0, centavos(subtotal - d - anticipo) / 100) };
}

export function pagosMixtos(metodoPago: string, montos: MontosMixtos): CrearVentaPayload['pagos'] | undefined {
  if (metodoPago !== 'mixto') return undefined;
  const pagos: NonNullable<CrearVentaPayload['pagos']> = {};
  for (const k of ['efectivo', 'tarjeta', 'transferencia'] as const) {
    const n = Number(montos[k]);
    if (montos[k]?.trim() && Number.isFinite(n) && n > 0) pagos[k] = n;
  }
  return pagos;
}

/** Mismas reglas que el backend: motivo obligatorio si hay descuento, descuento ≤ subtotal y, en mixto, suma = total. */
export function validarCobro(c: {
  lineas: LineaCobro[];
  descuento: number;
  motivoDescuento: string;
  metodoPago: string;
  pagos: MontosMixtos;
}): string | null {
  if (c.lineas.length === 0) return 'Agrega al menos un producto o servicio al ticket';
  const { subtotal, descuento, anticipo, total } = totalesTicket(c.lineas, c.descuento);
  if (Number(c.descuento) < 0) return 'El descuento no puede ser negativo';
  if (descuento > subtotal) return 'El descuento no puede ser mayor al subtotal';
  if (centavos(descuento + anticipo) > centavos(subtotal)) return 'El descuento más el anticipo no pueden ser mayores al subtotal';
  if (descuento > 0 && !c.motivoDescuento.trim()) return 'Escribe el motivo del descuento';
  if (c.metodoPago === 'mixto') {
    const montos = Object.values(c.pagos).map((v) => Number(v || 0));
    if (montos.some((n) => !Number.isFinite(n) || n < 0)) return 'Los montos del pago mixto deben ser cero o mayores';
    const suma = montos.reduce((a, b) => a + b, 0);
    if (centavos(suma) !== centavos(total)) return `Los pagos suman ${fmtMoneda(suma)} y el total es ${fmtMoneda(total)}`;
  }
  return null;
}
