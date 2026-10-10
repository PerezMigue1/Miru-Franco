'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

export interface ReporteVentasApi {
  resumen: {
    totalVentas: number;
    totalMonto: number;
    totalUnidadesVendidas: number;
    porMetodo: { efectivo: number; tarjeta: number; transferencia: number; mixto: number };
  };
  /** Ingresos del periodo por fuente: los anticipos de citas cuentan una vez (la venta del POS solo trae el saldo). */
  ingresos: IngresosApi;
  ventas: { id: number; folio: string; total: number; metodoPago: string; creadoEn: string }[];
}

export interface IngresosApi {
  total: number;
  /** Ventas pagadas del punto de venta (solo el saldo, sin el anticipo). */
  ventasPos: number;
  cobrosPedidosSalon: number;
  anticipos: number;
  anticiposEnLinea: number;
  anticiposEnSalon: number;
  /** Aparte, no suman al total. */
  anticiposEnRevision: number;
  anticiposReembolsados: number;
}

export interface ReporteServiciosApi {
  totalCompletadas: number;
  porServicio: { servicioId: number; servicioNombre: string; cantidad: number }[];
  porEspecialista: { especialistaId: string; especialistaNombre: string; cantidad: number }[];
}

export interface ReporteInventarioApi {
  totalPresentaciones: number;
  presentacionesBajoStock: {
    id: number;
    tamanio: string;
    stock: number;
    disponible: boolean;
    producto: { id: number; nombre: string; marca: string; categoria: string | null };
  }[];
}

export interface ReporteClientesApi {
  totalNuevos: number;
  clientes: { id: string; nombre: string; email: string; creadoEn: string }[];
}

