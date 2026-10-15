import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

describe('Inicio de /admin', () => {
  /** Recharts avisaba "width(-1) and height(-1) of chart…": el contenedor medía -1 en el primer pintado. */
  it('cada ResponsiveContainer arranca con dimensiones iniciales', () => {
    const contenedores = [...fuente.matchAll(/<ResponsiveContainer\b[^>]*>/g)].map((m) => m[0]);
    expect(contenedores.length).toBeGreaterThan(0);
    for (const c of contenedores) expect(c, c).toMatch(/initialDimension=\{\{\s*width:\s*\d+,\s*height:\s*\d+\s*\}\}/);
  });

  /** B4: "Ver agenda", "Ver todos", los accesos rápidos y los enlaces de análisis medían menos de 44 px. */
  it('los enlaces de la pantalla tienen al menos 44 px de alto', () => {
    const enlaces = [...fuente.matchAll(/<Link\b[\s\S]*?className="([^"]*)"/g)].map((m) => m[1]);
    expect(enlaces.length).toBeGreaterThan(5);
    for (const clases of enlaces) expect(clases.split(/\s+/), clases).toContain('min-h-11');
  });
});
