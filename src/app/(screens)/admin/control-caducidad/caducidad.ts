import type { CaducidadApi } from '../../../services/inventarioMovimientos';
import { formatearFechaSoloDia } from '../../../utils/fechaSoloDia';

/** Fila de la tabla de caducidades. El backend no manda fecha de apertura, así que no hay columna para ella. */
export interface ProductoCaducidad {
  id: number;
  nombre: string;
  /** dd/mm/aaaa o "-" */
  fechaCaducidad: string;
  estado: 'vigente' | 'proximo' | 'vencido';
  diasRestantes: number;
}

export function mapearCaducidad(c: CaducidadApi, idx: number): ProductoCaducidad {
  let estado: 'vigente' | 'proximo' | 'vencido' = 'vigente';
  if (c.diasRestantes < 0) estado = 'vencido';
  else if (c.diasRestantes <= 30) estado = 'proximo';
  return {
    id: c.presentacionId || idx,
    nombre: [c.productoNombre, c.tamanio].filter(Boolean).join(' ') || '-',
    // Día de calendario (guardado en UTC): sin desfase por la zona del navegador.
    fechaCaducidad: formatearFechaSoloDia(c.fechaCaducidad, { day: '2-digit', month: '2-digit', year: 'numeric' }) ?? '-',
    estado,
    diasRestantes: c.diasRestantes,
  };
}

/** Subtítulo con el número de productos monitoreados. */
export function textoMonitoreados(n: number): string {
  return n === 1 ? '1 producto monitoreado' : `${n} productos monitoreados`;
}
