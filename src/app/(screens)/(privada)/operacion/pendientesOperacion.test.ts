import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pendientes del bloque G que viven en el marcado de las páginas de operación (sin DOM en vitest):
 * se revisa el código fuente, como en portalClienta.test.ts y textosPanelVentas.test.ts.
 */
const leer = (...partes: string[]) => readFileSync(join(__dirname, ...partes), 'utf8');
const leerComponente = (...partes: string[]) =>
  readFileSync(join(__dirname, '..', '..', '..', 'components', ...partes), 'utf8');

const gestionCitas = leer('gestion-citas', 'page.tsx');
const cobroSinCita = leer('cobro-sin-cita', 'page.tsx');
const seguimiento = leer('seguimiento-post-servicio', 'page.tsx');
const ejecucion = leer('ejecucion-servicios', 'page.tsx');
const agenda = leer('agenda-calendario', 'page.tsx');
const panelPedidos = leerComponente('pedidos', 'PanelPedidosOnline.tsx');
const panelSegmentacion = leerComponente('clientes', 'PanelSegmentacionClientes.tsx');

describe('Buscador de clienta en vez de precargar la lista completa', () => {
  it.each([
    ['gestion-citas', gestionCitas],
    ['cobro-sin-cita', cobroSinCita],
    ['seguimiento-post-servicio', seguimiento],
  ])('%s usa BuscadorClienta y ya no llama listarClientes', (_pagina, fuente) => {
    expect(fuente).toContain('<BuscadorClienta');
    expect(fuente).not.toMatch(/listarClientes\s*\(/);
    expect(fuente).not.toContain('listarClientes({ limit: 200 })');
  });

  it.each([
    ['gestion-citas', gestionCitas],
    ['cobro-sin-cita', cobroSinCita],
    ['seguimiento-post-servicio', seguimiento],
  ])('en %s ningún limit: 200 restante precarga clientas (solo el catálogo de empleados)', (_pagina, fuente) => {
    for (const linea of fuente.split('\n').filter((l) => l.includes('limit: 200'))) {
      expect(linea).toContain('listarEmpleados');
    }
  });
});

describe('Aviso al registrar materiales en ejecución de servicios', () => {
  it('tras registrar materiales muestra showToast y recarga la lista con cargar()', () => {
    const idx = ejecucion.indexOf("showToast('Materiales registrados'");
    expect(idx, 'no se encontró el toast de materiales registrados').toBeGreaterThan(-1);
    // El toast y la recarga viven en el mismo manejador, justo después de registrar.
    const despuesDelToast = ejecucion.slice(idx, idx + 120);
    expect(despuesDelToast).toMatch(/cargar\(\)/);
    const manejador = ejecucion.slice(ejecucion.indexOf('handleRegistrarMateriales'), idx + 120);
    expect(manejador).toContain('await registrarMateriales(');
  });
});

describe('Accesibilidad de filtros y botones de operación', () => {
  it('agenda-calendario: el filtro de especialista tiene aria-label y los botones de mes área táctil mínima', () => {
    expect(agenda).toContain('aria-label="Filtrar por especialista"');
    for (const etiqueta of ['aria-label="Mes anterior"', 'aria-label="Mes siguiente"']) {
      const idx = agenda.indexOf(etiqueta);
      expect(idx, `no se encontró ${etiqueta}`).toBeGreaterThan(-1);
      // El className con min-h-11 acompaña al aria-label dentro del mismo <button>.
      const boton = agenda.slice(idx, agenda.indexOf('</button>', idx));
      expect(boton).toContain('min-h-11');
    }
  });

  it('PanelPedidosOnline: su filtro de búsqueda tiene aria-label', () => {
    expect(panelPedidos).toMatch(/aria-label="Buscar pedidos por clienta, email o número de pedido"/);
  });

  it('PanelSegmentacionClientes: búsqueda y filtro de segmento tienen aria-label', () => {
    expect(panelSegmentacion).toContain('aria-label="Buscar cliente por nombre o correo"');
    expect(panelSegmentacion).toContain('aria-label="Filtrar por segmento"');
  });
});
