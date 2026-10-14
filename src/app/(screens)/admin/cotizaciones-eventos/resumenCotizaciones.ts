import type { CotizacionApi } from '../../../services/cotizaciones';

/** "Monto total" del KPI de cotizaciones: las canceladas no cuentan. */
export function montoTotalCotizaciones(cotizaciones: Pick<CotizacionApi, 'estado' | 'monto'>[]): number {
  const centavos = cotizaciones
    .filter((c) => c.estado !== 'cancelada')
    .reduce((acc, c) => acc + Math.round(c.monto * 100), 0);
  return centavos / 100;
}

/** Subtítulo con el número de cotizaciones registradas ("1 cotización registrada", "3 cotizaciones registradas"). */
export function textoCotizacionesRegistradas(n: number): string {
  return n === 1 ? '1 cotización registrada' : `${n} cotizaciones registradas`;
}
