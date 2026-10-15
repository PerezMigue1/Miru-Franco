import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>(),
  post: vi.fn<(ruta: string, body: unknown, opciones?: unknown) => Promise<unknown>>(async () => ({ success: true, data: [] })),
}));
vi.mock('../../services/client', () => ({ apiClient: { get, post } }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));
const { logout, clearAuthData } = vi.hoisted(() => ({
  logout: vi.fn(async () => ({ success: true })),
  clearAuthData: vi.fn(),
}));
vi.mock('../../services/auth', () => ({ api: { logout } }));
vi.mock('../../utils/security', () => ({ clearAuthData, hasSession: () => true }));
vi.mock('next/navigation', () => ({ usePathname: () => '/home', useRouter: () => ({ replace: () => undefined, push: () => undefined }) }));

const {
  FORMULARIO_REACEPTACION,
  RECHAZO_INICIAL,
  cerrarSesionPorRechazo,
  consultarPendientes,
  cuentaEnSesion,
  documentoDelPendiente,
  erroresReaceptacion,
  esRutaDeDocumentoLegal,
  itemsReaceptacion,
  pedirCancelacionPorRechazo,
  registrarReaceptacion,
  solicitarCancelacionCuenta,
  textoCancelacionAbierta,
} = await import('./reaceptacion');
const { DialogoReaceptacion } = await import('./ReaceptacionDocumentos');
const { MENSAJE_CASILLA_CANCELACION, QUE_PASA_AL_CANCELAR } = await import('../privacidad/accionesPrivacidad');

const PENDIENTES = [
  { tipo: 'terminos' as const, documentoSlug: 'terminos' as const, version: '2.0', hash: 'a'.repeat(64), vigenteDesde: '2026-10-14', versionAceptada: '1.0' },
  { tipo: 'aviso_privacidad' as const, documentoSlug: 'aviso-privacidad' as const, version: '2.0', hash: 'b'.repeat(64), vigenteDesde: '2026-10-14', versionAceptada: null },
];

afterEach(() => {
  get.mockReset();
  post.mockClear();
  logout.mockClear();
  clearAuthData.mockClear();
  vi.restoreAllMocks();
});

