import type { BadgeVariant } from '../../../utils/categoryColors';

/**
 * Estado de un producto en su detalle admin (borrado lógico con productos.activo) y la acción que
 * corresponde, con su texto fiel: desactivar no borra nada y se puede revertir.
 */
export function estadoProductoAdmin(activo: boolean | undefined) {
  const confirmacion = {
    titulo: 'Desactivar producto',
    mensaje: (nombre: string) =>
      `¿Desactivar "${nombre}"? Dejará de mostrarse en la tienda y en el punto de venta, y no se podrá vender. Los pedidos y ventas pasados no cambian. Puedes reactivarlo cuando quieras.`,
  };
  if (activo === false) {
    return { estado: 'Inactivo', variante: 'default' as BadgeVariant, accion: 'Reactivar', confirmacion };
  }
  return { estado: 'Activo', variante: 'success' as BadgeVariant, accion: 'Desactivar', confirmacion };
}
