import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sin DOM en vitest: estas comprobaciones leen el código de las pantallas del panel (ventas, finanzas y
 * catálogo) para que no vuelvan textos técnicos, alert() nativos ni acciones con un nombre engañoso.
 */
const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf8');

describe('Textos y avisos del panel de ventas y catálogo', () => {
  it('productos: no muestra el nombre de la tabla producto_presentaciones', () => {
    for (const ruta of ['productos/[id]/page.tsx', 'productos/nuevo/page.tsx']) {
      const visibles = leer(ruta)
        .split('\n')
        .filter((l) => l.includes('producto_presentaciones') && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('{/*'));
      expect(visibles, ruta).toEqual([]);
    }
  });

  it('servicios: borrar un servicio solo lo desactiva, así que el botón no dice "Eliminar"', () => {
    const lista = leer('servicios/page.tsx');
    const detalle = leer('servicios/[id]/page.tsx');
    expect(lista).not.toContain('Eliminar definitivamente');
    expect(lista).toContain('Desactivar');
    expect(detalle).not.toMatch(/'Eliminando\.\.\.' : 'Eliminar'/);
    expect(detalle).toContain('Desactivar');
  });

  it('servicios: el precio se muestra con formatearPrecioMXN, no como "$1200"', () => {
    expect(leer('servicios/page.tsx')).not.toContain('>${s.precio}<');
  });

  it('pagos: no pide los pagos de todos los pedidos uno por uno y dice qué abarca', () => {
    const pagina = leer('pagos/page.tsx');
    expect(pagina).not.toContain('listarTodosLosPedidos');
    expect(pagina).toContain('últimos 100 pedidos');
  });

  it('dashboard y devoluciones no se quedan con los 20 primeros pedidos (listarPedidos sin paginar)', () => {
    const sinPaginar = /listarPedidos\(\)/;
    expect(leer('page.tsx')).not.toMatch(sinPaginar);
    expect(leer('../../components/devoluciones/GestionDevoluciones.tsx')).not.toMatch(sinPaginar);
  });

  it('dashboard: cuenta los pedidos por estado sin descargar todo el historial', () => {
    const inicio = leer('page.tsx');
    expect(inicio).not.toContain('listarTodosLosPedidos');
    expect(inicio).toMatch(/listarPedidosPaginado\(\{ estado, limit: 1 \}\)/);
  });

  it('paquetes: sin alert() nativo', () => {
    for (const ruta of ['paquetes/page.tsx', 'paquetes/[id]/page.tsx']) {
      expect(leer(ruta), ruta).not.toMatch(/(^|[^\w.])alert\(/m);
    }
  });
});

describe('Interruptor "Disponible" de una presentación', () => {
  it('su nombre accesible incluye el Sí o No visible además de la etiqueta "Disponible"', () => {
    const fuente = leer('productos/[id]/page.tsx');
    expect(fuente).toContain('id={`disponible-boton-${index}`}');
    expect(fuente).toContain('aria-labelledby={`disponible-${index} disponible-boton-${index}`}');
  });
});
