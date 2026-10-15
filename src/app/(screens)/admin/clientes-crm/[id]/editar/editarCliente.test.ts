// Editar clienta desde el panel: alergias con la casilla del personal solo si cambian, y promociones solo para quitarlas.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Sin DOM el efecto que carga a la clienta no corre: se pinta ya "cargado" (sin datos guardados).
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react, useState: (inicial: unknown) => react.useState(inicial === true ? false : inicial) };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }), useParams: () => ({ id: 'u-1' }) }));
vi.mock('../../../../../components/layouts/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock('../../../../../components/admin/FotoUsuarioUploader', () => ({ default: () => null }));

const { default: EditarClientePage } = await import('./page');
const { NOTA_PROMOCIONES_PANEL } = await import('../../../../../services/usuarios');
const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

describe('Editar clienta (panel)', () => {
  it('sin promociones guardadas el personal no puede activarlas: casilla deshabilitada con su nota', () => {
    const html = renderToStaticMarkup(createElement(EditarClientePage));
    const casilla = html.match(/<input[^>]*id="editar-cliente-promociones"[^>]*>/)?.[0] ?? '';
    expect(casilla).toContain('disabled');
    expect(casilla).not.toMatch(/\bchecked\b/);
    expect(html).toContain(NOTA_PROMOCIONES_PANEL);
  });

  it('sin alergias nuevas no pide la casilla de datos de salud', () => {
    const html = renderToStaticMarkup(createElement(EditarClientePage));
    expect(html).not.toContain('La persona aceptó que registremos sus datos de salud');
  });

  it('alergias: casilla del personal solo si cambian a un texto nuevo; bloquea y manda consienteDatosSensibles con cuerpoAlergias', () => {
    expect(fuente).toMatch(/\{alergiasNuevas\(alergiasGuardadas, alergias\) && \(\s*<CasillaDatosSalud\s+quien="personal"/);
    expect(fuente).toContain("errorConsentimientoCambio(alergiasGuardadas, alergias, consienteDatosSensibles, 'personal')");
    expect(fuente).toContain('...cuerpoAlergias(alergiasGuardadas, alergias)');
    expect(fuente).not.toMatch(/alergias: alergias\.trim\(\) \|\| null/);
  });

  it('promociones: solo se manda el cambio a false (cuerpoPromocionesPanel), nunca el valor tal cual', () => {
    expect(fuente).toContain('...cuerpoPromocionesPanel(promocionesGuardadas, recibePromociones)');
    expect(fuente).not.toMatch(/^\s*recibePromociones,\s*$/m);
    expect(fuente).toMatch(/id="editar-cliente-promociones"[\s\S]{0,200}disabled=\{!promocionesGuardadas\}/);
  });

  it('la edición manda rutaOrigen con la ruta real de esta pantalla (evidencia de consentimientos, máximo 300)', () => {
    expect(fuente).toContain("rutaOrigen: rutaOrigenEdicion(`/admin/clientes-crm/${id}/editar`)");
  });
});
