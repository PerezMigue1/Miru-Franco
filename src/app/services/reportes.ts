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
  ventas: { id: number; folio: string; total: number; metodoPago: string; creadoEn: string }[];
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

export async function obtenerReporteVentas(desde?: string, hasta?: string): Promise<ReporteVentasApi> {
  const raw = await get<Record<string, unknown>>(`/api/reportes/ventas${qs(desde, hasta)}`);
  const resumenRaw = (raw.resumen ?? {}) as Record<string, unknown>;
  const metodoRaw = (resumenRaw.porMetodo ?? {}) as Record<string, unknown>;
  const ventasRaw = Array.isArray(raw.ventas) ? raw.ventas : [];
  return {
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
