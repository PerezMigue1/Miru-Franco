import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ERROR_CONSENTIMIENTO_CLIENTA,
  ERROR_CONSENTIMIENTO_PERSONAL,
  alergiasNuevas,
  cuerpoAlergias,
  errorConsentimientoAlergias,
  errorConsentimientoCambio,
  mensajeSaludDelBackend,
  requiereConsentimiento,
} from './consentimientoDatosSensibles';

describe('alergias que cambian: solo entonces se pide y se manda el consentimiento (contrato del backend)', () => {
  it('cambian a un texto nuevo: sí; sin cambio (aunque tengan texto), vacías o solo espacios: no', () => {
    expect(alergiasNuevas(null, 'Látex')).toBe(true);
    expect(alergiasNuevas('Látex', 'Látex, amoniaco')).toBe(true);
    expect(alergiasNuevas('Látex', '  Látex ')).toBe(false);
    expect(alergiasNuevas('Látex', '')).toBe(false);
    expect(alergiasNuevas(undefined, '   ')).toBe(false);
  });

  it('cuerpo: sin cambio no se mandan; borradas van como null sin consentimiento; nuevas con consienteDatosSensibles true', () => {
    expect(cuerpoAlergias('Látex', ' Látex ')).toEqual({});
    expect(cuerpoAlergias(null, '')).toEqual({});
    expect(cuerpoAlergias('Látex', '  ')).toEqual({ alergias: null });
    expect(cuerpoAlergias('Látex', 'Amoniaco ')).toEqual({ alergias: 'Amoniaco', consienteDatosSensibles: true });
  });

  it('sin la casilla no se guarda un cambio de alergias; guardar sin tocarlas no la pide', () => {
    expect(errorConsentimientoCambio('Látex', 'Amoniaco', false, 'clienta')).toBe(ERROR_CONSENTIMIENTO_CLIENTA);
    expect(errorConsentimientoCambio(null, 'Amoniaco', false, 'personal')).toBe(ERROR_CONSENTIMIENTO_PERSONAL);
    expect(errorConsentimientoCambio('Látex', 'Látex', false, 'personal')).toBeNull();
    expect(errorConsentimientoCambio('Látex', '', false, 'clienta')).toBeNull();
    expect(errorConsentimientoCambio(null, 'Amoniaco', true, 'personal')).toBeNull();
  });

  it('los mensajes dicen lo mismo que el backend (titular y personal)', () => {
    expect(ERROR_CONSENTIMIENTO_CLIENTA).toBe('Para guardar tus alergias marca la casilla de datos de salud.');
    expect(ERROR_CONSENTIMIENTO_PERSONAL).toBe('Marca que la persona aceptó que registremos sus datos de salud.');
  });
});

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

describe('400 del backend por el consentimiento de salud: su mensaje va junto a la casilla', () => {
  const errorDelCliente = (cuerpo: Record<string, unknown>, mensaje = 'Revisa los campos') =>
    Object.assign(new Error(mensaje), {
      status: 400,
      data: cuerpo,
      validationErrors: (cuerpo.errors as Record<string, unknown>) ?? {},
    });

  it('toma el mensaje de errors.consienteDatosSensibles (texto o lista)', () => {
    const msg = 'Marca que la persona aceptó que registremos sus datos de salud.';
    expect(mensajeSaludDelBackend(errorDelCliente({ code: 'CONSENTIMIENTO_SALUD_REQUERIDO', errors: { consienteDatosSensibles: msg } }))).toBe(msg);
    expect(mensajeSaludDelBackend(errorDelCliente({ errors: { consienteDatosSensibles: [msg] } }))).toBe(msg);
  });

  it('con solo el code, usa el mensaje del error', () => {
    const e = errorDelCliente({ code: 'CONSENTIMIENTO_SALUD_REQUERIDO' }, 'Para guardar tus alergias marca la casilla de datos de salud.');
    expect(mensajeSaludDelBackend(e)).toBe('Para guardar tus alergias marca la casilla de datos de salud.');
  });

  it('cualquier otro error no es de la casilla', () => {
    expect(mensajeSaludDelBackend(errorDelCliente({ code: 'PROMOCIONES_SOLO_TITULAR' }, 'Solo la persona puede aceptar recibir promociones.'))).toBeNull();
    expect(mensajeSaludDelBackend(new Error('Sin conexión'))).toBeNull();
    expect(mensajeSaludDelBackend(null)).toBeNull();
  });

  it('las cuatro pantallas que mandan alergias lo ponen junto a la casilla', () => {
    const leer = (...ruta: string[]) => readFileSync(join(__dirname, '..', ...ruta), 'utf8');
    for (const fuente of [
      leer('(screens)', 'admin', 'usuarios-roles', 'nuevo', 'page.tsx'),
      leer('(screens)', 'admin', 'usuarios-roles', '[id]', 'page.tsx'),
      leer('(screens)', 'admin', 'clientes-crm', '[id]', 'editar', 'page.tsx'),
    ]) {
      expect(fuente).toMatch(/const salud = mensajeSaludDelBackend\(err\);\s*if \(salud\) \{\s*setErrorConsentimiento\(salud\);/);
    }
    expect(leer('components', 'perfil', 'PerfilDatosForm.tsx')).toMatch(
      /const salud = mensajeSaludDelBackend\(e\);\s*if \(salud\) \{\s*setError\('consienteDatosSensibles', \{ type: 'server', message: salud \}\);/,
    );
  });
});
