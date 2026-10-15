import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EstadoAvisos } from '../../utils/avisosNotificaciones';
import type { AvisoEnPantalla, NotificacionDeLista } from '../../utils/centroAvisos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
  usePathname: () => '/operacion',
}));
vi.mock('../../hooks/useAvisosNotificaciones', () => ({
  useAvisosNotificaciones: () => ({
    noLeidas: 3,
    lista: [],
    avisos: [],
    cerrarAviso: () => undefined,
    abrirAviso: async () => undefined,
    marcarLeida: async () => undefined,
    marcarTodas: async () => undefined,
  }),
}));

const { VistaCampana, VistaAvisosFlotantes, alTeclaMenu, desplazamientoMenu } = await import('./CampanaAvisos');
const { default: CampanaPanel } = await import('./CampanaPanel');

const leer = (ruta: string) => readFileSync(join(__dirname, '..', '..', ruta), 'utf8');

const lista: NotificacionDeLista[] = [
  { id: 'c', titulo: 'Pedido listo', mensaje: 'Tu pedido 12 está listo', urlAccion: '/cliente/tienda-online/pedidos/12', creadoEn: '2026-10-03T10:00:00Z' },
  { id: 'b', titulo: 'Cita agendada', mensaje: 'Corte el lunes', urlAccion: 'https://otro.sitio/x', creadoEn: '2026-10-02T10:00:00Z' },
];

const nada = () => undefined;
function pintar(props: Partial<Parameters<typeof VistaCampana>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(VistaCampana, {
      variante: 'panel',
      bandejaHref: '/cliente/notificaciones',
      noLeidas: 2,
      lista,
      abierto: false,
      estadoNativo: 'sin_pedir',
      idMenu: 'menu-avisos',
      onAlternar: nada,
      onMarcarLeida: nada,
      onMarcarTodas: nada,
      onActivarNativa: nada,
      onElegir: nada,
      ...props,
    }),
  );
}

const etiquetaDe = (html: string, ariaLabel: string) => {
  const m = html.match(new RegExp(`<(?:a|button)\\b[^>]*aria-label="${ariaLabel}"[^>]*>`));
  if (!m) throw new Error(`No hay elemento con aria-label="${ariaLabel}"`);
  return m[0];
};

describe('Campana: botón con el contador de no leídas', () => {
  it('nombre accesible con el número, aria-expanded y 44 px en el panel', () => {
    const boton = etiquetaDe(pintar(), 'Notificaciones: 2 sin leer');
    expect(boton).toContain('aria-expanded="false"');
    expect(boton).toContain('mf-panel-icono-btn');
    expect(pintar()).toMatch(/>2<\/span>/);
  });

  it('sin no leídas: "Notificaciones" y sin globo; más de 99: 99+', () => {
    expect(pintar({ noLeidas: 0, lista: [] })).toContain('aria-label="Notificaciones"');
    expect(pintar({ noLeidas: 0, lista: [] })).not.toMatch(/>0<\/span>/);
    expect(pintar({ noLeidas: 120 })).toContain('>99+<');
  });

  it('en el sitio público también mide 44 px', () => {
    const boton = etiquetaDe(pintar({ variante: 'sitio' }), 'Notificaciones: 2 sin leer');
    expect(boton).toContain('min-h-11');
    expect(boton).toContain('min-w-11');
  });

  it('cerrada no pinta la lista', () => {
    expect(pintar()).not.toContain('id="menu-avisos"');
  });
});

describe('Campana abierta: lista de avisos', () => {
  const html = pintar({ abierto: true });

  it('aria-expanded y la lista ligada con aria-controls', () => {
    const boton = etiquetaDe(html, 'Notificaciones: 2 sin leer');
    expect(boton).toContain('aria-expanded="true"');
    expect(boton).toContain('aria-controls="menu-avisos"');
    expect(html).toContain('id="menu-avisos"');
  });

  it('en el orden recibido (más recientes primero) y con enlace a su ruta interna', () => {
    expect(html.indexOf('Pedido listo')).toBeLessThan(html.indexOf('Cita agendada'));
    expect(html).toContain('href="/cliente/tienda-online/pedidos/12"');
    // Ruta externa: rutaDeNotificacion la cambia por la bandeja.
    expect(html).not.toContain('otro.sitio');
  });

  it('marcar como leído uno (con su título en el nombre) y marcar todos, de 44 px', () => {
    const uno = etiquetaDe(html, 'Marcar como leído: Pedido listo');
    expect(uno).toContain('min-h-11');
    expect(uno).toContain('min-w-11');
    expect(html).toMatch(/<button[^>]*class="[^"]*min-h-11[^"]*"[^>]*>Marcar todos como leídos<\/button>/);
  });

  it('enlace a la bandeja completa', () => {
    expect(html).toMatch(/<a[^>]*href="\/cliente\/notificaciones"[^>]*>Ver todas las notificaciones<\/a>/);
  });

  it('sin avisos: lo dice y no ofrece marcar todos', () => {
    const vacio = pintar({ abierto: true, noLeidas: 0, lista: [] });
    expect(vacio).toContain('No tienes avisos sin leer.');
    expect(vacio).not.toContain('Marcar todos como leídos');
  });

  it('sin colores escritos a mano, sin rayas largas ni emojis', () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(html).not.toMatch(/\u2014|\p{Extended_Pictographic}/u);
  });
});