function n(v: unknown, d = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

async function get<T>(endpoint: string): Promise<T> {
  const res = await apiClient.get<{ success?: boolean; data?: unknown }>(endpoint, { customBase: getBackendBaseUrl() });
  return (res?.data ?? res) as T;
}

function qs(desde?: string, hasta?: string): string {
  const sp = new URLSearchParams();
  if (desde) sp.set('desde', desde);
  if (hasta) sp.set('hasta', hasta);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Filas del reporte por fuente de ingreso; las dos últimas se informan sin sumar al total. */
export function filasIngresos(i: IngresosApi): { label: string; valor: string }[] {
  return [
    { label: 'Ventas en el punto de venta', valor: fmtMoneda(i.ventasPos) },
    { label: 'Cobros de pedidos en el salón', valor: fmtMoneda(i.cobrosPedidosSalon) },
    { label: 'Anticipos de citas en línea', valor: fmtMoneda(i.anticiposEnLinea) },
    { label: 'Anticipos de citas en el salón', valor: fmtMoneda(i.anticiposEnSalon) },
    { label: 'Ingresos totales', valor: fmtMoneda(i.total) },
    { label: 'Anticipos en revisión (no suman)', valor: fmtMoneda(i.anticiposEnRevision) },
    { label: 'Anticipos reembolsados (no suman)', valor: fmtMoneda(i.anticiposReembolsados) },
  ];
}

export async function obtenerReporteVentas(desde?: string, hasta?: string): Promise<ReporteVentasApi> {
  const raw = await get<Record<string, unknown>>(`/api/reportes/ventas${qs(desde, hasta)}`);
  const resumenRaw = (raw.resumen ?? {}) as Record<string, unknown>;
  const metodoRaw = (resumenRaw.porMetodo ?? {}) as Record<string, unknown>;
  const ventasRaw = Array.isArray(raw.ventas) ? raw.ventas : [];
  const ingresosRaw = raw.ingresos && typeof raw.ingresos === 'object' ? (raw.ingresos as Record<string, unknown>) : null;
  // Sin ingresos (backend anterior): el total es el monto del resumen, sin desglose de anticipos.
  const ingresos: IngresosApi = ingresosRaw
    ? {
        total: n(ingresosRaw.total),
        ventasPos: n(ingresosRaw.ventasPos),
        cobrosPedidosSalon: n(ingresosRaw.cobrosPedidosSalon),
        anticipos: n(ingresosRaw.anticipos),
        anticiposEnLinea: n(ingresosRaw.anticiposEnLinea),
        anticiposEnSalon: n(ingresosRaw.anticiposEnSalon),
        anticiposEnRevision: n(ingresosRaw.anticiposEnRevision),
        anticiposReembolsados: n(ingresosRaw.anticiposReembolsados),
      }
    : {
        total: n(resumenRaw.totalMonto),
        ventasPos: n(resumenRaw.totalMonto),
        cobrosPedidosSalon: 0,
        anticipos: 0,
        anticiposEnLinea: 0,
        anticiposEnSalon: 0,
        anticiposEnRevision: 0,
        anticiposReembolsados: 0,
      };
  return {
    ingresos,
    resumen: {
      totalVentas: n(resumenRaw.totalVentas),
      totalMonto: n(resumenRaw.totalMonto),
      totalUnidadesVendidas: n(resumenRaw.totalUnidadesVendidas),
      porMetodo: {
        efectivo: n(metodoRaw.efectivo),
        tarjeta: n(metodoRaw.tarjeta),
        transferencia: n(metodoRaw.transferencia),
        mixto: n(metodoRaw.mixto),
      },
    },
    ventas: ventasRaw.map((v) => {
      const r = v as Record<string, unknown>;
      return {
        id: n(r.id),
        folio: String(r.folio ?? ''),
        total: n(r.total),
        metodoPago: String(r.metodoPago ?? ''),
        creadoEn: String(r.creadoEn ?? ''),
      };
    }),
  };
}

export async function obtenerReporteServicios(desde?: string, hasta?: string): Promise<ReporteServiciosApi> {
  const raw = await get<Record<string, unknown>>(`/api/reportes/servicios${qs(desde, hasta)}`);
  return {
    totalCompletadas: n(raw.totalCompletadas),
    porServicio: Array.isArray(raw.porServicio)
      ? raw.porServicio.map((s) => {
          const r = s as Record<string, unknown>;
          return { servicioId: n(r.servicioId), servicioNombre: String(r.servicioNombre ?? ''), cantidad: n(r.cantidad) };
        })
      : [],
    porEspecialista: Array.isArray(raw.porEspecialista)
      ? raw.porEspecialista.map((e) => {
          const r = e as Record<string, unknown>;
          return { especialistaId: String(r.especialistaId ?? ''), especialistaNombre: String(r.especialistaNombre ?? ''), cantidad: n(r.cantidad) };
        })
      : [],
  };
}

export async function obtenerReporteInventario(): Promise<ReporteInventarioApi> {
  const raw = await get<Record<string, unknown>>('/api/reportes/inventario');
  return {
    totalPresentaciones: n(raw.totalPresentaciones),
    presentacionesBajoStock: Array.isArray(raw.presentacionesBajoStock)
      ? raw.presentacionesBajoStock.map((p) => {
          const r = p as Record<string, unknown>;
          const producto = (r.producto ?? {}) as Record<string, unknown>;
          return {
            id: n(r.id),
            tamanio: String(r.tamanio ?? ''),
            stock: n(r.stock),
            disponible: r.disponible === true,
            producto: {
              id: n(producto.id),
              nombre: String(producto.nombre ?? ''),
              marca: String(producto.marca ?? ''),
              categoria: producto.categoria == null ? null : String(producto.categoria),
            },
          };
        })
      : [],
  };
}

export async function obtenerReporteClientes(desde?: string, hasta?: string): Promise<ReporteClientesApi> {
  const raw = await get<Record<string, unknown>>(`/api/reportes/clientes${qs(desde, hasta)}`);
  return {
    totalNuevos: n(raw.totalNuevos),
    clientes: Array.isArray(raw.clientes)
      ? raw.clientes.map((c) => {
          const r = c as Record<string, unknown>;
          return { id: String(r.id ?? ''), nombre: String(r.nombre ?? ''), email: String(r.email ?? ''), creadoEn: String(r.creadoEn ?? '') };
        })
      : [],
  };
}
