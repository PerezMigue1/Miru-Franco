// Casillas del registro con correo (propuesta del verificador, integrada y ampliada con el foco de la casilla de salud).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, replace: () => undefined }) }));
const forzar = vi.hoisted(() => ({ paso2: false, conAlergias: false }));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react, useState: (inicial: unknown) => react.useState(forzar.paso2 && inicial === 1 ? 2 : inicial) };
});
// Con alergias marcadas desde el inicio, para que se pinte la casilla de datos de salud.
vi.mock('react-hook-form', async (original) => {
  const rhf = await original<typeof import('react-hook-form')>();
  return {
    ...rhf,
    useForm: (opciones: Parameters<typeof rhf.useForm>[0]) =>
      rhf.useForm(
        forzar.conAlergias
          ? { ...opciones, defaultValues: { ...(opciones?.defaultValues as object), hasAllergies: 'yes', allergies: 'Látex' } }
          : opciones,
      ),
  };
});
// La casilla de salud real, pero guardando las props que recibe (para ver si llega el ref del formulario).
const propsSalud = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock('../legal/CasillaDatosSalud', async (original) => {
  const real = await original<typeof import('../legal/CasillaDatosSalud')>();
  return {
    default: (props: Record<string, unknown>) => {
      propsSalud.push(props);
      return real.default(props as Parameters<typeof real.default>[0]);
    },
  };
});

const { default: Register } = await import('./Register');
const fuente = readFileSync(join(__dirname, 'Register.tsx'), 'utf8');
const paso2 = () => {
  forzar.paso2 = true;
  return renderToStaticMarkup(createElement(Register));
};
afterEach(() => {
  forzar.paso2 = false;
  forzar.conAlergias = false;
  propsSalud.length = 0;
});
const inputDe = (html: string, id: string) => html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? '';

describe('Register: casillas (huecos de las pruebas actuales)', () => {
  it('promociones es opcional: sin regla de validación y sin aria-required; Términos y Aviso con aria-required', () => {
    expect(fuente).toMatch(/name="recibePromociones"\s*control=\{control\}\s*render=/);
    const html = paso2();
    expect(inputDe(html, 'registro-promociones')).not.toContain('aria-required');
    expect(inputDe(html, 'registro-terminos')).toContain('aria-required="true"');
    expect(inputDe(html, 'registro-aviso')).toContain('aria-required="true"');
  });

  it('la casilla de datos de salud bloquea el envío si hay alergias sin autorizar', () => {
    expect(fuente).toMatch(/name="consienteDatosSensibles"[\s\S]{0,120}rules=\{\{\s*validate:[\s\S]{0,40}errorConsentimientoAlergias\(/);
  });

  it('las casillas legales reciben el ref del formulario (react-hook-form les pone el foco al fallar)', () => {
    expect(fuente).toMatch(/<CasillaDocumento[\s\S]{0,160}ref=\{field\.ref\}/);
  });

  it('la casilla de datos de salud también recibe el ref del formulario (recibe el foco si falta marcarla)', () => {
    forzar.conAlergias = true;
    const html = paso2();
    expect(html).toContain('Autorizo el uso de mis datos de salud');
    expect(propsSalud.length).toBeGreaterThan(0);
    expect(typeof propsSalud[propsSalud.length - 1].ref).toBe('function');
  });

  it('cada opción de radio (tipo de cabello, alergias, tratamientos) tiene objetivo de 44 px en su etiqueta', () => {
    const html = paso2();
    const etiquetas = [...html.matchAll(/<label([^>]*)>(?:(?!<\/label>)[\s\S])*?type="radio"/g)].map(([, atributos]) => atributos);
    expect(etiquetas).toHaveLength(7);
    for (const a of etiquetas) expect(a).toMatch(/class="[^"]*\bmin-h-11\b/);
  });

  it('rutaOrigen es la página real donde se marcaron (/register o /login), no un valor fijo', () => {
    expect(fuente).toMatch(/construirPayloadRegistro\([\s\S]{0,160}window\.location\.pathname/);
  });
});
