// Promociones y galería del portal: salen de la base (GET /api/contenido/promociones y GET /api/galeria), nunca de
// datos simulados ni de las fotos de los servicios. Son componentes de servidor: se espera su resultado y se pinta.
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { promociones, galeria, servicios } = vi.hoisted(() => ({
  promociones: vi.fn(),
  galeria: vi.fn(),
  servicios: vi.fn(async () => {
    throw new Error('la galería ya no lee las fotos de los servicios');
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  usePathname: () => '/cliente',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../../../components/layouts/ModuleLayout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../services/contenido', () => ({ listarPromocionesActivas: promociones }));
vi.mock('../../../services/servicios', () => ({ getServicios: servicios }));
vi.mock('../../../services/galeria', async (original) => {
  const real = await original<typeof import('../../../services/galeria')>();
  return { ...real, listarGaleriaPublica: galeria };
});

const { default: PromocionesPage } = await import('./promociones/page');
const { default: GaleriaPage } = await import('./galeria/page');

const pintar = async (pagina: () => Promise<ReactElement>) => renderToStaticMarkup(await pagina());

afterEach(() => vi.clearAllMocks());

describe('/cliente/promociones', () => {
  it('muestra las promociones activas de la base, con su vigencia y su enlace interno', async () => {
    promociones.mockResolvedValueOnce({
      data: [
        { id: 1, titulo: 'Martes de color', descripcion: '15% en tintes los martes.', imagenUrl: null, enlace: '/cliente/servicios-citas', vigenteDesde: '2026-10-01', vigenteHasta: '2026-10-31', destacada: true },
        { id: 2, titulo: 'Kit de cuidado', descripcion: 'Regalo con tu compra.', imagenUrl: null, enlace: null, vigenteDesde: null, vigenteHasta: null, destacada: false },
      ],
      error: null,
    });
    const html = await pintar(PromocionesPage);
    expect(html).toContain('Martes de color');
    expect(html).toContain('Kit de cuidado');
    expect(html).toContain('31 de octubre de 2026');
    expect(html).toContain('href="/cliente/servicios-citas"');
    // Ya no quedan los datos simulados de 2024
    expect(html).not.toContain('2024');
    expect(html).not.toContain('Descuento de Verano');
  });

  it('sin promociones: estado vacío honesto', async () => {
    promociones.mockResolvedValueOnce({ data: [], error: null });
    const html = await pintar(PromocionesPage);
    expect(html).toMatch(/no hay promociones activas/i);
    expect(html).not.toContain('No pudimos cargar');
  });

  it('si el API falla lo dice, sin inventar promociones', async () => {
    promociones.mockResolvedValueOnce({ data: [], error: 'No hay conexión con el servidor.' });
    expect(await pintar(PromocionesPage)).toMatch(/No pudimos cargar las promociones/);
  });
});

describe('/cliente/galeria', () => {
  it('usa GET /api/galeria (texto alternativo del equipo) y no las fotos de los servicios', async () => {
    galeria.mockResolvedValueOnce({
      data: [
        { id: 1, url: 'https://res.cloudinary.com/demo/image/upload/galeria/a.jpg', alt: 'Balayage miel', servicio: { id: 3, nombre: 'Color', categoria: 'Color' } },
        { id: 2, url: 'https://res.cloudinary.com/demo/image/upload/galeria/b.jpg', alt: 'Recogido de novia', servicio: null },
      ],
      error: null,
    });
    const html = await pintar(GaleriaPage);
    expect(html).toContain('alt="Balayage miel"');
    expect(html).toContain('alt="Recogido de novia"');
    expect(servicios).not.toHaveBeenCalled();
  });

  it('sin fotos: estado vacío; con error, el aviso', async () => {
    galeria.mockResolvedValueOnce({ data: [], error: null });
    expect(await pintar(GaleriaPage)).toContain('Pronto verás aquí nuestro trabajo');
    galeria.mockResolvedValueOnce({ data: [], error: 'caído' });
    expect(await pintar(GaleriaPage)).toMatch(/No pudimos cargar las fotos/);
  });
});

// createElement se importa para que el JSX de las páginas tenga React en el ámbito del módulo de prueba.
void createElement;
