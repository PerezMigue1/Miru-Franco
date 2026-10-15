import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

const { default: AvisoSimplificado } = await import('./AvisoSimplificado');
const { default: Register } = await import('../auth/Register');

const RAIZ_APP = join(__dirname, '..', '..');
const texto = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

describe('AvisoSimplificado', () => {
  it('dice quién es la responsable, su domicilio, la finalidad y remite al Aviso de privacidad', () => {
    const html = renderToStaticMarkup(createElement(AvisoSimplificado, { finalidad: 'procesar tu pedido y tu pago' }));
    expect(texto(html)).toBe(
      'Mirú Franco Salón Beauty, Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000, ' +
        'usará tus datos para procesar tu pedido y tu pago. Puedes limitar su uso y ejercer tus derechos como dice el ' +
        'Aviso de privacidad (se abre en otra pestaña).',
    );
    expect(html).toMatch(/<a [^>]*href="\/aviso-de-privacidad"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  });
});

describe('AvisoSimplificado en los formularios que recaban datos', () => {
  it.each([
    ['components/auth/Register.tsx', 'crear tu cuenta y gestionar tus citas y compras'],
    ['(screens)/(privada)/cliente/tienda-online/checkout/page.tsx', 'procesar tu pedido y tu pago'],
    ['(screens)/(privada)/cliente/servicios-citas/crear-cita/page.tsx', 'agendar y dar seguimiento a tu cita'],
  ])('%s lo muestra con su finalidad', (archivo, finalidad) => {
    const fuente = readFileSync(join(RAIZ_APP, archivo), 'utf8');
    expect(fuente).toContain(`<AvisoSimplificado finalidad="${finalidad}"`);
  });

  it('el registro lo muestra desde el primer paso, junto al botón de envío', () => {
    const html = renderToStaticMarkup(createElement(Register));
    expect(texto(html)).toContain('usará tus datos para crear tu cuenta y gestionar tus citas y compras.');
  });
});
