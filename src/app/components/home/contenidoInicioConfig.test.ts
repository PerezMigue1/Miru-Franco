import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CONFIGURACION_POR_OMISION, type ContenidoInicio } from '../../services/configuracionSitio';

vi.mock('next/image', () => ({ default: (p: { src: string; alt: string }) => createElement('img', { src: p.src, alt: p.alt }) }));
vi.mock('../galeria/GaleriaTrabajo', () => ({ default: () => null }));
vi.mock('./CarruselProductosHome', () => ({ default: () => null }));

const { default: HeroFluidos } = await import('./HeroFluidos');
const { seleccionarFluidos } = await import('../../utils/fluidosHero');
const { default: SeccionesHome } = await import('./SeccionesHome');

/** Textos e imagen del inicio: salen de Configuración del sitio (contenido_inicio), no del código. */
const contenido: ContenidoInicio = {
  ...CONFIGURACION_POR_OMISION.contenido.inicio,
  heroTexto: 'Texto de portada desde la configuración.',
  heroDestacado: 'Cabello que brilla',
  productosDescripcion: 'Productos desde la configuración.',
  serviciosDescripcion: 'Servicios desde la configuración.',
  trabajoDescripcion: 'Galería desde la configuración.',
  sobreNosotrosParrafos: ['Primer párrafo configurado.', 'Segundo párrafo configurado.'],
  sobreNosotrosImagen: 'https://res.cloudinary.com/demo/image/upload/salon.jpg',
  cierreTitulo: 'Título de cierre configurado',
  cierreTexto: 'Texto de cierre configurado.',
};

describe('Inicio con el contenido de Configuración del sitio', () => {
  it('el hero muestra el texto y la frase grande de la configuración (palabras del medio en su estilo)', () => {
    const html = renderToStaticMarkup(createElement(HeroFluidos, { fluidos: seleccionarFluidos([]), texto: contenido.heroTexto, destacado: contenido.heroDestacado }));
    expect(html).toContain('Texto de portada desde la configuración.');
    expect(html).toMatch(/Cabello <span>que<\/span> brilla/);
  });

  it('las secciones muestran sus textos, la imagen de "Sobre nosotros" y el cierre de la configuración', () => {
    const html = renderToStaticMarkup(createElement(SeccionesHome, { initialProductos: [], initialServicios: [], contenido }));
    for (const t of ['Productos desde la configuración.', 'Servicios desde la configuración.', 'Galería desde la configuración.', 'Primer párrafo configurado.', 'Segundo párrafo configurado.', 'Título de cierre configurado', 'Texto de cierre configurado.']) {
      expect(html).toContain(t);
    }
    expect(html).toContain('src="https://res.cloudinary.com/demo/image/upload/salon.jpg"');
  });

  it('no quedan esos textos escritos a mano en el código', () => {
    const hero = readFileSync(join(__dirname, 'HeroFluidos.tsx'), 'utf8');
    const secciones = readFileSync(join(__dirname, 'SeccionesHome.tsx'), 'utf8');
    expect(hero).not.toContain('Realza tu belleza natural con productos');
    expect(hero).not.toMatch(/Brillo <span>que se<\/span> nota/);
    expect(secciones).not.toContain('¿Lista para tu cambio de look?');
    expect(secciones).not.toContain('Lo que usamos en el salón, para que lo sigas en casa.');
  });
});

describe('Inicio: galería y promoción desde su panel', () => {
  it('con fotos de la galería (Operaciones > Galería) las usa en lugar de las fotos de los servicios', async () => {
    const { default: Secciones } = await import('./SeccionesHome');
    const fuente = readFileSync(join(__dirname, 'SeccionesHome.tsx'), 'utf8');
    expect(fuente).toContain('fotosGaleria');
    expect(() => renderToStaticMarkup(createElement(Secciones, { initialProductos: [], initialServicios: [], fotosGaleria: [{ url: 'https://res.cloudinary.com/demo/image/upload/galeria/a.jpg', alt: 'Corte', servicioId: null, servicio: 'Trabajo del salón' }] }))).not.toThrow();
  });

  it('una promoción destacada sale como banner con su enlace; sin promoción no hay banner', async () => {
    const { default: Secciones } = await import('./SeccionesHome');
    const con = renderToStaticMarkup(
      createElement(Secciones, {
        initialProductos: [],
        initialServicios: [],
        promocionDestacada: { id: 1, titulo: 'Martes de color', descripcion: '15% en coloración.', imagenUrl: null, enlace: '/cliente/servicios-citas', vigenteDesde: null, vigenteHasta: null, destacada: true },
      }),
    );
    expect(con).toContain('Martes de color');
    expect(con).toContain('15% en coloración.');
    expect(con).toContain('href="/cliente/servicios-citas"');
    const sin = renderToStaticMarkup(createElement(Secciones, { initialProductos: [], initialServicios: [] }));
    expect(sin).not.toContain('aria-label="Promoción"');
  });
});
