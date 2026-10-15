import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  usePathname: () => '/home',
}));
vi.mock('../context/CartContext', () => ({ useCart: () => ({ totalItems: 0 }) }));
vi.mock('../hooks/useAvisosNotificaciones', () => ({
  useAvisosNotificaciones: () => ({
    noLeidas: 0,
    lista: [],
    avisos: [],
    cerrarAviso: () => undefined,
    abrirAviso: async () => undefined,
    marcarLeida: async () => undefined,
    marcarTodas: async () => undefined,
  }),
}));
vi.mock('../services/ecommerce', () => ({ listarNotificaciones: async () => [] }));
vi.mock('./MenuHorizontal', () => ({ default: () => null }));
vi.mock('./MenuHamburguesa', () => ({ default: () => null }));
// El selector de tema se sustituye por un botón marcador para poder ubicarlo en el HTML.
vi.mock('../components/ui/ThemeToggle', async () => {
  const { createElement: crear } = await import('react');
  return { default: () => crear('button', { type: 'button', 'aria-label': 'Tema de prueba' }) };
});

// Sin DOM no se puede pulsar el menú ni iniciar sesión: se fuerzan los useState del Header
// (1.º isUserMenuOpen, 2.º isMenuOpen, 4.º isLoggedIn). El Header llama sus hooks antes que cualquier hijo.
const forzar: { cuenta: boolean; menu: boolean; sesion: boolean } = { cuenta: false, menu: false, sesion: false };
let llamada = 0;
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useState: (inicial: unknown) => {
      llamada += 1;
      if (llamada === 1 && forzar.cuenta) return react.useState(true);
      if (llamada === 2 && forzar.menu) return react.useState(true);
      if (llamada === 4 && forzar.sesion) return react.useState(true);
      return react.useState(inicial);
    },
  };
});

const { default: Header } = await import('./Header');

function pintar(opciones: Partial<typeof forzar> = {}) {
  forzar.cuenta = opciones.cuenta ?? false;
  forzar.menu = opciones.menu ?? false;
  forzar.sesion = opciones.sesion ?? false;
  llamada = 0;
  return renderToStaticMarkup(createElement(Header));
}

const clases = (atributos: string) => (atributos.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/);

/** Clases del contenedor inmediato del selector de tema (el primero que aparece en `html`). */
function contenedorTema(html: string): string[] {
  const m = html.match(/<(?:div|span) class="([^"]*)"><button type="button" aria-label="Tema de prueba">/);
  if (!m) throw new Error('No hay selector de tema con contenedor propio');
  return m[1].split(/\s+/);
}

/** Desde el panel lateral hasta el final: lo que vive dentro del menú móvil. */
const panelLateral = (html: string) => html.slice(html.indexOf('id="menu-movil"'));

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

/**
 * H1: a 375 px con sesión el logotipo se cortaba ("Mirú Fra…") porque tema, carrito, campana y
 * cuenta no dejaban sitio. Con sesión, por debajo de 440 px el tema pasa al menú lateral y el
 * monograma se oculta (con ambos, el logotipo necesita unos 430 px de ventana).
 */
describe('H1 Header con sesión en móvil: el logotipo cabe completo', () => {
  it('con sesión, el selector de tema de la barra se oculta por debajo de 440 px', () => {
    expect(contenedorTema(pintar({ sesion: true }))).toEqual(expect.arrayContaining(['hidden', 'min-[440px]:flex']));
  });

  it('sin sesión, el selector de tema se ve en todos los anchos', () => {
    expect(contenedorTema(pintar())).not.toContain('hidden');
  });

  it('con sesión, el monograma aparece desde 440 px; sin sesión, desde 384 px como antes', () => {
    const monograma = (html: string) =>
      (html.match(/<div class="([^"]*)"><img[^>]*alt="Mirú Franco Logo"/)?.[1] ?? '').split(/\s+/);
    expect(monograma(pintar({ sesion: true }))).toEqual(expect.arrayContaining(['hidden', 'min-[440px]:block']));
    expect(monograma(pintar({ sesion: true }))).not.toContain('min-[384px]:block');
    expect(monograma(pintar())).toEqual(expect.arrayContaining(['hidden', 'min-[384px]:block']));
  });

  it('con sesión y el menú abierto, el selector de tema está en el panel lateral solo por debajo de 440 px', () => {
    const panel = panelLateral(pintar({ sesion: true, menu: true }));
    expect(contenedorTema(panel)).toContain('min-[440px]:hidden');
  });

  it('sin sesión el panel lateral no repite el selector de tema (ya está en la barra)', () => {
    expect(panelLateral(pintar({ menu: true }))).not.toContain('Tema de prueba');
  });

  it('el nombre junto al avatar se muestra desde md: entre 640 y 767 px no cabía junto al logotipo', () => {
    const nombre = pintar({ sesion: true }).match(/<span class="([^"]*)">Usuario<\/span>/);
    expect(nombre, 'el nombre del usuario se pinta en el botón de la cuenta').not.toBeNull();
    expect(nombre![1].split(/\s+/)).toEqual(expect.arrayContaining(['hidden', 'md:block']));
    expect(nombre![1].split(/\s+/)).not.toContain('sm:block');
  });
});

/** H2: el botón de la cuenta en móvil no tenía nombre accesible y medía 48×24. */
describe('H2 botón del menú de la cuenta', () => {
  const botonCuenta = (html: string) => {
    const m = html.match(/<button\b[^>]*aria-label="Menú de tu cuenta[^"]*"[^>]*>/);
    if (!m) throw new Error('No hay botón con aria-label "Menú de tu cuenta…"');
    return m[0];
  };

  it('tiene nombre accesible que empieza por "Menú de tu cuenta" e incluye el nombre visible', () => {
    expect(botonCuenta(pintar({ sesion: true }))).toContain('aria-label="Menú de tu cuenta (Usuario)"');
  });

  it('anuncia su estado sin prometer un role="menu" que no existe, y mide al menos 44 px', () => {
    const boton = botonCuenta(pintar({ sesion: true }));
    expect(boton).toContain('type="button"');
    expect(boton).not.toContain('aria-haspopup');
    expect(boton).toContain('aria-expanded="false"');
    expect(clases(boton)).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11', 'items-center']));
  });

  it('abierto: aria-expanded="true" y aria-controls apunta al menú', () => {
    const html = pintar({ sesion: true, cuenta: true });
    const boton = botonCuenta(html);
    expect(boton).toContain('aria-expanded="true"');
    expect(boton).toContain('aria-controls="menu-cuenta"');
    expect(html).toMatch(/<div[^>]*id="menu-cuenta"/);
  });
});
