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

describe('Register: casillas legales y minimización (puntos 23 y 26)', () => {
  const fuente = () => readFileSync(join(__dirname, 'Register.tsx'), 'utf8');

  it('el paso 2 tiene tres casillas separadas (Términos, Aviso y promociones), ninguna premarcada', () => {
    const html = paso2();
    const casillas = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
    expect(casillas).toHaveLength(3);
    for (const casilla of casillas) expect(casilla).not.toMatch(/\bchecked\b/);
    for (const id of ['registro-terminos', 'registro-aviso', 'registro-promociones']) {
      expect(html).toContain(`for="${id}"`);
    }
    expect(html).toContain('href="/terminos-y-condiciones"');
    expect(html).toContain('href="/aviso-de-privacidad"');
  });

  it('ya no da por aceptados los Términos con una leyenda: ahora es una casilla', () => {
    expect(paso2()).not.toContain('Al crear tu cuenta aceptas los');
  });

  it('una casilla obligatoria sin marcar bloquea el envío con su mensaje', () => {
    const texto = fuente();
    expect(texto).toMatch(/name="aceptaTerminos"[\s\S]{0,200}errorCasillaAlta\('aceptaTerminos'/);
    expect(texto).toMatch(/name="aceptaAvisoPrivacidad"[\s\S]{0,200}errorCasillaAlta\('aceptaAvisoPrivacidad'/);
  });

  it('el payload sale de construirPayloadRegistro (casillas, documentos y ruta de origen)', () => {
    expect(fuente()).toContain('construirPayloadRegistro(');
  });

  it('fecha de nacimiento y perfil capilar son opcionales; el teléfono sigue obligatorio', () => {
    const texto = fuente();
    expect(texto).not.toContain('La fecha de nacimiento es requerida');
    expect(texto).not.toContain('Selecciona tu tipo de cabello');
    expect(texto).not.toContain('Debes indicar si tienes alergias a productos');
    expect(texto).not.toContain('Debes indicar si has tenido tratamientos químicos previos');
    expect(texto).toContain("required: 'El teléfono es requerido'");
    const html = renderToStaticMarkup(createElement(Register));
    expect(html).toContain('Fecha de nacimiento (opcional)');
  });

  it('la casilla de datos de salud solo aparece cuando se capturan alergias', () => {
    expect(paso2()).not.toContain('Autorizo el uso de mis datos de salud');
    expect(fuente()).toMatch(/hasAllergiesValue === 'yes' && \(\s*<Controller\s+name="consienteDatosSensibles"/);
  });
});
