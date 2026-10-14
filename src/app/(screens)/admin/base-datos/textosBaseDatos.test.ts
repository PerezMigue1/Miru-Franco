import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Revisión de los textos y la accesibilidad básica del Gestor de Base de Datos sobre el código
 * fuente (el entorno de pruebas no tiene DOM).
 */
const dir = join(process.cwd(), 'src', 'app', '(screens)', 'admin', 'base-datos');
const principal = readFileSync(join(dir, 'page.tsx'), 'utf-8');
const backup = readFileSync(join(dir, 'backup', 'page.tsx'), 'utf-8');

describe('Gestor de base de datos: textos para el usuario', () => {
  it('sin palabras sin acento ni nombres de variables internas', () => {
    for (const texto of ['Gestion de Backups', 'Automatizacion', 'todavia', 'ultimos']) {
      expect(backup, texto).not.toContain(texto);
    }
    // Textos visibles (las claves internas Critico/Atencion del estado no se muestran).
    for (const texto of ['/>Critico:', '/>Atencion:', 'indice(s)', 'alertas criticas', 'DATABASE_URL']) {
      expect(principal, texto).not.toContain(texto);
    }
  });

  it('el monitoreo no promete actualizar cada 10 s', () => {
    expect(principal).not.toContain('cada 10s');
  });

  it('el backup automático avisa que solo funciona con la pestaña abierta', () => {
    expect(backup).toContain('Solo funciona mientras esta pestaña está abierta');
  });
});

describe('Gestor de base de datos: accesibilidad básica', () => {
  it('la página de backup tiene h1', () => {
    expect(backup).toMatch(/<h1[\s>]/);
  });

  it('los botones de cerrar el menú tienen aria-label', () => {
    expect(principal).toMatch(/aria-label="Cerrar" onClick=\{\(\) => setMenuLateralOculto\(true\)\}/);
    expect(backup).toMatch(/aria-label="Cerrar"\s+onClick=\{\(\) => setMenuLateralOculto\(true\)\}/);
  });

  it('no hay div con role="button" (el diagrama es un botón real)', () => {
    expect(principal).not.toContain('role="button"');
  });

  it('la confirmación del TRUNCATE, el archivo a importar y la hora del backup tienen etiqueta', () => {
    expect(principal).toContain('aria-label="Confirmación del TRUNCATE"');
    expect(principal).toContain('aria-label="Archivo a importar (CSV o JSON)"');
    expect(backup).toContain('aria-label="Hora"');
    expect(backup).toContain('aria-label="Minuto"');
  });
});
