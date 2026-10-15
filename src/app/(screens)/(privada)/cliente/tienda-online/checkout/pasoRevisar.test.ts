import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import InfoCompra from './InfoCompra';
import { PROVEEDOR } from './infoComercio';

const RAIZ = join(__dirname, '..', '..', '..', '..', '..', '..', '..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');
const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const datosRecoger = leer('src/app/components/tienda/DatosRecogerEnSalon.tsx');

describe('Checkout, paso 3: el margen va fuera del campo (no entre la etiqueta y su campo)', () => {
  it('ningún Input recibe un margen superior en className', () => {
    expect(pagina).not.toMatch(/<Input\b(?:(?!\/>)[\s\S])*?className="mt-/);
  });

  it('Correo, Teléfono y RFC van envueltos en un div con el margen', () => {
    expect(pagina).toMatch(/<div className="mt-4">\s*<Input\s+label="Correo"/);
    expect(pagina).toMatch(/<div className="mt-4">\s*<Input\s+label="Teléfono"/);
    expect(pagina).toMatch(/<div className="mt-3">\s*<Input\s+label="RFC"/);
  });
});

describe('Checkout, paso 3: enlaces legibles sobre la tarjeta terracota', () => {
  it('"edita tu perfil" usa el color de texto principal con subrayado (no el token de enlace de entrega)', () => {
    const enlace = pagina.match(/<Link href="\/perfil"[^>]*>/)![0];
    expect(enlace).toContain("color: 'var(--menu-texto-principal)'");
    expect(enlace).toMatch(/\bunderline\b/);
  });

  it('"Cómo llegar" y el teléfono de DatosRecogerEnSalon también, sin cambiar el token global', () => {
    expect(datosRecoger).not.toContain('--checkout-entrega-enlace');
    expect(datosRecoger.match(/color: 'var\(--menu-texto-principal\)'/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(leer('src/app/styles/globals.css')).toContain('--checkout-entrega-enlace: var(--botones-principales);');
  });
});

describe('Checkout, paso 3: casilla "Solicito factura fiscal (CFDI)"', () => {
  it('usa el estilo .mf-consentimiento (objetivo de 44 px), con etiqueta ligada a la casilla', () => {
    expect(pagina).toMatch(
      /<div className="mf-consentimiento[^"]*">\s*<label htmlFor="casilla-solicita-factura">\s*<input\s+type="checkbox"\s+id="casilla-solicita-factura"/,
    );
    expect(pagina).toMatch(/<span>Solicito factura fiscal \(CFDI\)<\/span>/);
  });
});

describe('Información de tu compra: el correo no se corta a media palabra', () => {
  it('sin break-all y con un punto de corte antes de la arroba', () => {
    const html = renderToStaticMarkup(createElement(InfoCompra));
    const [usuario, dominio] = PROVEEDOR.correo.split('@');
    expect(html).toContain(`${usuario}<wbr/>@${dominio}`);
    expect(html).toContain(`href="mailto:${PROVEEDOR.correo}"`);
    expect(html).not.toContain('break-all');
  });
});
