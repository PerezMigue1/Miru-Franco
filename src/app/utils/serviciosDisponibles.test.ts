import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Servicio, ServiciosResult } from '../services/servicios';

// Piezas visuales que no cambian la cifra: fuera, para pintar el HTML sin navegador.
vi.mock('../layouts/Header', () => ({ default: () => null }));
vi.mock('../layouts/Footer', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('../components/servicios/ServicioImagen', () => ({ default: () => null, ServicioImagenPlaceholder: () => null }));
vi.mock('../components/galeria/GaleriaTrabajo', () => ({ default: () => null }));
vi.mock('../components/galeria/GaleriaVacia', () => ({ default: () => null }));
vi.mock('../components/home/CarruselProductosHome', () => ({ default: () => null }));
const getServicios = vi.fn<() => Promise<ServiciosResult>>();
vi.mock('../services/servicios', () => ({ getServicios: () => getServicios() }));

const { cifraServiciosDisponibles, nombresServiciosFooter, cargarNombresServiciosFooter } = await import('./serviciosDisponibles');
const { default: SeccionesHome } = await import('../components/home/SeccionesHome');
const { default: SobreNosotrosPage } = await import('../sobre-nosotros/page');

const servicio = (id: number, nombre: string, activo = true): Servicio => ({ id, nombre, activo });
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('cifraServiciosDisponibles', () => {
  it('cuenta solo los servicios activos', () => {
    expect(cifraServiciosDisponibles([servicio(1, 'Corte'), servicio(2, 'Tinte'), servicio(3, 'Viejo', false)])).toEqual({
      num: '2',
      label: 'Servicios disponibles',
    });
  });

  it('en singular cuando hay uno', () => {
    expect(cifraServiciosDisponibles([servicio(1, 'Corte')])).toEqual({ num: '1', label: 'Servicio disponible' });
  });

  it('sin servicios (o si el API falló) no hay cifra: nunca se inventa', () => {
    expect(cifraServiciosDisponibles([])).toBeNull();
    expect(cifraServiciosDisponibles([servicio(1, 'Viejo', false)])).toBeNull();
  });
});

describe('nombresServiciosFooter', () => {
  it('nombres de los activos, sin repetir ni vacíos, como máximo 6', () => {
    const lista = [
      servicio(1, ' Corte '),
      servicio(2, 'Corte'),
      servicio(3, ''),
      servicio(4, 'Inactivo', false),
      ...['Tinte', 'Alaciado', 'Keratina', 'Peinado', 'Botox', 'Mechas'].map((n, i) => servicio(10 + i, n)),
    ];
    expect(nombresServiciosFooter(lista)).toEqual(['Corte', 'Tinte', 'Alaciado', 'Keratina', 'Peinado', 'Botox']);
  });
});

describe('cargarNombresServiciosFooter', () => {
  it('usa el catálogo y lo guarda una hora (revalidate 3600)', async () => {
    const obtener = vi.fn(async (): Promise<ServiciosResult> => ({ data: [servicio(1, 'Corte')], error: null }));
    const t0 = 1_000_000_000_000;
    expect(await cargarNombresServiciosFooter(obtener, t0)).toEqual(['Corte']);
    expect(await cargarNombresServiciosFooter(obtener, t0 + 3_599_000)).toEqual(['Corte']);
    expect(obtener).toHaveBeenCalledTimes(1);
    await cargarNombresServiciosFooter(obtener, t0 + 3_601_000);
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it('si el API responde con error o lanza, devuelve una lista vacía sin romper', async () => {
    const t = 2_000_000_000_000;
    expect(await cargarNombresServiciosFooter(async () => ({ data: [], error: 'caído' }), t)).toEqual([]);
    expect(
      await cargarNombresServiciosFooter(async () => {
        throw new Error('red');
      }, t + 10_000_000),
    ).toEqual([]);
  });
});

describe('Home: la cifra de servicios sale del catálogo', () => {
  const pintar = (servicios: Servicio[]) =>
    texto(renderToStaticMarkup(createElement(SeccionesHome, { initialProductos: [], initialServicios: servicios })));

  it('muestra el número real de servicios activos', () => {
    const t = pintar([servicio(1, 'Corte'), servicio(2, 'Tinte'), servicio(3, 'Alaciado')]);
    expect(t).toContain(' 3 ');
    expect(t).toContain('Servicios disponibles');
  });

  it('sin servicios oculta la cifra', () => {
    expect(pintar([])).not.toContain('Servicios disponibles');
  });
});

describe('Sobre nosotros: la cifra de servicios sale del catálogo', () => {
  const pintar = async () => texto(renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement));

  it('muestra el número real de servicios activos', async () => {
    getServicios.mockResolvedValueOnce({ data: [1, 2, 3, 4].map((i) => servicio(i, `S${i}`)), error: null });
    const t = await pintar();
    expect(t).toContain(' 4 ');
    expect(t).toContain('Servicios disponibles');
  });

  it('si el API falla, la cifra se oculta', async () => {
    getServicios.mockResolvedValueOnce({ data: [], error: 'caído' });
    expect(await pintar()).not.toContain('Servicios disponibles');
  });
});

describe('Sin cifras fijas de servicios', () => {
  it.each(['components/home/SeccionesHome.tsx', 'sobre-nosotros/page.tsx'])('%s no escribe "15+"', (archivo) => {
    expect(readFileSync(join(__dirname, '..', archivo), 'utf8')).not.toContain("'15+'");
  });
});