describe('Campana: la notificación del navegador es una opción del menú', () => {
  it('sin pedir: botón "Activar avisos del navegador" de 44 px dentro del menú', () => {
    const html = pintar({ abierto: true, estadoNativo: 'sin_pedir' });
    expect(html).toMatch(/<button[^>]*class="[^"]*min-h-11[^"]*"[^>]*>[\s\S]*?Activar avisos del navegador[\s\S]*?<\/button>/);
  });

  it('bloqueados: una línea que explica cómo desbloquearlos, sin botón', () => {
    const html = pintar({ abierto: true, estadoNativo: 'bloqueados' });
    expect(html).toContain('candado');
    expect(html).not.toContain('Activar avisos del navegador');
  });

  it.each<EstadoAvisos | null>(['activados', 'no_soportado', null])('%s: no se ofrece', (estadoNativo) => {
    const html = pintar({ abierto: true, estadoNativo });
    expect(html).not.toContain('Activar avisos del navegador');
    expect(html).not.toContain('candado');
  });
});

describe('Campana: teclado', () => {
  it('Escape cierra la lista y devuelve el foco a la campana', () => {
    const cerrar = vi.fn();
    const preventDefault = vi.fn();
    expect(alTeclaMenu({ key: 'Escape', preventDefault }, true, cerrar)).toBe(true);
    expect(cerrar).toHaveBeenCalledWith({ devolverFoco: true });
    expect(preventDefault).toHaveBeenCalled();
  });

  it('otras teclas, o con la lista cerrada, no hacen nada', () => {
    const cerrar = vi.fn();
    expect(alTeclaMenu({ key: 'Enter', preventDefault: nada }, true, cerrar)).toBe(false);
    expect(alTeclaMenu({ key: 'Escape', preventDefault: nada }, false, cerrar)).toBe(false);
    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe('Campana: la lista cabe en pantallas angostas', () => {
  it('alineada con la campana si cabe; si no, se recorre para dejar 16 px al borde izquierdo', () => {
    expect(desplazamientoMenu({ derechaCampana: 1200, anchoVentana: 1280 })).toEqual({ ancho: 352, derecha: 0 });
    // 375 px: la campana termina en 250; la lista (343 px) quedaría fuera por la izquierda.
    expect(desplazamientoMenu({ derechaCampana: 250, anchoVentana: 375 })).toEqual({ ancho: 343, derecha: -109 });
  });
});

describe('Aviso flotante (capa 1)', () => {
  const avisos: AvisoEnPantalla[] = [{ clave: 1, id: 'x', titulo: 'Cita agendada', mensaje: 'Corte el lunes', ruta: '/cliente/servicios-citas/mis-citas/7' }];
  const html = renderToStaticMarkup(createElement(VistaAvisosFlotantes, { avisos, onCerrar: nada, onAbrir: nada }));

  it('región que se anuncia sin robar el foco, con título y mensaje', () => {
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="status"');
    expect(html).toContain('Cita agendada');
    expect(html).toContain('Corte el lunes');
  });

  it('botón X "Cerrar aviso" de 44 px', () => {
    const x = etiquetaDe(html, 'Cerrar aviso');
    expect(x).toContain('min-h-11');
    expect(x).toContain('min-w-11');
  });

  it('el aviso se puede abrir con un botón de 44 px', () => {
    expect(html).toMatch(/<button[^>]*class="[^"]*min-h-11[^"]*"[^>]*>[\s\S]*Cita agendada/);
  });

  it('sin avisos la región sigue montada (para que el lector de pantalla anuncie el siguiente)', () => {
    const vacia = renderToStaticMarkup(createElement(VistaAvisosFlotantes, { avisos: [], onCerrar: nada, onAbrir: nada }));
    expect(vacia).toContain('aria-live="polite"');
    expect(vacia).not.toContain('Cerrar aviso');
  });
});

describe('Una sola campana en cada encabezado', () => {
  it('CampanaPanel es la campana única del panel (con el contador)', () => {
    const html = renderToStaticMarkup(createElement(CampanaPanel, { href: '/admin/notificaciones' }));
    expect(html).toContain('aria-label="Notificaciones: 3 sin leer"');
    expect(html.match(/aria-label="Notificaciones/g)).toHaveLength(1);
    expect(html).not.toContain('Activar avisos del navegador');
  });

  it('PanelShell ya no monta el botón aparte de avisos del navegador', () => {
    const shell = leer('components/layouts/PanelShell.tsx');
    expect(shell).toContain('<CampanaPanel href={notificacionesHref} />');
    expect(shell).not.toContain('<AvisosNavegador');
    expect(leer('components/layouts/AdminLayout.tsx')).toContain('notificacionesHref="/admin/notificaciones"');
    expect(leer('components/layouts/OperacionLayout.tsx')).toContain('notificacionesHref="/cliente/notificaciones"');
  });

  it('el encabezado público usa la misma campana con lista', () => {
    const header = leer('layouts/Header.tsx');
    expect(header).toContain('<CampanaAvisos variante="sitio" bandejaHref="/cliente/notificaciones" />');
    expect(header).not.toContain("router.push('/cliente/notificaciones')");
  });
});

describe('Sin soporte de la notificación nativa (Android, iPhone, sin Notification)', () => {
  const UA = {
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    escritorio: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };
  /** Como Chrome en Android: existe Notification, pero el constructor lanza. */
  function NotificationQueLanza() {
    throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
  }
  NotificationQueLanza.permission = 'granted' as NotificationPermission;
  NotificationQueLanza.requestPermission = vi.fn(async () => 'granted' as NotificationPermission);

  const casos = [
    { nombre: 'Chrome en Android', ventana: { Notification: NotificationQueLanza }, userAgent: UA.android },
    { nombre: 'Safari en iPhone', ventana: {}, userAgent: UA.iphone },
    { nombre: 'navegador sin Notification', ventana: {}, userAgent: UA.escritorio },
  ];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(casos)('$nombre: no ofrece activar, no lanza y el aviso interno sí aparece', async ({ ventana, userAgent }) => {
    vi.resetModules();
    vi.stubGlobal('window', ventana);
    vi.stubGlobal('navigator', { userAgent, maxTouchPoints: 5 });
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { estadoAvisosNavegador, pedirPermisoAvisos } = await import('../../utils/avisosNotificaciones');
    const { crearCentroAvisos } = await import('../../utils/centroAvisos');

    const estado = estadoAvisosNavegador();
    expect(estado).toBe('no_soportado');
    expect(pintar({ abierto: true, estadoNativo: estado })).not.toContain('Activar avisos del navegador');
    await expect(pedirPermisoAvisos()).resolves.toBe('no_soportado');
    expect(NotificationQueLanza.requestPermission).not.toHaveBeenCalled();

    const crearNativa = vi.fn(
      (titulo: string, o: NotificationOptions) =>
        new (ventana as unknown as { Notification: new (t: string, o: NotificationOptions) => Notification }).Notification(titulo, o),
    );
    const centro = crearCentroAvisos({
      rutaRespaldo: '/cliente/notificaciones',
      haySesion: () => true,
      listarNoLeidas: async () => [],
      marcarLeida: async () => undefined,
      marcarTodas: async () => undefined,
      canalNativo: () => ({ visible: false, permiso: estadoAvisosNavegador() }),
      crearNativa,
      alFallarNativa: nada,
      enfocar: nada,
      navegar: nada,
    });
    await expect(centro.alNotificacion({ id: 'n-1', titulo: 'Cita agendada', mensaje: 'Corte' })).resolves.toBeUndefined();
    expect(crearNativa).not.toHaveBeenCalled();
    expect(centro.obtener().avisos).toEqual([expect.objectContaining({ id: 'n-1', titulo: 'Cita agendada' })]);
    expect(consola).not.toHaveBeenCalled();
    centro.detener();
    consola.mockRestore();
  });

  it('escritorio con Notification que lanza al construir: se atrapa, se recuerda y deja de ofrecerse', async () => {
    vi.resetModules();
    vi.stubGlobal('window', { Notification: NotificationQueLanza });
    vi.stubGlobal('navigator', { userAgent: UA.escritorio, maxTouchPoints: 0 });
    const m = await import('../../utils/avisosNotificaciones');
    const { crearCentroAvisos } = await import('../../utils/centroAvisos');
    expect(m.estadoAvisosNavegador()).toBe('activados');

    const centro = crearCentroAvisos({
      rutaRespaldo: '/r',
      haySesion: () => true,
      listarNoLeidas: async () => [],
      marcarLeida: async () => undefined,
      marcarTodas: async () => undefined,
      canalNativo: () => ({ visible: false, permiso: m.estadoAvisosNavegador() }),
      crearNativa: (titulo, o) => new (NotificationQueLanza as unknown as new (t: string, o: NotificationOptions) => Notification)(titulo, o),
      alFallarNativa: m.recordarFalloNativa,
      enfocar: nada,
      navegar: nada,
    });
    await expect(centro.alNotificacion({ id: 'n-1', titulo: 'T', mensaje: 'M' })).resolves.toBeUndefined();
    expect(centro.obtener().avisos).toHaveLength(1);
    expect(m.estadoAvisosNavegador()).toBe('no_soportado');
    expect(pintar({ abierto: true, estadoNativo: m.estadoAvisosNavegador() })).not.toContain('Activar avisos del navegador');
    centro.detener();
  });
});
