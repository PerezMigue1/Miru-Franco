/** KPIs del mes en Reportes a partir de las tres consultas (Promise.allSettled). */
export function kpisDesdeResultados(
  ventas: PromiseSettledResult<{ ingresos: { total: number }; resumen: { totalUnidadesVendidas: number } }>,
  servicios: PromiseSettledResult<{ totalCompletadas: number }>,
  clientes: PromiseSettledResult<{ totalNuevos: number }>,
) {
  return {
    ventasMonto: ventas.status === 'fulfilled' ? ventas.value.ingresos.total : 0,
    unidadesVendidas: ventas.status === 'fulfilled' ? ventas.value.resumen.totalUnidadesVendidas : 0,
    serviciosCompletados: servicios.status === 'fulfilled' ? servicios.value.totalCompletadas : 0,
    clientesNuevos: clientes.status === 'fulfilled' ? clientes.value.totalNuevos : 0,
    errorVentas: ventas.status === 'rejected',
    errorServicios: servicios.status === 'rejected',
    errorClientes: clientes.status === 'rejected',
  };
}
