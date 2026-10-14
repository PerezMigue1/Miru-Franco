import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  usePathname: () => '/home',
}));
vi.mock('../context/CartContext', () => ({ useCart: () => ({ totalItems: 0 }) }));
vi.mock('../hooks/useNotificacionesSSE', () => ({ useNotificacionesSSE: () => undefined }));
vi.mock('../services/ecommerce', () => ({ listarNotificaciones: async () => [] }));
vi.mock('./MenuHorizontal', () => ({ default: () => null }));
vi.mock('./MenuHamburguesa', () => ({ default: () => null }));
vi.mock('../components/ui/ThemeToggle', () => ({ default: () => null }));

// Sin DOM no se puede pulsar el menú ni iniciar sesión: se fuerzan los useState del Header
// (2.º isMenuOpen, 4.º isLoggedIn). El Header llama sus hooks antes que cualquier hijo.
const forzar: { menu: boolean; sesion: boolean } = { menu: false, sesion: false };
let llamada = 0;
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) => {
      llamada += 1;
      if (llamada === 2 && forzar.menu) return react.useState(true);
      if (llamada === 4 && forzar.sesion) return react.useState(true);
      return react.useState(inicial);
    },
  };
});

const { default: Header } = await import('./Header');

function pintar(opciones: Partial<typeof forzar> = {}) {
  forzar.menu = opciones.menu ?? false;
  forzar.sesion = opciones.sesion ?? false;
  llamada = 0;
  return renderToStaticMarkup(createElement(Header));
}

/** Etiqueta de apertura del elemento con ese aria-label. */
function etiqueta(html: string, ariaLabel: string): string {
  const m = html.match(new RegExp(`<(?:a|button)\\b[^>]*aria-label="${ariaLabel}"[^>]*>`));
  if (!m) throw new Error(`No hay elemento con aria-label="${ariaLabel}"`);
  return m[0];
}

describe('Header: botón del menú', () => {
  it('cerrado: "Abrir menú" en español con aria-expanded="false"', () => {
    const boton = etiqueta(pintar(), 'Abrir menú');
    expect(boton).toContain('aria-expanded="false"');
    expect(boton).toContain('aria-controls="menu-movil"');
  });

  it('abierto: "Cerrar menú" con aria-expanded="true"', () => {
    const boton = etiqueta(pintar({ menu: true }), 'Cerrar menú');
    expect(boton).toContain('aria-expanded="true"');
  });

  it('el panel móvil es un diálogo modal enfocable', () => {
    const html = pintar({ menu: true });
    expect(html).toMatch(/<div[^>]*id="menu-movil"[^>]*>/);
    const panel = html.match(/<div[^>]*id="menu-movil"[^>]*>/)![0];
    expect(panel).toContain('role="dialog"');
    expect(panel).toContain('aria-modal="true"');
    expect(panel).toContain('aria-label="Menú"');
    expect(panel).toContain('tabindex="-1"');
  });
});

describe('Header: áreas táctiles de 44 px y notificaciones', () => {
  it('Carrito mide al menos 44 px', () => {
    const carrito = etiqueta(pintar(), 'Carrito');
    expect(carrito).toContain('min-h-11');
    expect(carrito).toContain('min-w-11');
  });

  it('Iniciar sesión mide al menos 44 px', () => {
    const acceso = etiqueta(pintar(), 'Iniciar sesión');
    expect(acceso).toContain('min-h-11');
    expect(acceso).toContain('min-w-11');
  });

  it('sin sesión no se muestra la campana de notificaciones', () => {
    expect(pintar()).not.toContain('aria-label="Notificaciones"');
  });

  it('con sesión se muestra la campana, de al menos 44 px', () => {
    const campana = etiqueta(pintar({ sesion: true }), 'Notificaciones');
    expect(campana).toContain('min-h-11');
    expect(campana).toContain('min-w-11');
  });
});
