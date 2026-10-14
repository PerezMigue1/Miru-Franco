import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ResetPassword, { expiracionEnlaceRecuperacion } from './ResetPassword';

describe('ResetPassword desde el enlace del correo', () => {
  it('sin token: "Enlace inválido o incompleto" con botón a /forgot-password y sin formulario', () => {
    const html = renderToStaticMarkup(createElement(ResetPassword, { desdeEnlace: true, email: 'ana@correo.com' }));
    expect(html).toContain('Enlace inválido o incompleto');
    expect(html).toContain('href="/forgot-password"');
    expect(html).not.toContain('<form');
  });

  it('sin email: mismo aviso', () => {
    const html = renderToStaticMarkup(createElement(ResetPassword, { desdeEnlace: true, token: 'abc' }));
    expect(html).toContain('Enlace inválido o incompleto');
    expect(html).not.toContain('<form');
  });

  it('sin token ni email: mismo aviso', () => {
    const html = renderToStaticMarkup(createElement(ResetPassword, { desdeEnlace: true }));
    expect(html).toContain('Enlace inválido o incompleto');
    expect(html).not.toContain('<form');
  });

  it('el flujo de código (OTP, SMS, preguntas) sigue mostrando el formulario', () => {
    const html = renderToStaticMarkup(createElement(ResetPassword, { identifier: 'ana@correo.com' }));
    expect(html).not.toContain('Enlace inválido o incompleto');
    expect(html).toContain('<form');
  });

  it('el enlace expira localmente a los 10 minutos, como en el backend', () => {
    expect(expiracionEnlaceRecuperacion(1_000)).toBe(1_000 + 10 * 60 * 1000);
  });
});

describe('ResetPassword: código fuente', () => {
  const fuente = readFileSync(join(__dirname, 'ResetPassword.tsx'), 'utf8');

  it('sin emojis en los mensajes', () => {
    expect(fuente).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('sin console.log en producción', () => {
    expect(fuente).not.toMatch(/console\.log\(/);
  });
});

describe('Página /reset-password', () => {
  it('pasa desdeEnlace al formulario', () => {
    const pagina = readFileSync(join(__dirname, '..', '..', '(screens)', '(public)', 'reset-password', 'page.tsx'), 'utf8');
    expect(pagina).toMatch(/<ResetPassword[\s\S]*desdeEnlace/);
  });
});
