import { describe, expect, it } from 'vitest';
import {
  ERROR_CONSENTIMIENTO_CLIENTA,
  ERROR_CONSENTIMIENTO_PERSONAL,
  errorConsentimientoAlergias,
  requiereConsentimiento,
} from './consentimientoDatosSensibles';

describe('consentimiento para datos de salud (alergias)', () => {
  it('lo pide solo cuando las alergias traen texto', () => {
    expect(requiereConsentimiento('Amoniaco')).toBe(true);
    expect(requiereConsentimiento('  Látex ')).toBe(true);
    for (const v of ['', '   ', null, undefined]) expect(requiereConsentimiento(v)).toBe(false);
  });

  it('bloquea guardar alergias sin la casilla, con el mensaje de quien captura', () => {
    expect(errorConsentimientoAlergias('Amoniaco', false)).toBe(ERROR_CONSENTIMIENTO_CLIENTA);
    expect(errorConsentimientoAlergias('Amoniaco', false, 'personal')).toBe(ERROR_CONSENTIMIENTO_PERSONAL);
  });

  it('deja guardar con la casilla marcada o sin alergias', () => {
    expect(errorConsentimientoAlergias('Amoniaco', true)).toBeNull();
    expect(errorConsentimientoAlergias('', false)).toBeNull();
    expect(errorConsentimientoAlergias(null, false, 'personal')).toBeNull();
  });
});
