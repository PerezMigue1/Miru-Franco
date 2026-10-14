import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Sin DOM en vitest: se revisa el código del panel (lo usan admin y operación). */
const panel = readFileSync(join(__dirname, 'PanelSegmentacionClientes.tsx'), 'utf8');

describe('Segmentación de clientes: filtros con nombre accesible', () => {
  it('el buscador y el filtro de segmento llevan aria-label', () => {
    expect(panel).toContain('aria-label="Buscar cliente por nombre o correo"');
    expect(panel).toContain('aria-label="Filtrar por segmento"');
  });
});
