import { describe, expect, it, vi } from 'vitest';
import {
  debeMostrarNativa,
  entregarAviso,
  estadoAvisosNavegador,
  idsNuevas,
  irARuta,
  leerNotificacionEnVivo,
  motivoSinNativa,
  opcionNativaEnMenu,
  ordenarRecientes,
  pedirPermisoAvisos,
  rutaDeNotificacion,
  textoEstadoAvisos,
  tituloConContador,
} from './avisosNotificaciones';
import type { EntornoAvisos } from './avisosNotificaciones';

const notif = { id: 'n-1', titulo: 'Cita agendada', mensaje: 'Tu cita de Corte quedó agendada', urlAccion: '/cliente/servicios-citas/mis-citas/7' };

describe('leerNotificacionEnVivo: el JSON del evento SSE "notificacion"', () => {
  it('lee id, título, mensaje, tipo y la ruta de la notificación', () => {
    const data = JSON.stringify({ id: 'n-1', usuarioId: 'u-1', tipo: 'cita_creada', titulo: 'Cita agendada', mensaje: 'Hola', urlAccion: '/x', leida: false });
    expect(leerNotificacionEnVivo(data)).toEqual({ id: 'n-1', tipo: 'cita_creada', titulo: 'Cita agendada', mensaje: 'Hola', urlAccion: '/x' });
  });

  it('sin id o con JSON roto devuelve null (solo se refresca el contador)', () => {
    expect(leerNotificacionEnVivo('')).toBeNull();
    expect(leerNotificacionEnVivo('{no es json')).toBeNull();
    expect(leerNotificacionEnVivo(JSON.stringify({ titulo: 'x' }))).toBeNull();
  });
});

describe('rutaDeNotificacion: solo rutas internas del sitio', () => {
  it('usa la ruta de la notificación', () => {
    expect(rutaDeNotificacion(notif, '/cliente/notificaciones')).toBe('/cliente/servicios-citas/mis-citas/7');
    expect(rutaDeNotificacion({ ...notif, urlAccion: '/cliente/mi-perfil#privacidad-solicitudes' }, '/r')).toBe('/cliente/mi-perfil#privacidad-solicitudes');
  });

  it('sin ruta, externa o con protocolo, usa la de respaldo', () => {
    for (const urlAccion of [null, undefined, '', 'https://otro.sitio', '//otro.sitio/x', 'javascript:alert(1)', '/\\otro.sitio', '/\t/otro.sitio', '/\n/otro.sitio', '/\r/otro.sitio']) {
      expect(rutaDeNotificacion({ ...notif, urlAccion }, '/cliente/notificaciones')).toBe('/cliente/notificaciones');
    }
  });
});

