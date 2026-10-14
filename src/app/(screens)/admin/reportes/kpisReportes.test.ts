import { describe, expect, it } from 'vitest';
import { kpisDesdeResultados } from './kpisReportes';

const ok = <T,>(value: T): PromiseFulfilledResult<T> => ({ status: 'fulfilled', value });
const fallo: PromiseRejectedResult = { status: 'rejected', reason: new Error('El servicio no está disponible') };

describe('KPIs de Reportes', () => {
  it('con datos muestra los valores', () => {
    const k = kpisDesdeResultados(
      ok({ ingresos: { total: 1500.5 }, resumen: { totalUnidadesVendidas: 12 } }),
      ok({ totalCompletadas: 30 }),
      ok({ totalNuevos: 4 }),
    );
    expect(k).toMatchObject({ ventasMonto: 1500.5, unidadesVendidas: 12, serviciosCompletados: 30, clientesNuevos: 4 });
    expect(k.errorVentas || k.errorServicios || k.errorClientes).toBe(false);
  });

  it('una consulta que falla queda marcada como error (no se muestra como $0.00 o 0)', () => {
    const k = kpisDesdeResultados(fallo, ok({ totalCompletadas: 30 }), fallo);
    expect(k.errorVentas).toBe(true);
    expect(k.errorServicios).toBe(false);
    expect(k.errorClientes).toBe(true);
  });
});
