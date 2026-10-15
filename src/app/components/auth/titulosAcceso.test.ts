// Recuperar y restablecer contraseña: el título de cada pantalla es su h1 (antes era h2, sin h1 en la página).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const leer = (archivo: string) => readFileSync(join(__dirname, archivo), 'utf8');
const tituloH1 = (fuente: string, texto: string) =>
  new RegExp(`<h1 className="mf-titulo-pagina[^"]*" style=\\{\\{ color: 'var\\(--menu-texto-principal\\)' \\}\\}>\\s*${texto}\\s*</h1>`).test(fuente);

describe('Títulos de las pantallas de acceso', () => {
  it('Recuperar Contraseña es el h1, con el mismo estilo', () => {
    const fuente = leer('ForgotPassword.tsx');
    expect(tituloH1(fuente, 'Recuperar Contraseña')).toBe(true);
    expect(fuente).not.toMatch(/<h2 className="mf-titulo-pagina/);
  });

  it('Restablecer: "Enlace inválido o incompleto", "Validando enlace..." y "Nueva Contraseña" son h1', () => {
    const fuente = leer('ResetPassword.tsx');
    for (const texto of ['Enlace inválido o incompleto', 'Validando enlace\\.\\.\\.', 'Nueva Contraseña']) expect(tituloH1(fuente, texto)).toBe(true);
    expect(fuente).not.toMatch(/<h2 className="mf-titulo-pagina/);
  });
});
