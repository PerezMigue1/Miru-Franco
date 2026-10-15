import { describe, expect, it } from 'vitest';
import { estadoProductoAdmin } from './estadoProducto';

/**
 * Detalle admin de un producto con borrado lógico: muestra si está activo y ofrece la acción que
 * corresponde con su texto fiel: "Desactivar" (no borra nada) o "Reactivar".
 */
describe('estadoProductoAdmin', () => {
  it('un producto activo se puede desactivar', () => {
    expect(estadoProductoAdmin(true)).toMatchObject({ estado: 'Activo', variante: 'success', accion: 'Desactivar' });
  });

  it('un producto sin el campo activo cuenta como activo', () => {
    expect(estadoProductoAdmin(undefined)).toMatchObject({ estado: 'Activo', accion: 'Desactivar' });
  });

  it('un producto desactivado se puede reactivar', () => {
    expect(estadoProductoAdmin(false)).toMatchObject({ estado: 'Inactivo', variante: 'default', accion: 'Reactivar' });
  });

  it('la confirmación de desactivar dice lo que pasa de verdad (no habla de eliminar)', () => {
    const { confirmacion } = estadoProductoAdmin(true);
    expect(confirmacion.titulo).toBe('Desactivar producto');
    expect(confirmacion.mensaje('Shampoo')).toBe(
      '¿Desactivar "Shampoo"? Dejará de mostrarse en la tienda y en el punto de venta, y no se podrá vender. Los pedidos y ventas pasados no cambian. Puedes reactivarlo cuando quieras.',
    );
    expect(confirmacion.mensaje('Shampoo')).not.toMatch(/elimin/i);
  });
});
