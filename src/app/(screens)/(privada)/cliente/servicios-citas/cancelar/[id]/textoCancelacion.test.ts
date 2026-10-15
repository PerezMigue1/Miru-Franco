import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Cancelar una cita sin anticipo pagado: no hay ninguna penalización de "24 horas" (contradecía la política real). */
describe('Cancelar cita sin anticipo: el aviso dice la regla real', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
  it('no amenaza con una política de 24 horas que no existe', () => {
    expect(pagina).not.toContain('menos de 24 horas');
  });
  it('explica que se cancela sin costo antes de que empiece y sugiere reprogramar', () => {
    expect(pagina).toContain('Puedes cancelar sin costo antes de que empiece tu cita.');
    expect(pagina).toContain('te recomendamos reprogramarla');
  });
});
