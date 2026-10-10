import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Safari en iPhone convierte teléfonos, correos, direcciones y fechas en enlaces antes de que React
// hidrate; el texto del servidor deja de coincidir (error 418 de React). Las páginas públicas muestran teléfono y
// dirección en el pie, así que el layout raíz desactiva esa detección.
describe('Metadatos del layout raíz', () => {
  it('desactiva la detección automática de formatos de Safari', () => {
    const layout = readFileSync(join(__dirname, 'layout.tsx'), 'utf8');
    const bloque = layout.match(/formatDetection:\s*\{([^}]*)\}/);
    expect(bloque, 'falta formatDetection en metadata').not.toBeNull();
    for (const clave of ['telephone', 'email', 'address', 'date']) {
      expect(bloque![1]).toMatch(new RegExp(`${clave}:\\s*false`));
    }
  });
});
