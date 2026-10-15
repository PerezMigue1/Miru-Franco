import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TEXTO_METODO_PREDICCION,
  csvPrediccion,
  filtrarFilasPrediccion,
  textoCobertura,
} from './prediccionVentas';
import type { FilaPrediccion } from '../../../../services/inventario';

// Entorno node: window y localStorage mínimos antes de importar el cliente real (fetch simulado).
vi.stubGlobal('window', {
  location: { pathname: '/admin/inventario/prediccion', search: '', origin: 'http://localhost:3000', replace: vi.fn() },
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
vi.mock('../../../../services/config', () => ({
  getApiBaseUrl: () => 'http://api.test/api/auth',
  getBackendBaseUrl: () => 'http://api.test',
}));

let servicio: typeof import('../../../../services/inventario');
beforeAll(async () => {
  servicio = await import('../../../../services/inventario');
});

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  fetchMock.mockReset();
  vi.restoreAllMocks();
});

const fila = (p: Partial<FilaPrediccion>): FilaPrediccion => ({
  presentacionId: 1,
  productoId: 10,
  producto: 'Shampoo hidratante',
  marca: 'Miru',
  categoria: 'Cabello',
  tamanio: '250 ml',
  stock: 14,
  unidades8Semanas: 16,
  promedioSemanal: 2,
  promedioDiario: 0.29,
  diasCobertura: 49,
  sinVentasRecientes: false,
  ...p,
});

describe('Predicción con ventas reales: textos y cálculo mostrado', () => {
  it('el texto visible explica el método', () => {
    expect(TEXTO_METODO_PREDICCION).toBe(
      'Calculamos cuántas unidades vendes por semana con el promedio de las últimas 8 semanas (tienda en línea y salón). Los días de cobertura son tu stock actual dividido entre el promedio diario de ventas.',
    );
  });

  it('cobertura: días enteros; sin ventas no se inventa', () => {
    expect(textoCobertura(fila({ diasCobertura: 49 }))).toBe('49 días');
    expect(textoCobertura(fila({ diasCobertura: 1.6 }))).toBe('1 día');
    expect(textoCobertura(fila({ diasCobertura: 0.4 }))).toBe('Menos de 1 día');
    expect(textoCobertura(fila({ diasCobertura: 0, stock: 0 }))).toBe('Sin stock');
    expect(textoCobertura(fila({ diasCobertura: null, sinVentasRecientes: true, unidades8Semanas: 0 }))).toBe('Sin ventas recientes');
  });

  it('filtra por texto (producto, marca o presentación, sin acentos) y por producto', () => {
    const filas = [
      fila({ presentacionId: 1, productoId: 10, producto: 'Shampoo hidratante' }),
      fila({ presentacionId: 2, productoId: 20, producto: 'Acondicionador', marca: 'Kérastase', tamanio: '1 L' }),
    ];
    expect(filtrarFilasPrediccion(filas, { texto: 'kerastase' }).map((f) => f.presentacionId)).toEqual([2]);
    expect(filtrarFilasPrediccion(filas, { texto: '250' }).map((f) => f.presentacionId)).toEqual([1]);
    expect(filtrarFilasPrediccion(filas, { productoId: '20' }).map((f) => f.presentacionId)).toEqual([2]);
    expect(filtrarFilasPrediccion(filas, {})).toHaveLength(2);
  });

  it('CSV con las columnas de la tabla', () => {
    const csv = csvPrediccion([fila({}), fila({ presentacionId: 2, producto: 'Sin "ventas"', unidades8Semanas: 0, promedioSemanal: 0, promedioDiario: 0, diasCobertura: null, sinVentasRecientes: true })]);
    const [encabezado, uno, dos] = csv.split('\n');
    expect(encabezado).toBe('producto,marca,presentacion,stock,vendidas_8_semanas,promedio_semanal,promedio_diario,dias_cobertura');
    expect(uno).toBe('"Shampoo hidratante","Miru","250 ml",14,16,2,0.29,49');
    expect(dos).toBe('"Sin ""ventas""","Miru","250 ml",14,0,0,0,"Sin ventas recientes"');
  });
});

describe('Servicio: GET /api/inventario/prediccion', () => {
  it('pide la predicción al backend y normaliza las filas', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          ventana: { desde: '2026-08-19T06:00:00.000Z', hasta: '2026-10-14T06:00:00.000Z', semanas: 8 },
          count: 1,
          data: [fila({})],
        }),
        { status: 200 },
      ),
    );
    const res = await servicio.obtenerPrediccionInventario();
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/inventario/prediccion');
    expect(res.filas).toEqual([fila({})]);
    expect(res.ventana).toEqual({ desde: '2026-08-19T06:00:00.000Z', hasta: '2026-10-14T06:00:00.000Z', semanas: 8 });
  });
});

describe('Pantalla admin/inventario/prediccion', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('usa la predicción del backend y deja el modelo exponencial basado en stock', () => {
    expect(pagina).toContain('obtenerPrediccionInventario(');
    expect(pagina).not.toMatch(/Math\.exp|estimarKPorProducto|AJUSTE_K_MODELO/);
  });

  it('muestra el texto del método y la tabla con los datos de ventas', () => {
    expect(pagina).toContain('{TEXTO_METODO_PREDICCION}');
    for (const columna of ['Stock actual', 'Vendidas (8 semanas)', 'Promedio semanal', 'Promedio diario', 'Días de cobertura']) {
      expect(pagina).toContain(`'${columna}'`);
    }
    expect(pagina).toContain('textoCobertura(');
  });
});
