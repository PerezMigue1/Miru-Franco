import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Sin DOM no se puede enviar el formulario: para ver la pantalla del código se fuerza `codeSent`
// (quinto useState del componente) a true.
let forzarCodigoEnviado = false;
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  let llamada = 0;
  return {
    ...react,
    useState: (inicial: unknown) => {
      llamada += 1;
      const indice = (llamada - 1) % 7;
      return react.useState(forzarCodigoEnviado && indice === 4 ? true : inicial);
    },
  };
});

const { default: ForgotPasswordSMS } = await import('./ForgotPasswordSMS');
const { MENSAJE_FORMATO_TELEFONO } = await import('../../utils/phone');

const ENLACE_CORREO = /Recuperar con mi correo/;

afterEach(() => {
  forzarCodigoEnviado = false;
});

describe('ForgotPasswordSMS: mismo formato de teléfono que el registro', () => {
  it('ayuda de 10 dígitos sin +52 y placeholder de 10 dígitos', () => {
    const html = renderToStaticMarkup(createElement(ForgotPasswordSMS));
    expect(html).toContain(MENSAJE_FORMATO_TELEFONO);
    expect(html).toContain('placeholder="5512345678"');
    expect(html).not.toContain('código de país');
  });
});

describe('ForgotPasswordSMS: siempre ofrece recuperar con el correo', () => {
  it('pantalla del teléfono sin callbacks: enlace a /forgot-password', () => {
    const html = renderToStaticMarkup(createElement(ForgotPasswordSMS));
    expect(html).toMatch(ENLACE_CORREO);
    expect(html).toContain('href="/forgot-password"');
  });

  it('pantalla del código: muestra la opción del correo junto al mensaje', () => {
    forzarCodigoEnviado = true;
    const html = renderToStaticMarkup(createElement(ForgotPasswordSMS, { onSwitchToEmail: () => undefined }));
    expect(html).toContain('Código de Verificación');
    expect(html).toMatch(ENLACE_CORREO);
  });

  it('pantalla del código sin callbacks: enlace a /forgot-password', () => {
    forzarCodigoEnviado = true;
    const html = renderToStaticMarkup(createElement(ForgotPasswordSMS));
    expect(html).toContain('Código de Verificación');
    expect(html).toContain('href="/forgot-password"');
  });
});
