import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { plazosDeCita, textoAnticipoAlCancelar, textoCancelarSinAnticipo } from './avisoAnticipo';

/**
 * Cancelar una cita: el aviso dice la regla real. Sin anticipo pagado cancelar no cuesta (y, si la regla pide aviso
 * mínimo, se dice para reagendar); con anticipo pagado manda la política de anticipos con los plazos de la cita.
 */
describe('Cancelar cita: el aviso dice la regla real', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('no amenaza con una política de 24 horas ni promete "sin costo" a quien ya pagó anticipo', () => {
    expect(pagina).not.toContain('menos de 24 horas');
    expect(pagina).not.toContain('Puedes cancelar sin costo antes de que empiece tu cita.');
    expect(pagina).toContain('textoCancelarSinAnticipo(horasAviso, textos)');
  });

  it('sin anticipo pagado: no cuesta y sugiere reprogramar; con aviso mínimo, lo dice', () => {
    expect(textoCancelarSinAnticipo(0)).toBe('Como no has pagado anticipo, cancelar no tiene costo. Si solo necesitas otro horario, te recomendamos reprogramarla.');
    expect(textoCancelarSinAnticipo(24)).toContain('Para reagendar desde tu cuenta avisa con al menos 24 horas de anticipación.');
    expect(textoCancelarSinAnticipo(1)).toContain('al menos 1 hora de');
  });

  it('con anticipo pagado usa los plazos guardados en la cita y los textos guardados por la dueña', () => {
    const plazos = plazosDeCita({ diasHabilesExcepcionAnticipo: 12, diasHabilesCancelarConReembolso: 7 });
    expect(plazos).toEqual({ diasExcepcion: 12, diasReembolso: 7 });
    expect(textoAnticipoAlCancelar(150, null, new Date(), plazos)).toContain('más de 12 días hábiles');
    expect(textoAnticipoAlCancelar(150, null, new Date(), plazos)).toContain('dentro de los 7 días hábiles');
    expect(plazosDeCita(null)).toEqual({ diasExcepcion: 10, diasReembolso: 5 });
    const textos = { 'citas.cancelar.anticipoSinDatos': 'Anticipo de {anticipo}.', 'citas.cancelar.reprogramar': 'Reprograma.' };
    expect(textoAnticipoAlCancelar(150, null, new Date(), { textos })).toBe('Anticipo de $150. Reprograma.');
  });
});
