import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

/** Ficha de la clienta en /admin, igual que la de Operación. */
describe('Ficha de la clienta (admin)', () => {
  it('los títulos llevan mayúscula solo al inicio', () => {
    for (const titulo of ['Perfil capilar y salud', 'Historial de citas', 'Historial de compras', 'Seguimiento posterior al servicio', 'Direcciones ligadas', 'Acciones rápidas']) {
      expect(fuente).toContain(titulo);
    }
    for (const viejo of ['Perfil Capilar', 'Historial de Citas', 'Historial de Compras', 'Post-Servicio', 'Direcciones Ligadas', 'Acciones Rápidas', 'Agendar Nueva Cita']) {
      expect(fuente).not.toContain(viejo);
    }
  });

  it('el historial de citas no tiene columna "Especialista": va bajo el servicio y "Estado" no se corta a 1440', () => {
    expect(fuente).toContain("headers={['Servicio', 'Fecha', 'Precio', 'Estado']}");
    expect(fuente).not.toMatch(/headers=\{\[[^\]]*'Especialista'/);
  });
});
