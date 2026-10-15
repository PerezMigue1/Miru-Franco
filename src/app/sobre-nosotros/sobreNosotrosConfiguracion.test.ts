import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CONFIGURACION_POR_OMISION, type ConfiguracionPublica } from '../services/configuracionSitio';

vi.mock('../layouts/Header', () => ({ default: () => null }));
vi.mock('../layouts/Footer', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: (p: { src: string; alt: string }) => createElement('img', { src: p.src, alt: p.alt }) }));
vi.mock('../services/servicios', () => ({ getServicios: async () => ({ data: [], error: null }) }));
vi.mock('../services/contenido', () => ({
  listarEquipoPublico: async () => ({ data: [{ nombre: 'Estilista Uno', puesto: 'Colorista', foto: null, bio: 'Especialista en color.' }], error: null }),
}));

const config: ConfiguracionPublica = {
  ...CONFIGURACION_POR_OMISION,
  contenido: {
    ...CONFIGURACION_POR_OMISION.contenido,
    sobreNosotros: {
      titulo: 'Título configurado',
      parrafos: ['Historia uno configurada.', 'Historia dos configurada.'],
      imagen: 'https://res.cloudinary.com/demo/image/upload/equipo.jpg',
      valores: [{ titulo: 'Valor configurado', descripcion: 'Descripción del valor configurado.' }],
    },
  },
};
vi.mock('../services/configuracionSitio', async (original) => ({
  ...(await original<typeof import('../services/configuracionSitio')>()),
  obtenerConfiguracionPublica: async () => config,
}));

const { default: SobreNosotrosPage } = await import('./page');

describe('"Sobre nosotros" con el contenido de Configuración del sitio', () => {
  it('muestra el título, la historia, la imagen y los valores de la configuración', async () => {
    const html = renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement);
    for (const t of ['Título configurado', 'Historia uno configurada.', 'Historia dos configurada.', 'Valor configurado', 'Descripción del valor configurado.']) {
      expect(html).toContain(t);
    }
    expect(html).toContain('src="https://res.cloudinary.com/demo/image/upload/equipo.jpg"');
  });

  it('muestra el equipo publicado desde Admin > Contenido (nombre, puesto y bio)', async () => {
    const html = renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement);
    expect(html).toContain('Nuestro equipo');
    expect(html).toContain('Estilista Uno');
    expect(html).toContain('Colorista');
    expect(html).toContain('Especialista en color.');
  });

  it('no deja la historia ni los valores escritos a mano', () => {
    const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(fuente).not.toContain('Pasión por la belleza natural');
    expect(fuente).not.toContain('const VALORES');
  });
});
