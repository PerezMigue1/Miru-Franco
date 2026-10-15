import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Prueba de fuente (el entorno de pruebas no tiene DOM): truncate e importar mandan al backend la
 * confirmación que sale de sus formularios y modales existentes.
 */
const principal = readFileSync(
  join(process.cwd(), 'src', 'app', '(screens)', 'admin', 'base-datos', 'page.tsx'),
  'utf-8',
);

describe('Gestor de base de datos: truncate e importar llevan la confirmación', () => {
  it('el TRUNCATE manda el texto que escribiste en el campo de confirmación', () => {
    expect(principal).toMatch(/truncarTabla\(tablaTruncate, truncateConfirmText\.trim\(\),/);
    // El texto esperado es el mismo que valida el backend.
    expect(principal).toContain('const confirmEsperado = confirmacionTruncate(tablaTruncate);');
  });

  it('una tabla manda lo que se escribió en el modal; toda la base, la confirmación de cada tabla tras escribir "IMPORTAR TODAS"', () => {
    const llamadas = principal.match(/importarDatos\([^;]*\);/g) ?? [];
    expect(llamadas).toHaveLength(2);
    const [todas, una] = llamadas;
    expect(todas).toMatch(/confirmacionImportacion\(tabla\)\);$/);
    expect(una).toMatch(/importConfirmText\.trim\(\),?\s*\);$/);
  });

  it('antes de importar se revisa lo escrito: si no coincide, el modal sigue abierto con el error', () => {
    const inicio = principal.indexOf('const ejecutarImportacion = async () => {');
    expect(inicio).toBeGreaterThan(-1);
    const cuerpo = principal.slice(inicio, principal.indexOf('\n  };', inicio));
    const revision = cuerpo.match(
      /const faltaConfirmar = errorConfirmacionImportacion\(tablaImport, importConfirmText\);\s*if \(faltaConfirmar\) \{\s*setErrorConfirmImport\(faltaConfirmar\);\s*return;\s*\}/,
    );
    expect(revision, 'falta revisar la confirmación escrita').not.toBeNull();
    expect(cuerpo.indexOf(revision![0])).toBeLessThan(cuerpo.indexOf('setConfirmarImportacion(false)'));
    expect(cuerpo.indexOf(revision![0])).toBeLessThan(cuerpo.indexOf('importarDatos('));
  });

  it('el modal pide escribir la confirmación, con etiqueta, el texto exacto y el error con role alert', () => {
    const modal = principal.slice(principal.indexOf('title="Confirmar importación"'));
    expect(modal).toContain('<label htmlFor="confirmacion-importacion"');
    expect(modal).toContain('value={importConfirmText}');
    expect(modal).toContain('{confirmacionImportacionEscrita(tablaImport)}');
    expect(modal).toMatch(/placeholder=\{PLACEHOLDER_CONFIRMACION\}/);
    expect(modal).toMatch(/role="alert"[^>]*>\{errorConfirmImport\}/);
    // Al abrir el modal el campo empieza vacío.
    const abrir = principal.slice(principal.indexOf('const handleImportar = '), principal.indexOf('setConfirmarImportacion(true);'));
    expect(abrir).toMatch(/setImportConfirmText\(''\);\s*setErrorConfirmImport\(null\);/);
  });

  it('la importación solo corre desde el botón Importar del modal de confirmación', () => {
    expect(principal).toContain('<Button variant="primary" onClick={ejecutarImportacion} disabled={importando}>Importar</Button>');
    const usos = principal.match(/ejecutarImportacion/g) ?? [];
    // La definición y el botón del modal.
    expect(usos).toHaveLength(2);
  });
});

describe('Confirmación de importar: la etiqueta visible es el nombre accesible', () => {
  const campo = principal.match(/<input\s+id="confirmacion-importacion"[\s\S]*?\/>/)?.[0] ?? '';

  it('el campo no tapa su <label htmlFor> con un aria-label (el lector debe oír qué escribir)', () => {
    expect(campo).not.toBe('');
    expect(campo).not.toContain('aria-label=');
    expect(principal).toContain('<label htmlFor="confirmacion-importacion"');
  });

  it('el error queda ligado al campo con aria-describedby', () => {
    expect(campo).toContain("aria-describedby={errorConfirmImport ? 'confirmacion-importacion-error' : undefined}");
    expect(principal).toMatch(/<p id="confirmacion-importacion-error" role="alert"/);
  });
});