describe('Re-aceptación de documentos (lógica)', () => {
  it('cada pendiente se acepta con la versión y el hash que dio el backend', () => {
    expect(itemsReaceptacion(PENDIENTES)).toEqual([
      { tipo: 'terminos', documentoSlug: 'terminos', version: '2.0', hash: 'a'.repeat(64), accion: 'aceptado' },
      { tipo: 'aviso_privacidad', documentoSlug: 'aviso-privacidad', version: '2.0', hash: 'b'.repeat(64), accion: 'aceptado' },
    ]);
  });

  it('registra con formulario "reaceptacion" y la ruta actual', async () => {
    await registrarReaceptacion(PENDIENTES, '/cliente/tienda-online');
    expect(FORMULARIO_REACEPTACION).toBe('reaceptacion');
    expect(post).toHaveBeenCalledWith(
      '/api/consentimientos',
      { items: itemsReaceptacion(PENDIENTES), formulario: 'reaceptacion', rutaOrigen: '/cliente/tienda-online' },
      expect.anything(),
    );
  });

  it('la ruta de origen no pasa de 300 caracteres (límite del backend)', async () => {
    await registrarReaceptacion(PENDIENTES, `/${'x'.repeat(400)}`);
    const cuerpo = post.mock.calls[0][1] as { rutaOrigen: string };
    expect(cuerpo.rutaOrigen).toHaveLength(300);
  });

  it('si la consulta de pendientes falla no bloquea el sitio: devuelve vacío', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    get.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(consultarPendientes()).resolves.toEqual([]);
  });

  it('lee los pendientes del backend', async () => {
    get.mockResolvedValueOnce({ success: true, data: PENDIENTES });
    await expect(consultarPendientes()).resolves.toEqual(PENDIENTES);
    expect(get.mock.calls[0][0]).toBe('/api/consentimientos/pendientes');
  });

  it('cada casilla sin marcar tiene su mensaje; todas marcadas, ninguno', () => {
    expect(Object.keys(erroresReaceptacion(PENDIENTES, { terminos: true }))).toEqual(['aviso-privacidad']);
    expect(erroresReaceptacion(PENDIENTES, { terminos: true, 'aviso-privacidad': true })).toEqual({});
  });

  it('"No acepto": la cancelación se pide como solicitud ARCO de tipo cancelacion', async () => {
    await solicitarCancelacionCuenta(PENDIENTES);
    const [ruta, cuerpo] = post.mock.calls[0];
    expect(ruta).toBe('/api/arco/solicitudes');
    expect(cuerpo).toMatchObject({ tipo: 'cancelacion' });
    expect((cuerpo as { descripcion: string }).descripcion.length).toBeLessThanOrEqual(2000);
  });

  it('no se pinta sobre los documentos que pide aceptar (sus rutas, sin el ancla) y sí en cualquier otra ruta', () => {
    for (const ruta of ['/terminos-y-condiciones', '/aviso-de-privacidad', '/politica-de-cookies', '/politica-de-reembolsos', '/aviso-de-privacidad/']) {
      expect(esRutaDeDocumentoLegal(ruta)).toBe(true);
    }
    for (const ruta of ['/home', '/', '/perfil', '/terminos-y-condiciones-viejos', null, undefined]) {
      expect(esRutaDeDocumentoLegal(ruta)).toBe(false);
    }
  });

  it('la cuenta consultada es la de la sesión: sin sesión null, con sesión su id (o una marca si no se puede leer)', () => {
    expect(cuentaEnSesion(false, JSON.stringify({ id: 'u-1' }))).toBeNull();
    expect(cuentaEnSesion(true, JSON.stringify({ id: 'u-1' }))).toBe('u-1');
    expect(cuentaEnSesion(true, JSON.stringify({ id: 'u-2' }))).toBe('u-2');
    expect(cuentaEnSesion(true, null)).toBe('sesion');
    expect(cuentaEnSesion(true, '{no es json')).toBe('sesion');
  });

  it('un documento que la web no conoce no rompe nada: usa el slug como título y no lleva enlace', () => {
    expect(documentoDelPendiente('terminos')).toEqual({ titulo: 'Términos y Condiciones', ruta: '/terminos-y-condiciones' });
    expect(documentoDelPendiente('politica-de-fotos')).toEqual({ titulo: 'politica-de-fotos', ruta: null });
  });

  it('"No acepto": la cancelación con un documento desconocido no lanza error', async () => {
    const desconocido = { ...PENDIENTES[0], documentoSlug: 'politica-de-fotos' } as unknown as (typeof PENDIENTES)[number];
    await solicitarCancelacionCuenta([desconocido]);
    expect((post.mock.calls[0][1] as { descripcion: string }).descripcion).toContain('politica-de-fotos versión 2.0');
  });

  describe('"Solicitar la cancelación de mi cuenta" desde la re-aceptación', () => {
    const ABIERTA = {
      id: 7,
      folio: 'ARCO-2026-000007',
      tipo: 'cancelacion',
      descripcion: null,
      estado: 'recibida',
      creadaEn: '2026-10-14T16:00:00.000Z',
      venceRespuesta: '2026-11-11T06:00:00.000Z',
      respuesta: null,
      respondidaEn: null,
      venceEfectividad: null,
      atendidaEn: null,
    };

    it('el estado inicial no tiene la casilla "entiendo" marcada', () => {
      expect(RECHAZO_INICIAL).toEqual({ entendido: false, errorCasilla: null, abierta: null });
    });

    it('sin marcar "entiendo" no consulta ni envía nada', async () => {
      expect(await pedirCancelacionPorRechazo(PENDIENTES, false)).toEqual({ estado: 'falta_casilla', mensaje: MENSAJE_CASILLA_CANCELACION });
      expect(get).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    });

    it('si ya hay una cancelación abierta no abre otra: devuelve la que hay (para mostrar su folio)', async () => {
      get.mockResolvedValueOnce({ success: true, data: [{ ...ABIERTA, tipo: 'rectificacion', folio: 'ARCO-2026-000001' }, ABIERTA] });
      expect(await pedirCancelacionPorRechazo(PENDIENTES, true)).toEqual({ estado: 'ya_abierta', solicitud: ABIERTA });
      expect(get.mock.calls[0][0]).toBe('/api/arco/mias');
      expect(post).not.toHaveBeenCalled();
    });

    it('una cancelación ya atendida o rechazada no cuenta como abierta: envía la nueva', async () => {
      get.mockResolvedValueOnce({ success: true, data: [{ ...ABIERTA, estado: 'rechazada' }] });
      post.mockResolvedValueOnce({ success: true, data: { ...ABIERTA, folio: 'ARCO-2026-000009' } });
      expect(await pedirCancelacionPorRechazo(PENDIENTES, true)).toMatchObject({ estado: 'enviada', solicitud: { folio: 'ARCO-2026-000009' } });
      expect(post.mock.calls[0][0]).toBe('/api/arco/solicitudes');
      expect(post.mock.calls[0][1]).toMatchObject({ tipo: 'cancelacion' });
    });

    it('si no se pueden leer sus solicitudes, igual envía (el backend rechaza el duplicado con 409)', async () => {
      get.mockRejectedValueOnce(new Error('Sin conexión'));
      post.mockResolvedValueOnce({ success: true, data: ABIERTA });
      expect(await pedirCancelacionPorRechazo(PENDIENTES, true)).toMatchObject({ estado: 'enviada' });
    });

    it('409 del backend: muestra su mensaje tal cual', async () => {
      get.mockResolvedValueOnce({ success: true, data: [] });
      post.mockRejectedValueOnce(Object.assign(new Error('Ya tienes una solicitud de cancelación abierta (ARCO-2026-000007).'), { status: 409 }));
      expect(await pedirCancelacionPorRechazo(PENDIENTES, true)).toEqual({
        estado: 'error',
        mensaje: 'Ya tienes una solicitud de cancelación abierta (ARCO-2026-000007).',
      });
    });

    it('otro error: explica que puede intentar de nuevo o solo cerrar sesión', async () => {
      get.mockResolvedValueOnce({ success: true, data: [] });
      post.mockRejectedValueOnce(new Error('Sin conexión'));
      const r = await pedirCancelacionPorRechazo(PENDIENTES, true);
      expect(r).toEqual({ estado: 'error', mensaje: expect.stringMatching(/^No pudimos enviar tu solicitud de cancelación \(Sin conexión\)\. Intenta de nuevo o solo cierra sesión\.$/) });
    });

    it('el aviso de la cancelación abierta da su folio y la fecha límite de respuesta', () => {
      expect(textoCancelacionAbierta(ABIERTA as never)).toBe(
        'Ya enviaste tu solicitud de cancelación ARCO-2026-000007. Te responderemos a más tardar el 11/11/2026.',
      );
    });
  });

  it('"No acepto": cierra la sesión con el logout existente y limpia la sesión local', async () => {
    const almacen = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => almacen.get(k) ?? null,
      setItem: (k: string, v: string) => void almacen.set(k, v),
      removeItem: (k: string) => void almacen.delete(k),
    });
    await cerrarSesionPorRechazo();
    expect(logout).toHaveBeenCalledWith(false);
    expect(clearAuthData).toHaveBeenCalled();
    expect(almacen.has('manualLogout')).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('Diálogo de re-aceptación', () => {
  const render = (
    paso: 'aceptar' | 'rechazo',
    errores = {},
    rechazo: typeof RECHAZO_INICIAL = RECHAZO_INICIAL,
    pendientes: typeof PENDIENTES = PENDIENTES,
  ) =>
    renderToStaticMarkup(
      createElement(DialogoReaceptacion, {
        pendientes,
        paso,
        marcadas: {},
        errores,
        rechazo,
        enviando: false,
        error: null,
        onMarcar: () => undefined,
        onEntendido: () => undefined,
        onAceptar: () => undefined,
        onNoAcepto: () => undefined,
        onVolver: () => undefined,
        onCancelarCuenta: () => undefined,
        onCerrarSesion: () => undefined,
      }),
    );
  const sinEtiquetas = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

  it('un slug que la web no conoce no tira el diálogo ni arma un artículo equivocado', () => {
    const desconocido = { ...PENDIENTES[0], documentoSlug: 'politica-de-fotos' } as unknown as (typeof PENDIENTES)[number];
    const html = render('aceptar', {}, RECHAZO_INICIAL, [desconocido, PENDIENTES[1]]);
    const texto = sinEtiquetas(html);
    expect(texto).toContain('Acepto el documento politica-de-fotos, versión 2.0');
    expect(texto).toContain('Acepto el documento Aviso de Privacidad (se abre en otra pestaña), versión 2.0');
    expect(texto).not.toMatch(/\bel Política|\blos Aviso|\bel Términos/);
  });

  it('"No acepto" explica qué pasa al cancelar y pide la misma casilla real "entiendo" que el perfil, sin marcar', () => {
    const html = render('rechazo');
    expect(sinEtiquetas(html)).toContain(QUE_PASA_AL_CANCELAR);
    const casilla = html.match(/<input[^>]*id="reaceptacion-entiendo"[^>]*>/)?.[0] ?? '';
    expect(casilla).toContain('type="checkbox"');
    expect(casilla).not.toMatch(/\bchecked\b/);
    expect(html).toMatch(/<label for="reaceptacion-entiendo">/);
    expect(sinEtiquetas(html)).toContain('Entiendo que mis datos personales se borrarán o anonimizarán');
  });

  it('el error de la casilla "entiendo" va junto a ella, ligado con aria-describedby', () => {
    const html = render('rechazo', {}, { ...RECHAZO_INICIAL, errorCasilla: MENSAJE_CASILLA_CANCELACION });
    expect(html).toContain('aria-describedby="reaceptacion-entiendo-error"');
    expect(html).toContain(`id="reaceptacion-entiendo-error" role="alert"`);
  });

  it('"Antes de salir": Volver es la acción rellena; la cancelación va de contorno y, en móvil, abajo de todo', () => {
    const html = render('rechazo');
    const botones = [...html.matchAll(/<button[^>]*style="([^"]*)"[^>]*>([^<]*)<\/button>/g)].map(([, estilo, texto]) => ({ estilo, texto }));
    // En el DOM: cancelación, cerrar sesión, volver. Con flex-col-reverse (móvil) Volver queda arriba y la cancelación abajo.
    expect(botones.map((b) => b.texto)).toEqual(['Solicitar la cancelación de mi cuenta', 'Cerrar sesión', 'Volver']);
    expect(html).toMatch(/class="flex flex-col-reverse sm:flex-row/);
    const [cancelar, cerrar, volver] = botones;
    expect(volver.estilo).toContain('--btn-bg:var(--botones-principales)');
    expect(cancelar.estilo).toContain('--btn-bg:transparent');
    expect(cancelar.estilo).toContain('--btn-borde:1.5px solid var(--danger-texto)');
    expect(cerrar.estilo).toContain('--btn-bg:transparent');
    expect(botones.filter((b) => !b.estilo.includes('--btn-bg:transparent'))).toHaveLength(1);
  });

  it('con una cancelación abierta muestra su folio y ya no ofrece pedir otra', () => {
    const abierta = { id: 7, folio: 'ARCO-2026-000007', tipo: 'cancelacion', estado: 'recibida', venceRespuesta: '2026-11-11T06:00:00.000Z' };
    const html = render('rechazo', {}, { ...RECHAZO_INICIAL, abierta: abierta as never });
    expect(html).toContain('ARCO-2026-000007');
    expect(html).not.toContain('Solicitar la cancelación de mi cuenta');
    expect(html).not.toContain('id="reaceptacion-entiendo"');
    expect(html).toContain('Cerrar sesión');
  });

  it('es un diálogo modal sin botón de cerrar', () => {
    const html = render('aceptar');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).not.toContain('aria-label="Cerrar"');
  });

  it('una casilla por documento pendiente, sin marcar, con enlace a cada uno y su versión', () => {
    const html = render('aceptar');
    const casillas = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
    expect(casillas).toHaveLength(2);
    for (const c of casillas) expect(c).not.toMatch(/\bchecked\b/);
    expect(html).toContain('href="/terminos-y-condiciones"');
    expect(html).toContain('href="/aviso-de-privacidad"');
    expect(html).toContain('versión 2.0');
    expect(html).toContain('Aceptar y continuar');
    expect(html).toContain('No acepto');
  });

  it('el error de una casilla sin marcar aparece junto a ella con role="alert"', () => {
    const html = render('aceptar', { terminos: 'Marca la casilla para aceptar este documento.' });
    expect(html).toContain('role="alert"');
  });

  it('"No acepto" explica que sin aceptar no puede usar su cuenta y ofrece la cancelación', () => {
    const html = render('rechazo');
    expect(html).toContain('Sin aceptar no puedes seguir usando tu cuenta');
    expect(html).toContain('Solicitar la cancelación de mi cuenta');
    expect(html).toContain('Cerrar sesión');
  });

  it('el componente consulta solo con sesión iniciada, una vez por carga, y no se cierra con Escape', () => {
    const fuente = readFileSync(join(__dirname, 'ReaceptacionDocumentos.tsx'), 'utf8');
    expect(fuente).toContain('hasSession()');
    expect(fuente).toContain('consultarPendientes()');
    expect(fuente).toMatch(/consultadoRef\.current/);
    expect(fuente).not.toMatch(/key === 'Escape'[^\n]*(cerrar|onClose)/);
  });

  it('el layout raíz lo monta en todo el sitio', () => {
    const layout = readFileSync(join(__dirname, '..', '..', 'layout.tsx'), 'utf8');
    expect(layout).toContain('<ReaceptacionDocumentos />');
  });
});
