import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

/** Etiqueta de apertura del Button que tiene `aria-label`. */
const boton = (etiqueta: string) => pagina.match(new RegExp(`<Button\\b[^>]*?aria-label="${etiqueta}"`))?.[0] ?? '';

describe('Carrito: objetivos de 44 px en la cantidad', () => {
  it('"Quitar uno" y "Agregar uno" miden 44 x 44', () => {
    for (const etiqueta of ['Quitar uno', 'Agregar uno']) {
      const b = boton(etiqueta);
      expect(b, etiqueta).toMatch(/\bw-11 h-11\b/);
      expect(b, etiqueta).not.toMatch(/\bw-9\b|\bh-9\b/);
    }
  });
});

describe('Carrito vacío: sin resumen en $0', () => {
  it('el resumen y su botón solo se muestran con productos', () => {
    expect(pagina).toMatch(/const hayProductos = items\.length > 0;/);
    const resumen = pagina.indexOf('Resumen de Compra');
    const condicion = pagina.lastIndexOf('{hayProductos && (', resumen);
    expect(condicion).toBeGreaterThan(-1);
    // Entre la condición y el título no se cierra otro bloque: el resumen completo depende de hayProductos.
    expect(pagina.slice(condicion, resumen)).not.toMatch(/\)\}/);
  });

  it('sin productos, la tarjeta del carrito vacío ocupa todo el ancho (sin la columna del resumen)', () => {
    expect(pagina).toMatch(/hayProductos \? 'lg:grid-cols-\[minmax\(0,1fr\)_22rem\]' : ''/);
  });
});