describe('estado y permiso de los avisos del navegador', () => {
  it('traduce el permiso del navegador', () => {
    expect(estadoAvisosNavegador({ Notification: { permission: 'granted' } as EntornoAvisos['Notification'] })).toBe('activados');
    expect(estadoAvisosNavegador({ Notification: { permission: 'denied' } as EntornoAvisos['Notification'] })).toBe('bloqueados');
    expect(estadoAvisosNavegador({ Notification: { permission: 'default' } as EntornoAvisos['Notification'] })).toBe('sin_pedir');
    expect(estadoAvisosNavegador({})).toBe('no_soportado');
  });

  it('el permiso se pide solo al llamar pedirPermisoAvisos (al hacer clic)', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    const Notification = { permission: 'default', requestPermission } as EntornoAvisos['Notification'];
    expect(estadoAvisosNavegador({ Notification })).toBe('sin_pedir');
    expect(requestPermission).not.toHaveBeenCalled();
    await expect(pedirPermisoAvisos({ Notification })).resolves.toBe('activados');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('bloqueado o sin soporte: no vuelve a pedir', async () => {
    const requestPermission = vi.fn();
    await expect(pedirPermisoAvisos({ Notification: { permission: 'denied', requestPermission } as EntornoAvisos['Notification'] })).resolves.toBe('bloqueados');
    await expect(pedirPermisoAvisos({})).resolves.toBe('no_soportado');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('textos de cada estado; bloqueado dice cómo desbloquear', () => {
    expect(textoEstadoAvisos('sin_pedir').accion).toBe('Activar avisos del navegador');
    expect(textoEstadoAvisos('activados').detalle).toMatch(/activados/i);
    expect(textoEstadoAvisos('bloqueados').detalle).toMatch(/candado/);
    expect(textoEstadoAvisos('bloqueados').detalle).toMatch(/Notificaciones/);
    expect(textoEstadoAvisos('no_soportado').detalle).toMatch(/no permite/);
    for (const e of ['sin_pedir', 'activados', 'bloqueados', 'no_soportado'] as const) {
      expect(JSON.stringify(textoEstadoAvisos(e))).not.toMatch(/\u2014/);
    }
  });
});

describe('entregarAviso: aviso interno siempre y notificación del navegador como extra', () => {
  function deps(visible: boolean, permiso: 'activados' | 'bloqueados' | 'sin_pedir' | 'no_soportado') {
    const nativas: { titulo: string; opciones: NotificationOptions; instancia: { onclick: null | (() => void); close: () => void } }[] = [];
    const d = {
      visible,
      permiso,
      crearNativa: vi.fn((titulo: string, opciones: NotificationOptions) => {
        const instancia = { onclick: null as null | (() => void), close: vi.fn() };
        nativas.push({ titulo, opciones, instancia });
        return instancia;
      }),
      alFallarNativa: vi.fn(),
      enfocar: vi.fn(),
      navegar: vi.fn(),
      mostrarEnPantalla: vi.fn(),
    };
    return { d, nativas };
  }

  it('pestaña en segundo plano y con permiso: aviso interno y además nativa con título, cuerpo y tag', () => {
    const { d, nativas } = deps(false, 'activados');
    expect(entregarAviso(notif, '/cliente/notificaciones', d)).toEqual({ interno: true, nativa: true });
    expect(nativas).toEqual([expect.objectContaining({ titulo: 'Cita agendada', opciones: { body: 'Tu cita de Corte quedó agendada', tag: 'n-1' } })]);
    expect(d.mostrarEnPantalla).toHaveBeenCalledWith(notif, '/cliente/servicios-citas/mis-citas/7');
  });

  it('clic en la nativa: enfoca la ventana, abre la pantalla relacionada y la cierra', () => {
    const { d, nativas } = deps(false, 'activados');
    entregarAviso(notif, '/cliente/notificaciones', d);
    nativas[0].instancia.onclick?.();
    expect(d.enfocar).toHaveBeenCalled();
    expect(d.navegar).toHaveBeenCalledWith('/cliente/servicios-citas/mis-citas/7');
    expect(nativas[0].instancia.close).toHaveBeenCalled();
  });

  it('pestaña visible: solo el aviso interno, nunca la nativa', () => {
    const { d } = deps(true, 'activados');
    expect(entregarAviso(notif, '/cliente/notificaciones', d)).toEqual({ interno: true, nativa: false });
    expect(d.crearNativa).not.toHaveBeenCalled();
    expect(d.mostrarEnPantalla).toHaveBeenCalledWith(notif, '/cliente/servicios-citas/mis-citas/7');
  });

  it('ruta externa: el aviso interno abre la bandeja (rutaDeNotificacion)', () => {
    const { d } = deps(true, 'sin_pedir');
    entregarAviso({ ...notif, urlAccion: 'https://otro.sitio' }, '/cliente/notificaciones', d);
    expect(d.mostrarEnPantalla).toHaveBeenCalledWith(expect.anything(), '/cliente/notificaciones');
  });

  it('en segundo plano sin permiso o sin soporte: no crea la nativa, pero el aviso interno sí aparece', () => {
    for (const permiso of ['bloqueados', 'sin_pedir', 'no_soportado'] as const) {
      const { d } = deps(false, permiso);
      expect(entregarAviso(notif, '/r', d)).toEqual({ interno: true, nativa: false });
      expect(d.crearNativa).not.toHaveBeenCalled();
      expect(d.mostrarEnPantalla).toHaveBeenCalledTimes(1);
    }
  });

  it('si el constructor lanza ("Illegal constructor"): no rompe, lo recuerda y el aviso interno sí aparece', () => {
    const { d } = deps(false, 'activados');
    d.crearNativa.mockImplementation(() => {
      throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
    });
    expect(() => entregarAviso(notif, '/r', d)).not.toThrow();
    expect(entregarAviso(notif, '/r', d)).toEqual({ interno: true, nativa: false });
    expect(d.alFallarNativa).toHaveBeenCalled();
    expect(d.mostrarEnPantalla).toHaveBeenCalled();
  });

  it('debeMostrarNativa: solo con permiso concedido y la pestaña no visible', () => {
    expect(debeMostrarNativa({ visible: false, permiso: 'activados' })).toBe(true);
    expect(debeMostrarNativa({ visible: true, permiso: 'activados' })).toBe(false);
    for (const permiso of ['bloqueados', 'sin_pedir', 'no_soportado'] as const) expect(debeMostrarNativa({ visible: false, permiso })).toBe(false);
  });
});

const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  safariIpad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeEscritorio: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
};
const conPermiso = (permission: NotificationPermission) => ({ permission, requestPermission: vi.fn(async () => 'granted' as NotificationPermission) });

describe('motivoSinNativa: navegadores que no pueden mostrarla sin service worker', () => {
  it('sin window.Notification', () => {
    expect(motivoSinNativa({ userAgent: UA.chromeEscritorio })).toBe('sin_api');
  });

  it('Chrome en Android (el constructor lanza "Illegal constructor") aunque exista Notification', () => {
    expect(motivoSinNativa({ Notification: conPermiso('default'), userAgent: UA.chromeAndroid })).toBe('android');
  });

  it('Safari en iPhone y en iPad (este se anuncia como Mac con pantalla táctil)', () => {
    expect(motivoSinNativa({ Notification: conPermiso('default'), userAgent: UA.safariIphone })).toBe('ios');
    expect(motivoSinNativa({ userAgent: UA.safariIphone })).toBe('sin_api');
    expect(motivoSinNativa({ Notification: conPermiso('default'), userAgent: UA.safariIpad, maxTouchPoints: 5 })).toBe('ios');
  });

  it('el constructor ya falló antes en este navegador: no se vuelve a intentar', () => {
    expect(motivoSinNativa({ Notification: conPermiso('granted'), userAgent: UA.chromeEscritorio, nativaFallo: true })).toBe('fallo_previo');
  });

  it('escritorio (Chrome, Safari en Mac sin pantalla táctil): soportada', () => {
    expect(motivoSinNativa({ Notification: conPermiso('default'), userAgent: UA.chromeEscritorio })).toBeNull();
    expect(motivoSinNativa({ Notification: conPermiso('default'), userAgent: UA.safariMac, maxTouchPoints: 0 })).toBeNull();
  });

  it('sin soporte, el estado es no_soportado aunque el permiso diga granted, y no se pide permiso', async () => {
    const entornos: EntornoAvisos[] = [
      { Notification: conPermiso('granted'), userAgent: UA.chromeAndroid },
      { Notification: conPermiso('default'), userAgent: UA.safariIphone },
      { Notification: conPermiso('granted'), userAgent: UA.chromeEscritorio, nativaFallo: true },
      {},
    ];
    for (const entorno of entornos) {
      expect(estadoAvisosNavegador(entorno)).toBe('no_soportado');
      await expect(pedirPermisoAvisos(entorno)).resolves.toBe('no_soportado');
      expect(entorno.Notification?.requestPermission ?? vi.fn()).not.toHaveBeenCalled();
    }
  });
});

describe('opcionNativaEnMenu: qué ofrece el menú de la campana', () => {
  it('sin pedir: activar; bloqueados: cómo desbloquear en una línea', () => {
    expect(opcionNativaEnMenu('sin_pedir')).toEqual({ tipo: 'activar', texto: 'Activar avisos del navegador' });
    const bloqueados = opcionNativaEnMenu('bloqueados');
    expect(bloqueados?.tipo).toBe('bloqueados');
    expect(bloqueados?.texto).toMatch(/candado/);
    expect(bloqueados?.texto).not.toMatch(/\n/);
    expect(bloqueados?.texto).not.toMatch(/\u2014/);
  });

  it('ya activados o sin soporte (Android, iPhone, sin Notification): no ofrece nada', () => {
    expect(opcionNativaEnMenu('activados')).toBeNull();
    expect(opcionNativaEnMenu('no_soportado')).toBeNull();
  });
});

describe('ordenarRecientes: la lista de la campana', () => {
  it('las más recientes primero; sin fecha al final; no cambia la lista original', () => {
    const lista = [
      { id: 'a', creadoEn: '2026-10-01T10:00:00Z' },
      { id: 'b', creadoEn: '' },
      { id: 'c', creadoEn: '2026-10-03T10:00:00Z' },
      { id: 'd', creadoEn: '2026-10-02T10:00:00Z' },
    ];
    expect(ordenarRecientes(lista).map((n) => n.id)).toEqual(['c', 'd', 'a', 'b']);
    expect(lista[0].id).toBe('a');
  });
});

describe('contador en el título de la pestaña', () => {
  it('antepone (n) y no lo repite', () => {
    expect(tituloConContador('Mis citas | Mirú Franco', 3)).toBe('(3) Mis citas | Mirú Franco');
    expect(tituloConContador('(3) Mis citas | Mirú Franco', 5)).toBe('(5) Mis citas | Mirú Franco');
    expect(tituloConContador('Panel', 120)).toBe('(99+) Panel');
  });

  it('en 0 restaura el título original', () => {
    expect(tituloConContador('(3) Mis citas | Mirú Franco', 0)).toBe('Mis citas | Mirú Franco');
    expect(tituloConContador('(99+) Panel', 0)).toBe('Panel');
    expect(tituloConContador('Panel', 0)).toBe('Panel');
  });
});

describe('idsNuevas: lo que llegó por la consulta de respaldo', () => {
  it('devuelve solo las no leídas que no se conocían', () => {
    const conocidas = new Set(['a', 'b']);
    expect(idsNuevas(conocidas, [{ id: 'a', leida: false }, { id: 'c', leida: false }, { id: 'd', leida: true }]).map((n) => n.id)).toEqual(['c']);
  });
});

describe('irARuta: abrir la pantalla relacionada', () => {
  it('otra pantalla: navega con el router', () => {
    const d = { pathname: '/home', cambiarHash: vi.fn(), push: vi.fn() };
    irARuta('/cliente/mi-perfil#privacidad-solicitudes', d);
    expect(d.push).toHaveBeenCalledWith('/cliente/mi-perfil#privacidad-solicitudes');
    expect(d.cambiarHash).not.toHaveBeenCalled();
  });

  it('misma pantalla con ancla: cambia el hash para que la pantalla reaccione (hashchange)', () => {
    const d = { pathname: '/cliente/mi-perfil', cambiarHash: vi.fn(), push: vi.fn() };
    irARuta('/cliente/mi-perfil#privacidad-solicitudes', d);
    expect(d.cambiarHash).toHaveBeenCalledWith('privacidad-solicitudes');
    expect(d.push).not.toHaveBeenCalled();
  });
});

describe('recordarFalloNativa: el fallo del constructor se recuerda', () => {
  it('después de recordarlo, el navegador queda como sin soporte (también sin localStorage)', async () => {
    vi.resetModules();
    const m = await import('./avisosNotificaciones');
    expect(m.falloNativaRecordado()).toBe(false);
    expect(() => m.recordarFalloNativa()).not.toThrow();
    expect(m.falloNativaRecordado()).toBe(true);
  });
});
