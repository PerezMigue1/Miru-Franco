import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

// Sin DOM no se puede pulsar "Continuar": para ver el paso 2 se fuerza `currentStep` (useState(1)) a 2.
let forzarPaso2 = false;
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) => react.useState(forzarPaso2 && inicial === 1 ? 2 : inicial),
  };
});

const { default: Register } = await import('./Register');

afterEach(() => {
  forzarPaso2 = false;
});

const paso2 = () => {
  forzarPaso2 = true;
  return renderToStaticMarkup(createElement(Register));
};

describe('Register paso 1', () => {
  it('la ayuda de contraseña menciona el carácter especial que se exige', () => {
    const html = renderToStaticMarkup(createElement(Register));
    expect(html).toContain('Mínimo 8 caracteres, con mayúsculas, minúsculas, números y caracteres especiales');
  });

  it('"Omitir" la activación sin callback lleva a /login (no a /auth?view=login, que no existe)', () => {
    const fuente = readFileSync(join(__dirname, 'Register.tsx'), 'utf8');
    expect(fuente).not.toContain('/auth?view=login');
  });
});

describe('Register paso 2: etiquetas y grupos accesibles', () => {
  it('muestra el paso 2', () => {
    expect(paso2()).toContain('Cuéntanos sobre tu cabello');
  });

  it.each([
    ['registro-color-natural', 'Color natural (opcional)'],
    ['registro-color-actual', 'Color actual (opcional)'],
    ['registro-productos', 'Productos usados (opcional)'],
  ])('la etiqueta "%s" apunta a su campo', (id, texto) => {
    const html = paso2();
    expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"[^>]*>${texto.replace(/[()]/g, '\\$&')}</label>`));
    expect(html).toMatch(new RegExp(`<input[^>]*id="${id}"`));
  });

  it.each(['Tipo de cabello', '¿Tienes alergias a productos?', '¿Tratamientos químicos previos?'])(
    'las opciones de "%s" van en un fieldset con legend',
    (pregunta) => {
      const html = paso2();
      expect(html).toMatch(new RegExp(`<fieldset[^>]*><legend[^>]*>${pregunta.replace(/[?¿]/g, '\\$&')}</legend>`));
    },
  );
});
