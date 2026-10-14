import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El entorno de pruebas no tiene DOM: se revisa el código fuente de la página. */
const fuente = readFileSync(join(process.cwd(), 'src', 'app', '(screens)', 'admin', 'quejas-garantias', 'page.tsx'), 'utf-8');

describe('Quejas y garantías: registrar un caso', () => {
  it('la clienta se busca con BuscadorClienta (no un select con las primeras 50)', () => {
    expect(fuente).toContain('<BuscadorClienta');
    expect(fuente).not.toMatch(/listarClientes\(\)/);
  });

  it('no pide una "Fecha del Servicio" que nunca se envía (el DTO no la acepta)', () => {
    expect(fuente).not.toContain('Fecha del Servicio');
  });
});

describe('Quejas y garantías: resolver un caso', () => {
  it('si falla, el error se muestra', () => {
    const resolver = fuente.slice(fuente.indexOf('const resolver = async'), fuente.indexOf('const openEditar'));
    expect(resolver).toMatch(/catch\s*\(\w+\)\s*\{[^}]*setError\(/);
  });
});
