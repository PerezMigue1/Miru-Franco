import { describe, expect, it, vi } from 'vitest';
import { CONFIGURACION_POR_OMISION } from '../services/configuracionSitio';

const config = {
  ...CONFIGURACION_POR_OMISION,
  salon: { ...CONFIGURACION_POR_OMISION.salon, nombre: 'Nombre Configurado', descripcionSeo: 'Descripción configurada para buscadores.' },
};
vi.mock('../services/configuracionSitio', async (original) => ({
  ...(await original<typeof import('../services/configuracionSitio')>()),
  obtenerConfiguracionPublica: async () => config,
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/font/google', () => {
  const fuente = () => ({ variable: 'fuente', className: 'fuente' });
  return { Geist: fuente, Geist_Mono: fuente, Playfair_Display: fuente, Great_Vibes: fuente };
});

/** Nombre y descripción del sitio para buscadores: Configuración del sitio (sin guiones largos). */
describe('Metadata con el nombre de la configuración', () => {
  it('layout raíz: título por defecto, plantilla y descripción de la configuración', async () => {
    const { generateMetadata } = await import('../layout');
    const m = await generateMetadata();
    expect(m.title).toEqual({ default: 'Nombre Configurado', template: '%s | Nombre Configurado' });
    expect(m.description).toBe('Descripción configurada para buscadores.');
    expect(m.openGraph).toMatchObject({ title: 'Nombre Configurado', siteName: 'Nombre Configurado' });
  });

  it('inicio: título con el nombre configurado y su ciudad, sin guion largo', async () => {
    const { generateMetadata } = await import('../home/page');
    const m = await generateMetadata();
    const titulo = JSON.stringify(m.title);
    expect(titulo).toContain('Nombre Configurado en Huejutla de Reyes');
    expect(titulo).not.toContain('\u2014');
    expect(m.description).toBe('Descripción configurada para buscadores.');
  });

  it('el nombre de respaldo de los títulos es el nombre registrado del salón', async () => {
    const { SITE_NAME } = await import('./seo');
    expect(SITE_NAME).toBe(CONFIGURACION_POR_OMISION.salon.nombre);
  });
});
