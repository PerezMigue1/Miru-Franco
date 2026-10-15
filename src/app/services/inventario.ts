'use client';

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/** Fila de GET /api/inventario/prediccion: una presentación de un producto activo. */
export interface FilaPrediccion {
  presentacionId: number;
  productoId: number;
  producto: string;
  marca: string;
  categoria: string | null;
  tamanio: string;
  stock: number;
  /** Unidades vendidas en las últimas 8 semanas (tienda en línea y salón). */
  unidades8Semanas: number;
  promedioSemanal: number;
  promedioDiario: number;
  /** Stock / promedio diario; null si no hubo ventas recientes. */
  diasCobertura: number | null;
  sinVentasRecientes: boolean;
}

export interface PrediccionInventario {
  filas: FilaPrediccion[];
  ventana: { desde: string; hasta: string; semanas: number } | null;
}

const numero = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function normalizarFila(x: unknown): FilaPrediccion | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const cobertura = r.diasCobertura == null ? null : numero(r.diasCobertura);
  return {
    presentacionId: numero(r.presentacionId),
    productoId: numero(r.productoId),
    producto: String(r.producto ?? ''),
    marca: String(r.marca ?? ''),
    categoria: r.categoria == null ? null : String(r.categoria),
    tamanio: String(r.tamanio ?? ''),
    stock: numero(r.stock),
    unidades8Semanas: numero(r.unidades8Semanas),
    promedioSemanal: numero(r.promedioSemanal),
    promedioDiario: numero(r.promedioDiario),
    diasCobertura: cobertura,
    sinVentasRecientes: r.sinVentasRecientes === true || cobertura === null,
  };
}

/** Predicción de inventario con las ventas reales de las últimas 8 semanas (inventario:lectura). */
export async function obtenerPrediccionInventario(): Promise<PrediccionInventario> {
  const res = await apiClient.get<{ data?: unknown[]; ventana?: PrediccionInventario['ventana'] }>(
    '/api/inventario/prediccion',
    { customBase: getBackendBaseUrl() },
  );
  const filas = (Array.isArray(res?.data) ? res.data : [])
    .map(normalizarFila)
    .filter((f): f is FilaPrediccion => f !== null);
  return { filas, ventana: res?.ventana ?? null };
}
