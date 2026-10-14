import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El entorno de pruebas no tiene DOM: se revisa el código fuente del panel. */
const fuente = readFileSync(join(process.cwd(), 'src', 'app', 'components', 'personal', 'PanelSolicitudes.tsx'), 'utf-8');

/** catch sin instrucciones (vacío o solo con comentarios). */
const CATCH_VACIO = /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*\s*)*\}/;

describe('Solicitudes de permiso: los errores se ven', () => {
  it('no hay catch vacío al resolver una solicitud', () => {
    expect(fuente).not.toMatch(CATCH_VACIO);
  });

  it('si falla la carga no se muestra "No hay solicitudes" como si no hubiera ninguna', () => {
    expect(fuente).toMatch(/setErrorCarga\(/);
  });

  it('el error al resolver se muestra en el modal', () => {
    expect(fuente).toMatch(/setErrorResolver\(/);
    expect(fuente).toMatch(/role="alert"/);
  });
});
