import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Producto } from '../../services/productos';
import type { Servicio } from '../../services/servicios';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('../galeria/GaleriaTrabajo', () => ({ default: () => null }));
vi.mock('../home/CarruselProductosHome', () => ({ default: () => null }));

const RAIZ = join(__dirname, '..', '..', '..', '..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');
const LEYENDA = 'Precio total en pesos, IVA incluido';

// Importados al cargar el archivo y no dentro de cada prueba: la compilación en frío del home no debe contar
// contra el límite de 5 s de un it cuando la suite completa corre en paralelo.
const { default: LeyendaPrecioIva, LEYENDA_PRECIO_IVA } = await import('./LeyendaPrecioIva');
const { default: SeccionesHome } = await import('../home/SeccionesHome');

describe('Leyenda de precios con IVA', () => {
  it('el texto es el acordado y se pinta tal cual', async () => {
    expect(LEYENDA_PRECIO_IVA).toBe(LEYENDA);
    expect(renderToStaticMarkup(createElement(LeyendaPrecioIva))).toContain(LEYENDA);
  });

  it.each([
    'src/app/(screens)/(privada)/cliente/tienda-online/page.tsx',
    'src/app/(screens)/(privada)/cliente/tienda-online/productos/[id]/DetalleProductoClient.tsx',
    'src/app/(screens)/(privada)/cliente/servicios-citas/page.tsx',
    'src/app/(screens)/(privada)/cliente/servicios-citas/servicios/[id]/page.tsx',
  ])('%s muestra la leyenda una vez (no en cada tarjeta)', (archivo) => {
    const usos = leer(archivo).match(/<LeyendaPrecioIva\b/g) ?? [];
    expect(usos).toHaveLength(1);
  });

  it('las tarjetas no repiten la leyenda', () => {
    for (const archivo of ['src/app/components/tienda/TarjetaCatalogo.tsx', 'src/app/components/servicios/TarjetaServicio.tsx']) {
      expect(leer(archivo)).not.toContain('LeyendaPrecioIva');
    }
  });

  it('el home la muestra junto a los precios de productos y de servicios', async () => {
    const producto = { id: 1, nombre: 'Shampoo', precio: '$350', stock: true } as unknown as Producto;
    const servicio: Servicio = { id: 1, nombre: 'Corte', precio: '350' };
    const html = renderToStaticMarkup(createElement(SeccionesHome, { initialProductos: [producto], initialServicios: [servicio] }));
    expect(html.split(LEYENDA)).toHaveLength(3);
  });

  it('sin productos ni servicios en el home no hay leyenda suelta', async () => {
    const html = renderToStaticMarkup(createElement(SeccionesHome, { initialProductos: [], initialServicios: [] }));
    expect(html).not.toContain(LEYENDA);
  });
});
