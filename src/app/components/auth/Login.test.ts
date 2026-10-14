import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

let parametros = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  useSearchParams: () => parametros,
}));

const { default: Login, erroresDeLogin } = await import('./Login');
const { default: Register } = await import('./Register');
const { default: ForgotPassword } = await import('./ForgotPassword');
const { default: ForgotPasswordSMS } = await import('./ForgotPasswordSMS');
const { default: ForgotPasswordSecurityQuestions } = await import('./ForgotPasswordSecurityQuestions');
const { default: ResetPassword } = await import('./ResetPassword');

afterEach(() => {
  parametros = new URLSearchParams();
});

const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const fors = (html: string) => [...html.matchAll(/\sfor="([^"]+)"/g)].map((m) => m[1]);

describe('Login: avisos por la URL (mismo HTML en servidor y cliente)', () => {
  it('?passwordChanged=true muestra el aviso desde el primer render (sin leer window: error #418)', () => {
    parametros = new URLSearchParams('passwordChanged=true');
    const html = renderToStaticMarkup(createElement(Login));
    expect(html).toContain('Contraseña cambiada exitosamente');
  });

  it('?error=google muestra un aviso en español', () => {
    parametros = new URLSearchParams('error=google');
    const html = renderToStaticMarkup(createElement(Login));
    expect(html).toContain('No pudimos iniciar sesión con Google. Intenta de nuevo o entra con tu correo.');
  });

  it('sin parámetros no hay avisos', () => {
    const html = renderToStaticMarkup(createElement(Login));
    expect(html).not.toContain('Contraseña cambiada exitosamente');
    expect(html).not.toContain('No pudimos iniciar sesión con Google');
  });
});

describe('AuthContainer: Login lee la URL con useSearchParams', () => {
  it('Login va dentro de <Suspense> (/register y /forgot-password no tienen uno propio)', () => {
    const fuente = readFileSync(join(__dirname, 'AuthContainer.tsx'), 'utf8');
    expect(fuente).toMatch(/<Suspense fallback=\{<\w+ \/>\}>\s*<Login\b/);
  });
});

describe('Login: Enter envía el acceso', () => {
  it('los campos van en un <form> y el botón principal es type="submit"', () => {
    const html = renderToStaticMarkup(createElement(Login));
    expect(html).toMatch(/<form[^>]*>[\s\S]*id="login-email"[\s\S]*<button type="submit"[^>]*>[\s\S]*Iniciar Sesión[\s\S]*<\/form>/);
  });
});

describe('Ids únicos en la pantalla de acceso (Login y Register montados a la vez)', () => {
  it('Login usa ids con prefijo y sus etiquetas apuntan a ellos', () => {
    const html = renderToStaticMarkup(createElement(Login));
    expect(ids(html)).toEqual(expect.arrayContaining(['login-email', 'login-password']));
    expect(fors(html)).toEqual(expect.arrayContaining(['login-email', 'login-password']));
  });

  it('Login + Register + recuperar no repiten ningún id', () => {
    const html = ([Login, Register, ForgotPassword] as ComponentType[])
      .map((c) => renderToStaticMarkup(createElement(c)))
      .join('');
    const todos = ids(html);
    const repetidos = todos.filter((id, i) => todos.indexOf(id) !== i);
    expect(repetidos).toEqual([]);
    for (const destino of fors(html)) expect(todos).toContain(destino);
  });

  it('en recuperación (Register sigue montado) tampoco se repiten', () => {
    for (const Recuperacion of [ForgotPasswordSMS, ForgotPasswordSecurityQuestions, ResetPassword]) {
      const html = renderToStaticMarkup(createElement(Register)) + renderToStaticMarkup(createElement(Recuperacion));
      const todos = ids(html);
      expect(todos.filter((id, i) => todos.indexOf(id) !== i)).toEqual([]);
    }
  });
});

describe('Login: credenciales inválidas', () => {
  it('"Credenciales inválidas" (correo inexistente o contraseña mal) solo da el error general', () => {
    // Sin "password" ni "email": no se marca ningún campo
    expect(erroresDeLogin('Credenciales inválidas')).toEqual({
      general: 'Credenciales incorrectas. Verifica tu correo electrónico y contraseña.',
    });
  });

  it('ya no se afirma "La contraseña es incorrecta" en ningún camino', () => {
    const fuente = readFileSync(join(__dirname, 'Login.tsx'), 'utf8');
    expect(fuente).not.toContain('La contraseña es incorrecta');
  });
});
