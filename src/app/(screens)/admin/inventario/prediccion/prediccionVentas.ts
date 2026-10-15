import type { FilaPrediccion } from '../../../../services/inventario';

/** Texto visible en la pantalla: cómo se calcula la predicción. */
export const TEXTO_METODO_PREDICCION =
  'Calculamos cuántas unidades vendes por semana con el promedio de las últimas 8 semanas (tienda en línea y salón). Los días de cobertura son tu stock actual dividido entre el promedio diario de ventas.';

/** Días de cobertura en días enteros (hacia abajo); sin ventas no se inventa una cobertura. */
export function textoCobertura(fila: FilaPrediccion): string {
  if (fila.diasCobertura === null) return 'Sin ventas recientes';
  if (fila.diasCobertura <= 0) return 'Sin stock';
  if (fila.diasCobertura < 1) return 'Menos de 1 día';
  const dias = Math.floor(fila.diasCobertura);
  return dias === 1 ? '1 día' : `${dias} días`;
}

const sinAcentos = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Búsqueda por producto, marca o presentación, y filtro por producto (?producto= en la URL). */
export function filtrarFilasPrediccion(
  filas: FilaPrediccion[],
  filtro: { texto?: string; productoId?: string | null },
): FilaPrediccion[] {
  const texto = sinAcentos(filtro.texto?.trim() ?? '');
  return filas.filter((f) => {
    if (filtro.productoId && String(f.productoId) !== String(filtro.productoId)) return false;
    if (!texto) return true;
    return sinAcentos(`${f.producto} ${f.marca} ${f.tamanio}`).includes(texto);
  });
}

const celda = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** CSV de la tabla (mismas columnas). */
export function csvPrediccion(filas: FilaPrediccion[]): string {
  const encabezado = 'producto,marca,presentacion,stock,vendidas_8_semanas,promedio_semanal,promedio_diario,dias_cobertura';
  const renglones = filas.map((f) =>
    [
      celda(f.producto),
      celda(f.marca),
      celda(f.tamanio),
      f.stock,
      f.unidades8Semanas,
      f.promedioSemanal,
      f.promedioDiario,
      f.diasCobertura === null ? celda('Sin ventas recientes') : f.diasCobertura,
    ].join(','),
  );
  return [encabezado, ...renglones].join('\n');
}
