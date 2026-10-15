// La página /auth/completar-registro pintada (propuesta del verificador, integrada y adaptada al token en estado).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const base64url = (texto: string) => Buffer.from(texto, 'utf8').toString('base64url');
const TOKEN = `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify({ proposito: 'registro_google', email: 'ana@gmail.com', nombre: 'Ana' }))}.firma`;

// El token se lee de la URL en un efecto (en el servidor y al hidratar vale undefined): se fuerza lo que lee el navegador.
const forzar = vi.hoisted(() => ({
  token: '' as string | null,
  estado: null as string | null,
  errores: null as Record<string, string> | null,
}));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) => {
      if (inicial === undefined) return react.useState(forzar.token);
      if (forzar.estado && inicial === 'formulario') return react.useState(forzar.estado);
      const objetoVacio = !!inicial && typeof inicial === 'object' && !Array.isArray(inicial) && Object.keys(inicial).length === 0;
      if (forzar.errores && objetoVacio) return react.useState(forzar.errores);
      return react.useState(inicial);
    },
  };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  usePathname: () => '/auth/completar-registro',
}));
vi.mock('../../../../services/auth', () => ({ api: { loginWithGoogle: vi.fn(), getProfile: vi.fn() } }));

const { default: Pagina } = await import('./page');
const pintar = () => renderToStaticMarkup(createElement(Pagina));
const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

afterEach(() => {
  forzar.token = TOKEN;
  forzar.estado = null;
  forzar.errores = null;
});
forzar.token = TOKEN;

describe('Página /auth/completar-registro (pintada)', () => {
  it('las tres casillas empiezan sin marcar', () => {
    const html = pintar();
    const casillas = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
    expect(casillas).toHaveLength(3);
    for (const c of casillas) expect(c).not.toMatch(/\bchecked\b/);
  });

  it('409: "Ya tienes una cuenta" con su botón a /login', () => {
    forzar.estado = 'cuenta_existente';
    const html = pintar();
    expect(html).toContain('Ya tienes una cuenta');
    expect(html).toMatch(/<a[^>]*href="\/login"[^>]*>\s*Ir a iniciar sesión/);
  });

  it('el error de una casilla obligatoria se pinta junto a ella', () => {
    forzar.errores = { aceptaTerminos: 'Para crear tu cuenta acepta los Términos y condiciones.' };
    const html = pintar();
    expect(html).toContain('id="google-terminos-error" role="alert"');
  });

  it('valida las casillas en la página (mensaje y foco) antes de llamar a completarRegistroGoogle', () => {
    expect(fuente).toMatch(
      /const faltan = erroresCasillasAlta\(casillas\);\s*setErrores\(faltan\);[\s\S]{0,200}if \(primera\) \{[\s\S]{0,160}\.focus\(\);\s*return;\s*\}[\s\S]*completarRegistroGoogle\(token, casillas\)/,
    );
  });

  it('cuenta creada desde la app: pide volver a la app (con enlace que la abre) y no lleva de regreso en la web', () => {
    forzar.estado = 'lista_app';
    const html = pintar();
    expect(html).toContain('Tu cuenta quedó creada. Vuelve a la app y entra con Google.');
    expect(html).toMatch(/<a[^>]*href="appmirufranco:\/\/"[^>]*>\s*Abrir la app/);
    expect(html).not.toContain('Te llevamos de regreso');
    expect(html).toContain('role="status"');
  });

  it('mientras lee el token de la URL no dice que el enlace no sirve', () => {
    forzar.token = undefined as unknown as null;
    const html = pintar();
    expect(html).not.toContain('Este enlace ya no es válido');
    expect(html).toContain('aria-busy="true"');
  });

  it('sin token en la URL: enlace no válido con la salida para volver a entrar con Google', () => {
    forzar.token = null;
    const html = pintar();
    expect(html).toContain('Este enlace ya no es válido');
    expect(html).toContain('Volver a entrar con Google');
  });

  it('el token se lee una vez en un efecto de montaje (no en el render ni con useSearchParams)', () => {
    expect(fuente).toMatch(/useEffect\(\(\) => \{[^}]{0,300}?setToken\(leerTokenDeLaUrl\(window\.location\)\);\s*\}, \[\]\);/);
    expect(fuente).not.toContain('useSyncExternalStore');
    expect(fuente).not.toContain('useSearchParams');
  });

  it('la URL se limpia fuera del render, después de guardar el token y con el router de Next ya listo', () => {
    // Un solo replaceState, dentro de un efecto que depende del token (corre en un commit posterior a la
    // hidratación, cuando Next ya sincroniza su estado con history.replaceState y un refresh no lo regresa).
    expect(fuente.match(/replaceState\(/g)?.length).toBe(1);
    expect(fuente).toMatch(
      /useEffect\(\(\) => \{[^}]{0,400}?if \(token\) window\.history\.replaceState\(window\.history\.state, '', RUTA_COMPLETAR_REGISTRO\);\s*\}, \[token\]\);/,
    );
    const modulo = readFileSync(join(__dirname, 'completarRegistro.ts'), 'utf8');
    expect(modulo).not.toMatch(/^let /m);
    expect(modulo).not.toContain('replaceState');
  });
});
