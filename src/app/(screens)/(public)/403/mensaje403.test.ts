import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mensaje403 } from './mensaje403';

describe('/403', () => {
  it('con sesión no pide iniciar sesión: la cuenta no tiene acceso', () => {
    const mensaje = mensaje403(true);
    expect(mensaje).toContain('Tu cuenta no tiene acceso a esta sección');
    expect(mensaje).not.toMatch(/inicia sesión/i);
  });

  it('sin sesión conserva el texto de siempre', () => {
    expect(mensaje403(false)).toBe(
      'No tienes permiso para ver esta página. Inicia sesión con una cuenta autorizada o vuelve al inicio.',
    );
  });

  it('la página decide con hasSession() sin romper la hidratación', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toMatch(/useSyncExternalStore\([^)]*hasSession/);
    expect(pagina).toContain('mensaje403(haySesion)');
  });

  it('con sesión no ofrece el enlace "Iniciar sesión"', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    const pantalla = readFileSync(join(__dirname, '../../../components/ErrorScreen.tsx'), 'utf8');
    expect(pagina).toContain('ocultarIniciarSesion={haySesion}');
    expect(pantalla).toMatch(/ocultarIniciarSesion\s*\?\s*ENLACES\.filter/);
  });
});
