// Corrección visual de pantallas de la clienta (revisión a 375 y 1440 px): facturas sin tabla vacía y
// "Eliminar" de las notificaciones sin relleno. Sin DOM: los efectos no corren, así que se fuerza el
// estado ya cargado (loading en false y, en notificaciones, una notificación en la lista).
import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const forzar = vi.hoisted(() => ({ cargado: false, lista: null as unknown[] | null }));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) => {
      // `loading` es el único estado de estas páginas que empieza en true.
      if (forzar.cargado && inicial === true) return react.useState(false);
      if (forzar.lista && Array.isArray(inicial) && inicial.length === 0) return react.useState(forzar.lista);
      return react.useState(inicial);
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, back: () => undefined }),
  usePathname: () => '/cliente',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../../../components/layouts/ModuleLayout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../utils/security', () => ({ hasValidToken: () => true }));
vi.mock('../../../utils/toast', () => ({
  showAlert: async () => undefined,
  showConfirm: async () => false,
  showToast: () => undefined,
}));
vi.mock('../../../services/ecommerce', () => ({
  listarFacturasDelCliente: async () => [],
  listarPedidos: async () => [],
  crearFactura: async () => ({}),
  listarNotificaciones: async () => [],
  actualizarNotificacion: async () => ({}),
  eliminarNotificacion: async () => undefined,
}));
vi.mock('../../../services/pos', () => ({ obtenerMiTicketVenta: async () => ({}) }));
vi.mock('../../../utils/ticketVenta', () => ({ generarTicketVentaPdf: () => undefined }));

const pintar = (Pagina: ComponentType) => renderToStaticMarkup(createElement(Pagina));
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

afterEach(() => {
  forzar.cargado = false;
  forzar.lista = null;
});

describe('H6 facturas: sin facturas no se pinta la tabla', () => {
  it('muestra el estado vacío del sistema en lugar de una tabla con una celda centrada', async () => {
    forzar.cargado = true;
    const { default: Pagina } = await import('./facturas/page');
    const html = pintar(Pagina);
    expect(html).not.toContain('<table');
    expect(texto(html)).not.toContain('Folio / serie');
    expect(texto(html)).toContain('Aún no tienes facturas');
  });

  it('la solicitud de factura sigue disponible debajo del estado vacío', async () => {
    forzar.cargado = true;
    const { default: Pagina } = await import('./facturas/page');
    const t = texto(pintar(Pagina));
    expect(t).toContain('Aún no tienes facturas');
    expect(t).toContain('Solicitar factura');
    expect(t.indexOf('Aún no tienes facturas')).toBeLessThan(t.indexOf('Solicitar factura'));
  });
});

describe('B8 notificaciones: "Eliminar" de contorno en cada tarjeta', () => {
  const notificacion = {
    id: 'n-1',
    tipo: 'pedido',
    titulo: 'Pedido entregado en el salón',
    mensaje: 'Tu pedido #3093 fue entregado en el salón',
    leida: false,
    creadoEn: '2026-10-14T21:27:13.000Z',
  };

  it('el botón Eliminar no lleva relleno: es de contorno con texto de peligro', async () => {
    forzar.cargado = true;
    forzar.lista = [notificacion];
    const { default: Pagina } = await import('./notificaciones/page');
    const html = pintar(Pagina);
    const boton = html.match(/<button\b[^>]*style="([^"]*)"[^>]*>Eliminar<\/button>/);
    expect(boton, 'la tarjeta tiene su botón Eliminar').not.toBeNull();
    expect(boton![1]).toContain('--btn-bg:transparent');
    expect(boton![1]).not.toContain('--btn-bg:var(--danger)');
    expect(boton![1]).not.toContain('--btn-bg:var(--botones-principales)');
  });
});
