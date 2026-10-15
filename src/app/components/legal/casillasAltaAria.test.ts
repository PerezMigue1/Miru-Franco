// Accesibilidad de CasillasAlta / CasillaDocumento (propuesta del verificador, integrada).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CasillasAlta from './CasillasAlta';
import { CASILLAS_ALTA_INICIALES, MENSAJES_CASILLA_OBLIGATORIA } from './reglasAlta';

const pintar = (errores = {}) =>
  renderToStaticMarkup(createElement(CasillasAlta, { idBase: 'alta', valores: CASILLAS_ALTA_INICIALES, onCambio: () => undefined, errores }));
const inputDe = (html: string, id: string) => html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? '';

describe('CasillasAlta: aria', () => {
  it('con error, la casilla queda ligada a su mensaje (aria-describedby)', () => {
    const html = pintar({ aceptaTerminos: MENSAJES_CASILLA_OBLIGATORIA.aceptaTerminos });
    expect(inputDe(html, 'alta-terminos')).toContain('aria-describedby="alta-terminos-error"');
    expect(inputDe(html, 'alta-aviso')).not.toContain('aria-describedby');
  });

  it('solo las obligatorias llevan aria-required; promociones no', () => {
    const html = pintar();
    expect(inputDe(html, 'alta-terminos')).toContain('aria-required="true"');
    expect(inputDe(html, 'alta-aviso')).toContain('aria-required="true"');
    expect(inputDe(html, 'alta-promociones')).not.toContain('aria-required');
  });
});
