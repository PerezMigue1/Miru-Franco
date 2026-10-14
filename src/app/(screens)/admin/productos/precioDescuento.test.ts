import { describe, expect, it } from 'vitest';
import { preciosFilaDesdePresentacion, recalcularPreciosPorDescuento } from './precioDescuento';

describe('Precios de presentaciones al editar un producto', () => {
  it('al cargar conserva el precio guardado aunque el descuento del producto sea incoherente (producto 134)', () => {
    // Producto 134: precio 350 y descuento 350 en BD. Antes el formulario mostraba 875.
    expect(preciosFilaDesdePresentacion({ precio: '$350', precioOriginal: '$350' })).toEqual({
      precioOriginal: '350',
      precio: '350',
    });
  });

  it('al cargar conserva el precio guardado aunque no coincida con el porcentaje', () => {
    expect(preciosFilaDesdePresentacion({ precio: '$279.50', precioOriginal: '$399' })).toEqual({
      precioOriginal: '399',
      precio: '279.5',
    });
  });

  it('al editar el descuento recalcula sin quedar negativo ni mayor que el precio original', () => {
    const filas = [{ precioOriginal: '350', precio: '350' }];
    expect(recalcularPreciosPorDescuento(filas, '20')[0].precio).toBe('280');
    expect(recalcularPreciosPorDescuento(filas, '350')[0].precio).toBe('0');
    expect(recalcularPreciosPorDescuento(filas, '-50')[0].precio).toBe('350');
  });
});
