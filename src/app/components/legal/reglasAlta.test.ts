import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { documentoLegal } from '../../utils/documentosLegales';
import {
  CASILLAS_ALTA_INICIALES,
  MENSAJES_CASILLA_OBLIGATORIA,
  consentimientosAlta,
  errorCasillaAlta,
  erroresCasillasAlta,
} from './reglasAlta';
import CasillasAlta from './CasillasAlta';

const todas = { aceptaTerminos: true, aceptaAvisoPrivacidad: true, recibePromociones: false };

describe('Casillas del alta (registro con correo y con Google)', () => {
  it('ninguna casilla empieza marcada', () => {
    expect(CASILLAS_ALTA_INICIALES).toEqual({ aceptaTerminos: false, aceptaAvisoPrivacidad: false, recibePromociones: false });
  });

  it('una obligatoria sin marcar da su mensaje; promociones es opcional', () => {
    expect(errorCasillaAlta('aceptaTerminos', false)).toBe(MENSAJES_CASILLA_OBLIGATORIA.aceptaTerminos);
    expect(errorCasillaAlta('aceptaAvisoPrivacidad', false)).toBe(MENSAJES_CASILLA_OBLIGATORIA.aceptaAvisoPrivacidad);
    expect(errorCasillaAlta('recibePromociones', false)).toBeNull();
    expect(errorCasillaAlta('aceptaTerminos', true)).toBeNull();
  });

  it('erroresCasillasAlta bloquea mientras falte una obligatoria', () => {
    expect(erroresCasillasAlta(CASILLAS_ALTA_INICIALES)).toEqual({
      aceptaTerminos: MENSAJES_CASILLA_OBLIGATORIA.aceptaTerminos,
      aceptaAvisoPrivacidad: MENSAJES_CASILLA_OBLIGATORIA.aceptaAvisoPrivacidad,
    });
    expect(erroresCasillasAlta({ ...todas, aceptaAvisoPrivacidad: false })).toEqual({
      aceptaAvisoPrivacidad: MENSAJES_CASILLA_OBLIGATORIA.aceptaAvisoPrivacidad,
    });
    expect(erroresCasillasAlta(todas)).toEqual({});
  });

  it('consentimientosAlta manda las tres casillas y las versiones vigentes de Términos y Aviso', () => {
    const t = documentoLegal('terminos');
    const a = documentoLegal('aviso-privacidad');
    expect(consentimientosAlta({ ...todas, recibePromociones: true })).toEqual({
      aceptaTerminos: true,
      aceptaAvisoPrivacidad: true,
      recibePromociones: true,
      documentos: [
        { slug: 'terminos', version: t.version, hash: t.hash },
        { slug: 'aviso-privacidad', version: a.version, hash: a.hash },
      ],
    });
  });
});

describe('CasillasAlta (componente)', () => {
  const render = (errores = {}) =>
    renderToStaticMarkup(
      createElement(CasillasAlta, { idBase: 'alta', valores: CASILLAS_ALTA_INICIALES, onCambio: () => undefined, errores }),
    );

  it('pinta tres casillas reales, separadas y sin marcar, cada una con su etiqueta', () => {
    const html = render();
    const casillas = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
    expect(casillas).toHaveLength(3);
    for (const casilla of casillas) expect(casilla).not.toMatch(/\bchecked\b/);
    for (const id of ['alta-terminos', 'alta-aviso', 'alta-promociones']) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('Acepto los');
    expect(html).toContain('Acepto el');
    expect(html).toContain('Quiero recibir promociones');
  });

  it('cada casilla enlaza su documento en otra pestaña con rel noopener', () => {
    const html = render();
    const enlaces = html.match(/<a [^>]*>/g) ?? [];
    expect(enlaces).toHaveLength(3);
    for (const a of enlaces) {
      expect(a).toContain('target="_blank"');
      expect(a).toMatch(/rel="[^"]*noopener/);
    }
    expect(html).toContain(`href="${documentoLegal('terminos').ruta}"`);
    expect(html).toContain(`href="${documentoLegal('aviso-privacidad').ruta}"`);
    expect(html).toContain(`href="${documentoLegal('aviso-privacidad').ruta}#finalidades"`);
  });

  it('el error de una obligatoria aparece junto a su casilla con role="alert"', () => {
    const html = render({ aceptaTerminos: MENSAJES_CASILLA_OBLIGATORIA.aceptaTerminos });
    expect(html).toMatch(/<input[^>]*aria-invalid="true"[^>]*id="alta-terminos"|<input[^>]*id="alta-terminos"[^>]*aria-invalid="true"/);
    expect(html).toContain(`<p id="alta-terminos-error" role="alert" class="mf-consentimiento__error">${MENSAJES_CASILLA_OBLIGATORIA.aceptaTerminos}</p>`);
  });
});
