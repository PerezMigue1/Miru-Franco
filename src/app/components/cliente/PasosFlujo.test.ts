import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PasosFlujo, { PASOS_RESERVA } from './PasosFlujo';

const html = renderToStaticMarkup(createElement(PasosFlujo, { pasos: PASOS_RESERVA, actual: 1, etiqueta: 'Pasos para reservar' }));
const clasesDe = (etiqueta: string) => [...html.matchAll(new RegExp(`<${etiqueta} [^>]*class="([^"]*)"`, 'g'))].map((m) => m[1]);

/** A 375 px el último paso ("Confirmar") quedaba cortado en "Con": la fila se desplazaba sin aviso. */
describe('PasosFlujo en pantallas angostas', () => {
  it('la lista no se desplaza de lado ni esconde pasos', () => {
    const [ol] = clasesDe('ol');
    expect(ol).not.toContain('overflow-x-auto');
  });

  it('las etiquetas envuelven solo entre palabras: nunca "Servici/o" ni "Confirma/r"', () => {
    for (const li of clasesDe('li')) {
      expect(li).not.toContain('shrink-0');
      expect(li).not.toContain('min-w-0');
    }
    expect(html).not.toContain('break-words');
    expect(html).not.toContain('break-all');
  });

  it('en móvil los separadores se ocultan para que los tres pasos quepan completos', () => {
    const separadores = [...html.matchAll(/<span class="([^"]*h-px[^"]*)"/g)].map((m) => m[1]);
    expect(separadores.length).toBe(2);
    for (const c of separadores) expect(c.split(" ")).toEqual(expect.arrayContaining(["hidden", "sm:block"]));
  });
});
