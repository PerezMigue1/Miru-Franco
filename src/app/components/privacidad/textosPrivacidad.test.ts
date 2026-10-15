import { describe, expect, it } from 'vitest';
import {
  documentoYVersion,
  ETIQUETA_ESTADO_ARCO,
  ETIQUETA_TIPO_ARCO,
  etiquetaConsentimiento,
  fechaHoraMexico,
  estadoRevocable,
  puedeRevocar,
  textoSinRegistro,
  ultimoPorTipo,
  varianteEstadoArco,
} from './textosPrivacidad';
import type { ConsentimientoRegistrado } from '../../services/consentimientos';

function fila(parcial: Partial<ConsentimientoRegistrado>): ConsentimientoRegistrado {
  return {
    id: '1',
    usuarioId: 'u-1',
    visitanteId: null,
    tipo: 'promociones',
    documentoSlug: null,
    documentoVersion: null,
    documentoHash: null,
    accion: 'aceptado',
    creadoEn: '2026-10-01T15:00:00.000Z',
    ip: null,
    userAgent: null,
    formulario: 'registro',
    rutaOrigen: null,
    metodo: 'casilla_marcada',
    ...parcial,
  };
}

describe('Textos de privacidad', () => {
  it('la fecha y hora se muestran en hora de México, sin desfase por la zona del navegador', () => {
    // 03:05 UTC del 15 son las 21:05 del 14 en el centro de México
    expect(fechaHoraMexico('2026-10-15T03:05:00.000Z')).toBe('14/10/2026 21:05');
    expect(fechaHoraMexico(null)).toBe('Sin fecha');
    expect(fechaHoraMexico('no es fecha')).toBe('Sin fecha');
  });

  it('cada consentimiento se nombra en el idioma de la clienta', () => {
    expect(etiquetaConsentimiento('promociones')).toBe('Promociones');
    expect(etiquetaConsentimiento('datos_salud')).toBe('Datos de salud (alergias)');
    expect(etiquetaConsentimiento('fotos_resultado')).toBe('Fotos del resultado');
    expect(etiquetaConsentimiento('aviso_privacidad')).toBe('Aviso de privacidad');
  });

  it('el documento lleva su título y la versión aceptada', () => {
    expect(documentoYVersion({ documentoSlug: 'aviso-privacidad', documentoVersion: '2.0' })).toBe('Aviso de Privacidad, versión 2.0');
    expect(documentoYVersion({ documentoSlug: null, documentoVersion: null })).toBe('Sin documento');
  });

  it('tipos y estados ARCO tienen etiqueta y tono para su insignia', () => {
    expect(ETIQUETA_TIPO_ARCO.cancelacion).toBe('Cancelación');
    expect(ETIQUETA_TIPO_ARCO.rectificacion).toBe('Rectificación');
    expect(ETIQUETA_ESTADO_ARCO.en_proceso).toBe('En proceso');
    expect(varianteEstadoArco('rechazada')).toBe('danger');
    expect(varianteEstadoArco('atendida')).toBe('success');
    expect(varianteEstadoArco('recibida')).toBe('info');
  });
});

describe('Estado vigente de cada consentimiento', () => {
  it('toma la fila más reciente de cada tipo, venga en el orden que venga', () => {
    const filas = [
      fila({ id: 'a', tipo: 'promociones', accion: 'aceptado', creadoEn: '2026-09-01T10:00:00.000Z' }),
      fila({ id: 'b', tipo: 'promociones', accion: 'revocado', creadoEn: '2026-10-02T10:00:00.000Z' }),
      fila({ id: 'c', tipo: 'datos_salud', accion: 'aceptado', creadoEn: '2026-09-15T10:00:00.000Z' }),
    ];
    const ultimos = ultimoPorTipo(filas);
    expect(ultimos.promociones?.id).toBe('b');
    expect(ultimos.datos_salud?.id).toBe('c');
    expect(ultimos.fotos_resultado).toBeUndefined();
  });

  it('se puede revocar salvo que lo último registrado ya sea una revocación', () => {
    expect(puedeRevocar(undefined)).toBe(true);
    expect(puedeRevocar(fila({ accion: 'aceptado' }))).toBe(true);
    expect(puedeRevocar(fila({ accion: 'revocado' }))).toBe(false);
  });

  it('fotos del resultado sin registro: no se ofrece revocar una autorización que nunca se dio', () => {
    expect(estadoRevocable('fotos_resultado', undefined)).toBe('sin_autorizacion');
    expect(estadoRevocable('fotos_resultado', fila({ tipo: 'fotos_resultado', accion: 'aceptado' }))).toBe('revocable');
    expect(estadoRevocable('fotos_resultado', fila({ tipo: 'fotos_resultado', accion: 'revocado' }))).toBe('revocado');
  });

  it('datos de salud sin registro sí se pueden retirar (cuentas con alergias guardadas antes del registro) y lo dice', () => {
    expect(estadoRevocable('datos_salud', undefined)).toBe('revocable');
    expect(textoSinRegistro('datos_salud')).toMatch(/antes de este registro, puedes retirarlos/);
    expect(textoSinRegistro('fotos_resultado')).toBe('No has dado esta autorización.');
  });
});

describe('Pantalla: consentimientos revocables', () => {
  it('la lista decide con estadoRevocable y muestra el texto sin registro de cada tipo', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const fuente = readFileSync(join(__dirname, 'MisDatosPrivacidad.tsx'), 'utf8');
    expect(fuente).toMatch(/const estado = estadoRevocable\(c\.tipo, ultimo\)/);
    expect(fuente).toContain(": textoSinRegistro(c.tipo)}");
    expect(fuente).toContain("estado === 'revocable' ? (");
    expect(fuente).toContain('Sin autorización');
  });
});
