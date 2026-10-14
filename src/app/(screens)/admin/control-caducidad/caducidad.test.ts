import { describe, expect, it } from 'vitest';
import { mapearCaducidad, textoMonitoreados } from './caducidad';

const base = { presentacionId: 7, productoNombre: 'Shampoo', tamanio: '500ml', stock: 3, vencida: false };

describe('Control de caducidad', () => {
  it('la fecha se muestra como dd/mm/aaaa (no ISO crudo) y sin desfase de zona horaria', () => {
    const fila = mapearCaducidad({ ...base, fechaCaducidad: '2026-11-05T00:00:00.000Z', diasRestantes: 22 }, 0);
    expect(fila.fechaCaducidad).toBe('05/11/2026');
    expect(fila.estado).toBe('proximo');
  });

  it('sin fecha muestra un guion', () => {
    expect(mapearCaducidad({ ...base, fechaCaducidad: null, diasRestantes: -3 }, 0).fechaCaducidad).toBe('-');
  });

  it('no inventa una fecha de apertura que el backend no manda', () => {
    const fila = mapearCaducidad({ ...base, fechaCaducidad: '2026-11-05T00:00:00.000Z', diasRestantes: 22 }, 0);
    expect('fechaApertura' in fila).toBe(false);
  });

  it('plural correcto', () => {
    expect(textoMonitoreados(1)).toBe('1 producto monitoreado');
    expect(textoMonitoreados(0)).toBe('0 productos monitoreados');
    expect(textoMonitoreados(4)).toBe('4 productos monitoreados');
  });
});
