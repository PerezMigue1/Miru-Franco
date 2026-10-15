import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import InfoCompra from './InfoCompra';
import { CONFIGURACION_POR_OMISION } from '../../../../../services/configuracionSitio';
import {
  CONDICIONES_PAGO,
  ENTREGA,
  LEYENDA_PRECIOS,
  NOTA_TOTAL_COBRADO,
  PROVEEDOR,
  QUEJAS,
  textoEntrega,
} from './infoComercio';
import { HORARIO_SALON, TELEFONO_SALON } from '../../../../../utils/contactoSalon';
import { PLAZOS_TERMINOS } from '../../../../../utils/terminosCondiciones';

/**
 * Información de comercio electrónico (LFPC art. 76 BIS y 7 BIS) visible en el checkout. Sin DOM en vitest:
 * se revisan los textos del módulo y el código fuente del componente y de la página.
 */
const APP = join(__dirname, '..', '..', '..', '..', '..');
const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const componente = readFileSync(join(__dirname, 'InfoCompra.tsx'), 'utf8');
const terminos = readFileSync(join(APP, 'terminos-y-condiciones', 'page.tsx'), 'utf8');

describe('Checkout: datos del proveedor', () => {
  it('son los mismos que publican los Términos y Condiciones', () => {
    expect(PROVEEDOR.nombreComercial).toBe('Mirú Franco Salón Beauty');
    expect(PROVEEDOR.responsable).toBe('Mildred Rubí Franco Martínez');
    for (const dato of [PROVEEDOR.nombreComercial, PROVEEDOR.responsable, PROVEEDOR.domicilio, PROVEEDOR.correo]) {
      expect(terminos).toContain(dato);
    }
    expect(PROVEEDOR.telefono).toBe(TELEFONO_SALON);
  });

  it('el componente toma de Configuración del sitio proveedor, responsable, domicilio, teléfono, WhatsApp y correo', () => {
    expect(componente).toContain('useConfiguracionPublica');
    expect(componente).not.toContain('PROVEEDOR');
    const html = renderToStaticMarkup(createElement(InfoCompra));
    expect(html).toContain(PROVEEDOR.nombreComercial);
    expect(html).toContain(PROVEEDOR.responsable);
    expect(html).toContain(PROVEEDOR.domicilio);
    expect(html).toContain('href="tel:+527712681432"');
    expect(html).toContain('href="mailto:mildredfranco24@gmail.com"');
  });

  it('teléfono y WhatsApp van por separado: el WhatsApp es el de los documentos legales (antes se decía "Teléfono y WhatsApp" con el teléfono)', () => {
    const html = renderToStaticMarkup(createElement(InfoCompra));
    expect(html).not.toContain('Teléfono y WhatsApp');
    expect(html).toContain('href="https://wa.me/527711867645"');
  });
});

describe('Checkout: precios, pago, entrega y quejas', () => {
  it('precios en pesos mexicanos con IVA incluido, junto al total', () => {
    expect(LEYENDA_PRECIOS).toBe('Precios en pesos mexicanos con IVA incluido.');
    const resumen = pagina.slice(pagina.indexOf('Resumen del pedido'));
    expect(resumen.indexOf('{LEYENDA_PRECIOS}')).toBeGreaterThan(resumen.indexOf('formatearPrecioMXN(total)'));
    const revision = pagina.slice(pagina.indexOf('{paso === 3 && ('), pagina.indexOf('Resumen del pedido'));
    expect(revision).toContain('{LEYENDA_PRECIOS}');
  });

  it('la leyenda del total no dice "estimado" y explica cuándo puede cambiar el monto', () => {
    expect(pagina).not.toMatch(/estimado/i);
    expect(NOTA_TOTAL_COBRADO).toMatch(/precio vigente/);
    expect(NOTA_TOTAL_COBRADO).toMatch(/antes de pagar/);
    expect(pagina).toContain('{NOTA_TOTAL_COBRADO}');
  });

  it('las condiciones de pago son las dos que ofrece el checkout, con sus plazos reales', () => {
    expect(CONDICIONES_PAGO.map((c) => c.titulo)).toEqual(['Pagar en línea', 'Pagar al recoger en el salón']);
    const [linea, salon] = CONDICIONES_PAGO;
    expect(linea.texto).toMatch(/Mercado Pago/);
    expect(linea.texto).toContain(`${PLAZOS_TERMINOS.horasPagoEnLinea} horas`);
    expect(salon.texto).toMatch(/efectivo, transferencia o tarjeta/);
    expect(salon.texto).toContain(`${PLAZOS_TERMINOS.diasApartadoListo} días`);
  });

  it('la entrega es recoger en el salón con el horario aprobado', () => {
    expect(ENTREGA).toMatch(/^Recoges tu pedido en el salón/);
    expect(ENTREGA).toContain(HORARIO_SALON.texto);
    expect(ENTREGA).toMatch(/No hacemos envíos a domicilio/);
    // Con el horario de la configuración: por omisión, el mismo texto de hoy
    expect(textoEntrega(CONFIGURACION_POR_OMISION.horario.dias)).toBe(ENTREGA);
  });

  it('cómo presentar una queja: primero con el salón y después con Profeco', () => {
    expect(QUEJAS).toMatch(/escríbenos/i);
    expect(componente).toMatch(/<ContactoProfeco \/>/);
    const profeco = readFileSync(join(APP, 'components', 'legal', 'Profeco.tsx'), 'utf8');
    expect(profeco).toContain('55 5568 8722');
    expect(profeco).toContain('800 468 8722');
    expect(profeco).toContain('www.gob.mx/profeco');
  });

  it('el paso de revisión muestra la información completa antes de confirmar', () => {
    const revision = pagina.slice(pagina.indexOf('{paso === 3 && ('), pagina.indexOf('Resumen del pedido'));
    expect(revision).toMatch(/<InfoCompra \/>/);
    for (const texto of ['CONDICIONES_PAGO', 'textoEntrega', 'QUEJAS', 'LEYENDA_PRECIOS']) {
      expect(componente).toContain(texto);
    }
  });
});
