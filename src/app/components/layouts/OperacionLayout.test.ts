import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Sin DOM en vitest: se revisa el código del layout (mismo patrón que PanelSegmentacionClientes.test.ts). */
const layout = readFileSync(join(__dirname, 'OperacionLayout.tsx'), 'utf8');
const pagina = readFileSync(
  join(__dirname, '..', '..', '(screens)', '(privada)', 'operacion', 'cobro-sin-cita', 'page.tsx'),
  'utf8',
);

describe('Menú de operación: Cobro sin cita', () => {
  it('NAV_ITEMS trae el enlace con el permiso ventas:escritura y un ícono, junto al punto de venta', () => {
    const item = layout.match(/\{[^}]*label: 'Cobro sin cita'[^}]*\}/)?.[0];
    expect(item).toBeDefined();
    expect(item).toContain("href: '/operacion/cobro-sin-cita'");
    expect(item).toContain("permiso: 'ventas:escritura'");
    expect(item).toMatch(/icon: [A-Za-z]+/);
    // Junto al punto de venta: entre 'Punto de venta' y 'Pedidos online' en NAV_ITEMS.
    const posicion = layout.indexOf("label: 'Cobro sin cita'");
    expect(posicion).toBeGreaterThan(layout.indexOf("label: 'Punto de venta'"));
    expect(posicion).toBeLessThan(layout.indexOf("label: 'Pedidos online'"));
  });

  it('la ruta queda protegida con el mismo permiso (permisoRequerido en la página)', () => {
    expect(pagina).toContain('<OperacionLayout permisoRequerido="ventas:escritura">');
  });
});

describe('Menú de operación: mismas etiquetas que el título y la miga', () => {
  it('la agenda se llama "Agenda y calendario" en el menú', () => {
    expect(layout).toContain("label: 'Agenda y calendario', href: '/operacion/agenda-calendario'");
    expect(layout).not.toContain('Agenda / Calendario');
  });
});
