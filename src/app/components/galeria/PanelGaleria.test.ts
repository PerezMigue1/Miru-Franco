// Operaciones > Galería sin DOM (renderToStaticMarkup): la becaria (galeria:lectura) solo ve; quien gestiona tiene la
// subida y los botones de cada foto, accesibles con teclado y con nombre.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FotoPanel } from '../../services/galeria';

const permisos = vi.hoisted(() => ({ lista: [] as string[] }));
vi.mock('../../utils/permisos', () => ({ usePermisos: () => ({ permisos: permisos.lista, tienePermiso: () => true }) }));
vi.mock('../../services/servicios', () => ({ getServicios: async () => ({ data: [], error: null }) }));

const { default: PanelGaleria, TarjetaFoto } = await import('./PanelGaleria');

const foto = (cambios: Partial<FotoPanel> = {}): FotoPanel => ({
  id: 7,
  url: 'https://res.cloudinary.com/demo/image/upload/galeria/a.jpg',
  alt: 'Corte bob',
  orden: 0,
  visible: true,
  ilustrativa: false,
  sinPersonasIdentificables: null,
  revisada: false,
  publicable: false,
  servicio: null,
  consentimiento: null,
  subidoPor: { nombre: 'Eva' },
  creadoEn: '2026-10-01T00:00:00.000Z',
  ...cambios,
});

const tarjeta = (gestiona: boolean, f = foto()) =>
  renderToStaticMarkup(
    createElement(TarjetaFoto, {
      foto: f,
      gestiona,
      ocupada: false,
      primera: true,
      ultima: false,
      onEditar: () => undefined,
      onAlternar: () => undefined,
      onMover: () => undefined,
      onEliminar: () => undefined,
    }),
  );

describe('Panel de la galería', () => {
  it('la becaria (solo galeria:lectura) no ve la subida', () => {
    permisos.lista = ['galeria:lectura'];
    const html = renderToStaticMarkup(createElement(PanelGaleria));
    expect(html).not.toContain('Subir fotos');
    expect(html).not.toContain('Elegir fotos');
    expect(html).toContain('pide ayuda a una estilista');
  });

  it('quien gestiona ve la subida con el tipo de imagen obligatorio y los formatos permitidos', () => {
    permisos.lista = ['galeria:gestionar'];
    const html = renderToStaticMarkup(createElement(PanelGaleria));
    expect(html).toContain('Subir fotos');
    expect(html).toContain('Elegir fotos');
    expect(html).toContain('JPG, PNG o WebP, hasta 5 MB');
    expect(html).toContain('¿Qué vas a subir?');
  });

  it('en Admin > Contenido el título es h2', () => {
    permisos.lista = ['*'];
    expect(renderToStaticMarkup(createElement(PanelGaleria, { incrustado: true }))).toMatch(/<h2[^>]*>Galería<\/h2>/);
  });
});

describe('Tarjeta de cada foto', () => {
  it('sin gestión: sin botones', () => {
    const html = tarjeta(false);
    expect(html).not.toContain('<button');
    expect(html).toContain('Sin revisar');
    expect(html).toContain('Revisa si aparece alguna persona identificable');
  });

  it('con gestión: editar, ocultar, subir, bajar y eliminar con nombre accesible; subir deshabilitado en la primera', () => {
    const html = tarjeta(true);
    for (const etiqueta of ['Editar foto: Corte bob', 'Ocultar del sitio: Corte bob', 'Subir en el orden: Corte bob', 'Bajar en el orden: Corte bob', 'Eliminar foto: Corte bob']) {
      expect(html).toContain(`aria-label="${etiqueta}"`);
    }
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Subir en el orden: Corte bob"/);
  });

  it('una autorización revocada se marca', () => {
    const html = tarjeta(true, foto({ revisada: true, sinPersonasIdentificables: false, visible: false, consentimiento: { id: '2', nombre: 'Bea', fecha: '', vigente: false } }));
    expect(html).toContain('Autorización revocada');
    expect(html).toContain('Mostrar en el sitio: Corte bob');
  });
});
