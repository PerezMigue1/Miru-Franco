import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/client', () => ({ apiClient: {} }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  AVISO_REVOCAR_SALUD,
  CONSENTIMIENTOS_REVOCABLES,
  estadoInicialModal,
  FORMULARIO_PRIVACIDAD,
  MENSAJE_CASILLA_CANCELACION,
  QUE_PASA_AL_CANCELAR,
  revocarConsentimiento,
  solicitudAbiertaDe,
  textoPlazoSolicitud,
  validarSolicitud,
} from './accionesPrivacidad';
import { MENSAJE_CONFIRMAR_ANONIMIZAR, QUE_PASA_AL_CANCELAR_PANEL } from '../../(screens)/admin/solicitudes-arco/solicitudesArco';
import type { SolicitudArco } from '../../services/arco';

/**
 * Lo que la cancelación borra y lo que conserva, en las palabras que deben usar la titular (segunda persona) y
 * el panel (tercera persona). Los dos textos tienen que nombrar exactamente esto.
 */
const QUE_NOMBRA_LA_CANCELACION = [
  'datos de identificación y contacto',
  'datos de salud y de',
  'cabello',
  'direcciones',
  'tarjetas guardadas',
  'las notas sobre',
  'en pedidos, cotizaciones, ventas y seguimientos',
  'sesiones y avisos',
  'ya sin',
  'nombre',
  '(pedidos, pagos, facturas y ventas, por 5 años)',
  'citas, quejas y valoraciones',
  'la constancia de',
  'consentimientos y de',
  'solicitud',
];

describe('Cancelación de la cuenta: la titular y el panel dicen lo mismo', () => {
  it('el texto de la titular nombra lo que se borra y lo que se conserva, en segunda persona', () => {
    for (const parte of QUE_NOMBRA_LA_CANCELACION) expect(QUE_PASA_AL_CANCELAR).toContain(parte);
    expect(QUE_PASA_AL_CANCELAR).toMatch(/^Al ejecutar la cancelación borramos o anonimizamos tus datos de identificación y contacto/);
    expect(QUE_PASA_AL_CANCELAR).toContain('Conservamos, ya sin tu nombre, lo que la ley nos obliga a guardar');
  });

  it('el texto del panel nombra lo mismo, en tercera persona, y el aviso de confirmación lo repite', () => {
    for (const parte of QUE_NOMBRA_LA_CANCELACION) expect(QUE_PASA_AL_CANCELAR_PANEL).toContain(parte);
    expect(QUE_PASA_AL_CANCELAR_PANEL).toContain('de la titular');
    expect(QUE_PASA_AL_CANCELAR_PANEL).not.toMatch(/\btus?\b/);
    const confirmacion = MENSAJE_CONFIRMAR_ANONIMIZAR({ id: 7, folio: 'ARCO-2026-000007', usuario: { nombre: 'Ana' } });
    expect(confirmacion).toContain(QUE_PASA_AL_CANCELAR_PANEL);
  });

  it('ninguno promete que se conserva "solo" lo fiscal (también quedan citas, quejas y valoraciones)', () => {
    for (const texto of [QUE_PASA_AL_CANCELAR, QUE_PASA_AL_CANCELAR_PANEL]) {
      expect(texto).not.toMatch(/conserva(mos|n)? solo|solo (los|lo) que/i);
    }
  });

  it('la pantalla de la titular y la bandeja muestran esos textos, no otros escritos a mano', () => {
    const titular = readFileSync(join(__dirname, 'MisDatosPrivacidad.tsx'), 'utf8');
    const bandeja = readFileSync(join(__dirname, '..', '..', '(screens)', 'admin', 'solicitudes-arco', 'page.tsx'), 'utf8');
    // En el bloque "Cancelar tu cuenta" y en el modal de la solicitud
    expect(titular.match(/\{QUE_PASA_AL_CANCELAR\}/g)?.length).toBe(2);
    expect(bandeja).toContain('{QUE_PASA_AL_CANCELAR_PANEL}');
    for (const viejo of [/Conservamos solo los comprobantes/, /Se conservan los comprobantes fiscales por 5 años/, /Se\s+conservan solo los pedidos/]) {
      expect(titular).not.toMatch(viejo);
      expect(bandeja).not.toMatch(viejo);
    }
  });

  it('la bandeja avisa que solo se anonimizan cuentas de clienta sin pedidos, citas ni devoluciones en curso', () => {
    const bandeja = readFileSync(join(__dirname, '..', '..', '(screens)', 'admin', 'solicitudes-arco', 'page.tsx'), 'utf8').replace(/\s+/g, ' ');
    expect(bandeja).toContain('Solo se puede ejecutar en cuentas de clienta sin pedidos, citas ni devoluciones en curso');
  });
});

describe('Revocar consentimientos desde el perfil', () => {
  it('en la lista de revocables quedan datos de salud y fotos del resultado; promociones tiene su propio control', () => {
    expect(CONSENTIMIENTOS_REVOCABLES.map((c) => c.tipo)).toEqual(['datos_salud', 'fotos_resultado']);
  });

  it('revocar fotos del resultado registra una fila revocado con el formulario y la ruta del perfil, sin preguntar', async () => {
    const confirmar = vi.fn(async () => true);
    const registrar = vi.fn(async () => []);
    expect(await revocarConsentimiento('fotos_resultado', { confirmar, registrar })).toBe('revocado');
    expect(confirmar).not.toHaveBeenCalled();
    expect(registrar).toHaveBeenCalledWith({
      items: [{ tipo: 'fotos_resultado', accion: 'revocado' }],
      formulario: FORMULARIO_PRIVACIDAD,
      rutaOrigen: '/perfil',
    });
    expect(FORMULARIO_PRIVACIDAD).toMatch(/^[A-Za-z0-9_-]{1,80}$/);
  });

  it('revocar datos de salud avisa primero que se borrarán las alergias', async () => {
    const confirmar = vi.fn(async () => true);
    const registrar = vi.fn(async () => []);
    await revocarConsentimiento('datos_salud', { confirmar, registrar });
    expect(confirmar).toHaveBeenCalledTimes(1);
    const [mensaje, opciones] = confirmar.mock.calls[0] as unknown as [string, { confirmText: string }];
    expect(mensaje).toBe(AVISO_REVOCAR_SALUD);
    expect(mensaje).toContain('alergias');
    expect(opciones.confirmText).toBe('Sí, revocar y borrar');
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ items: [{ tipo: 'datos_salud', accion: 'revocado' }] }));
  });

  it('si no confirma, no se registra nada', async () => {
    const registrar = vi.fn(async () => []);
    expect(await revocarConsentimiento('datos_salud', { confirmar: async () => false, registrar })).toBe('cancelado');
    expect(registrar).not.toHaveBeenCalled();
  });
});

describe('Solicitudes ARCO desde el perfil', () => {
  it('la cancelación exige marcar la casilla de que entiende lo que pasa', () => {
    expect(validarSolicitud('cancelacion', { descripcion: '', entendido: false })).toBe(MENSAJE_CASILLA_CANCELACION);
    expect(validarSolicitud('cancelacion', { descripcion: '', entendido: true })).toBeNull();
  });

  it('la rectificación exige decir qué dato está mal', () => {
    expect(validarSolicitud('rectificacion', { descripcion: '  ', entendido: false })).toBe(
      'Cuéntanos qué dato está mal y cuál es el correcto.',
    );
    expect(validarSolicitud('rectificacion', { descripcion: 'Mi apellido es Pérez', entendido: false })).toBeNull();
    expect(validarSolicitud('rectificacion', { descripcion: 'x'.repeat(2001), entendido: false })).toBe(
      'La descripción admite hasta 2000 caracteres.',
    );
  });

  it('una cancelación ya en curso se reconoce para no duplicarla', () => {
    const base: SolicitudArco = {
      id: 1,
      folio: 'ARCO-2026-000001',
      tipo: 'cancelacion',
      descripcion: null,
      estado: 'recibida',
      creadaEn: '2026-10-01T10:00:00.000Z',
      venceRespuesta: '2026-10-29T10:00:00.000Z',
      respuesta: null,
      respondidaEn: null,
      venceEfectividad: null,
      atendidaEn: null,
    };
    expect(solicitudAbiertaDe([base], 'cancelacion')?.folio).toBe('ARCO-2026-000001');
    expect(solicitudAbiertaDe([{ ...base, estado: 'rechazada' }], 'cancelacion')).toBeUndefined();
    expect(solicitudAbiertaDe([{ ...base, tipo: 'rectificacion' }], 'cancelacion')).toBeUndefined();
  });
});

describe('Lista de solicitudes de la titular: el plazo que corre', () => {
  const base = { venceRespuesta: '2026-11-11T18:00:00.000Z', venceEfectividad: '2026-12-02T18:00:00.000Z' };

  it('abierta: la fecha límite de respuesta, en días hábiles', () => {
    expect(textoPlazoSolicitud({ ...base, estado: 'recibida' })).toBe(
      'Te responderemos a más tardar el 11/11/2026 (20 días hábiles desde que la recibimos)',
    );
    expect(textoPlazoSolicitud({ ...base, estado: 'en_proceso' })).toContain('11/11/2026');
  });

  it('respondida: la fecha de efectividad, no la de respuesta, en días hábiles', () => {
    expect(textoPlazoSolicitud({ ...base, estado: 'respondida' })).toBe(
      'La haremos efectiva a más tardar el 02/12/2026 (15 días hábiles desde nuestra respuesta)',
    );
    expect(textoPlazoSolicitud({ ...base, estado: 'respondida', venceEfectividad: null })).toBeNull();
  });

  it('cerrada: ya no corre plazo', () => {
    expect(textoPlazoSolicitud({ ...base, estado: 'atendida' })).toBeNull();
    expect(textoPlazoSolicitud({ ...base, estado: 'rechazada' })).toBeNull();
  });

  it('la lista muestra el folio y ese texto', () => {
    const fuente = readFileSync(join(__dirname, 'MisDatosPrivacidad.tsx'), 'utf8');
    expect(fuente).toMatch(/<span className="font-semibold tabular-nums"[^>]*>\s*\{s\.folio\}/);
    expect(fuente).toMatch(/const plazo = textoPlazoSolicitud\(s\);/);
    expect(fuente).toContain('{plazo && ` · ${plazo}`}');
  });
});

describe('Modal de solicitud: estado al abrirlo', () => {
  it('la casilla de la cancelación siempre empieza sin marcar, y el formulario vacío y sin errores', () => {
    for (const tipo of ['cancelacion', 'rectificacion'] as const) {
      expect(estadoInicialModal(tipo)).toEqual({
        modal: tipo,
        descripcion: '',
        entendido: false,
        errorDescripcion: null,
        errorCasilla: null,
        errorEnvio: null,
      });
    }
  });

  it('la pantalla lo aplica al abrir y no envía si la validación falla (la web es la única barrera de la casilla)', () => {
    const fuente = readFileSync(join(__dirname, 'MisDatosPrivacidad.tsx'), 'utf8');
    const abrir = fuente.slice(fuente.indexOf('const abrirSolicitud'), fuente.indexOf('const cerrarSolicitud'));
    expect(abrir).toContain('const inicial = estadoInicialModal(tipo);');
    expect(abrir).toContain('setEntendido(inicial.entendido);');
    expect(abrir).not.toMatch(/setEntendido\((?!inicial\.entendido\))/);
    expect(fuente).toMatch(/const invalida = validarSolicitud\(modal, \{ descripcion, entendido \}\);[^]*?if \(invalida\) return;\s*setEnviando\(true\);/);
  });

  it('no ofrece una segunda cancelación mientras hay una abierta', () => {
    const fuente = readFileSync(join(__dirname, 'MisDatosPrivacidad.tsx'), 'utf8');
    expect(fuente).toContain("const cancelacionAbierta = solicitudAbiertaDe(solicitudes, 'cancelacion');");
    expect(fuente).toMatch(/\{cancelacionAbierta \? \(/);
  });
});

describe('Pantalla "Mis datos y privacidad"', () => {
  const fuente = readFileSync(join(__dirname, 'MisDatosPrivacidad.tsx'), 'utf8');
  const perfil = readFileSync(join(__dirname, '..', 'perfil', 'UserProfile.tsx'), 'utf8');
  /** Texto de la fuente entre dos marcas, con los saltos de línea del JSX como un solo espacio. */
  const tramo = (texto: string, desde: string, hasta: string) => {
    const inicio = texto.indexOf(desde);
    expect(inicio).toBeGreaterThanOrEqual(0);
    return texto.slice(inicio, texto.indexOf(hasta, inicio + desde.length)).replace(/\s+/g, ' ');
  };

  it('la descarga no promete que el JSON trae lo mismo que el PDF: el JSON lleva las referencias de pago completas', () => {
    const descarga = tramo(fuente, 'id="privacidad-descarga"', '</Parrafo>');
    expect(descarga).toContain('El PDF es la versión para leer y oculta las referencias de pago completas.');
    expect(descarga).toContain(
      'El JSON trae esos datos con las referencias de pago completas y, de tus tarjetas guardadas, solo la marca, la terminación y el vencimiento.',
    );
    // El backend no manda las tarjetas "tal como las guardamos" (banco, tipo y referencia de Mercado Pago no van).
    expect(descarga).not.toMatch(/tal como l[oa]s guardamos/);
    expect(descarga).not.toMatch(/lo mismo|los mismos datos/);
    expect(descarga).not.toMatch(/(no|ninguno) incluye[^.]*datos completos de pago/i);
  });

  it('promociones tiene un solo control: el bloque "Recibir promociones" con el botón "Desactivar", que hace la oposición', () => {
    const bloque = tramo(fuente, 'id="privacidad-promociones"', '</Bloque>');
    expect(bloque).toContain('titulo="Recibir promociones"');
    expect(bloque).toMatch(/<Button[^>]*onClick=\{oponerse\}[^>]*>\s*\{oponiendo \? 'Aplicando…' : 'Desactivar'\}/);
    expect(fuente).toContain('const solicitud = await oponerseAPromociones();');
    expect(fuente).not.toContain('Oponerme a las promociones');
  });

  it('los nombres que da el Aviso de privacidad ("Recibir promociones" en "Mis datos y privacidad") son los que la persona encuentra en su perfil', () => {
    const aviso = readFileSync(join(__dirname, '..', '..', 'aviso-de-privacidad', 'page.tsx'), 'utf8').replace(/\s+/g, ' ');
    // Admite comillas «» o &quot;; la sección es opcional (versiones anteriores del Aviso solo decían "en tu perfil")
    const comillas = '(?:«|&quot;|")';
    const cierre = '(?:»|&quot;|")';
    const m = aviso.match(new RegExp(`desactiva ${comillas}(.+?)${cierre} en (?:${comillas}(.+?)${cierre} de )?tu perfil`));
    expect(m?.[1]).toBe('Recibir promociones');
    expect(fuente).toContain(`titulo="${m?.[1]}"`);
    if (m?.[2]) expect(perfil).toContain(`title: '${m[2]}'`);
    expect(perfil).toContain("title: 'Mis datos y privacidad'");
  });

  it('la descarga dice con exactitud qué trae: tus datos personales y tu historial con el salón, no "todo"', () => {
    const descarga = tramo(fuente, 'id="privacidad-descarga"', '</Parrafo>');
    expect(descarga).not.toContain('todo lo que guardamos de ti');
    expect(descarga).toContain('Una copia de tus datos personales y de tu historial con el salón:');
    // Las secciones que manda GET /arco/mis-datos (backend-miru src/arco/arco.service.ts misDatos)
    for (const seccion of [
      'perfil',
      'direcciones',
      'pedidos',
      'pagos',
      'devoluciones',
      'citas',
      'seguimientos de tus servicios',
      'compras en el salón',
      'facturas',
      'tarjetas guardadas',
      'cotizaciones',
      'quejas',
      'valoraciones',
      'notas del personal',
      'avisos que te enviamos',
      'preferencias de avisos',
      'consentimientos',
      'solicitudes',
    ]) {
      expect(descarga).toContain(seccion);
    }
  });

  it('los textos que ve cualquier rol no tienen género ("tú misma")', () => {
    expect(fuente).not.toMatch(/tú misma|tú mismo/);
    expect(tramo(fuente, 'id="privacidad-corregir"', '</Parrafo>')).toContain('los puedes cambiar en tu información personal');
  });

  it('el modal de rectificación y cancelación lleva el aviso de privacidad simplificado junto al envío', () => {
    expect(fuente).toContain("import AvisoSimplificado from '../legal/AvisoSimplificado';");
    const modal = fuente.slice(fuente.indexOf('<Modal'), fuente.indexOf('</Modal>'));
    expect(modal).toMatch(/<AvisoSimplificado\s+finalidad=\{\s*modal === 'cancelacion' \? 'atender tu solicitud de cancelación' : 'atender tu solicitud de rectificación'\s*\}/);
  });

  it('si el servidor rechaza la solicitud (por ejemplo, 409 porque ya hay una cancelación abierta), el modal muestra su mensaje', () => {
    expect(fuente).toMatch(/catch \(e\) \{\s*setErrorEnvio\(mensajeDeError\(e, 'No pudimos enviar tu solicitud\. Intenta de nuevo\.'\)\);/);
    expect(fuente).toContain('{errorEnvio && <ErrorEnLinea mensaje={errorEnvio} />}');
  });

  it('tiene los siete bloques: descargar, corregir, oposición, revocar, solicitudes, historial y cancelar', () => {
    for (const titulo of [
      'Descarga tus datos',
      'Corrige tus datos',
      'Recibir promociones',
      'Consentimientos que puedes revocar',
      'Tus solicitudes ARCO',
      'Historial de tus consentimientos',
      'Cancelar tu cuenta',
    ]) {
      expect(fuente).toContain(titulo);
    }
  });

  it('descarga el JSON de GET /arco/mis-datos y el PDF armado con jspdf', () => {
    expect(fuente).toContain('obtenerMisDatos()');
    expect(fuente).toContain('archivoMisDatos(');
    expect(fuente).toContain('crearPdfMisDatos(');
  });

  it('usa el cliente compartido de consentimientos y la oposición inmediata', () => {
    expect(fuente).toContain('revocarConsentimiento(');
    expect(fuente).toContain('registrar: registrarConsentimientos');
    expect(fuente).toContain('confirmar: showConfirm');
    expect(fuente).toContain('oponerseAPromociones()');
    expect(fuente).toContain('misConsentimientos()');
    expect(fuente).toContain('misSolicitudesArco()');
  });

  it('la cancelación explica que se anonimiza y que se guardan los comprobantes fiscales 5 años, con casilla real sin premarcar', () => {
    expect(QUE_PASA_AL_CANCELAR).toMatch(/anonimiza/);
    expect(QUE_PASA_AL_CANCELAR).toContain('5 años');
    expect(fuente).toContain('{QUE_PASA_AL_CANCELAR}');
    // CasillaDocumento (components/legal) es el input checkbox real con label htmlFor y el error con role="alert"
    expect(fuente).toMatch(/<CasillaDocumento\s[^>]*id=\{idCasilla\}/);
    expect(fuente).toMatch(/checked=\{entendido\}/);
    expect(fuente).toContain('error={errorCasilla}');
    expect(fuente).toContain('<EnlaceDocumento');
    expect(fuente).toContain('const [entendido, setEntendido] = useState(false);');
    expect(fuente).not.toMatch(/defaultChecked|checked=\{true\}|setEntendido\(true\)/);
  });

  it('enlaza el aviso de privacidad en pestaña nueva y no usa diálogos nativos', () => {
    expect(fuente).toMatch(/target="_blank"\s+rel="noopener noreferrer"/);
    expect(fuente).not.toMatch(/\b(?:window\.)?(?:alert|confirm|prompt)\(/);
  });

  it('la tarjeta "Mis datos y privacidad" se ve en el perfil de cualquier rol (el filtro de tarjetas no la oculta)', () => {
    const filtro = perfil.slice(perfil.indexOf('const visibleCards'), perfil.indexOf('const sidebarItems'));
    expect(filtro).not.toBe('');
    expect(filtro).not.toContain("'privacidad'");
    expect(perfil).toMatch(/id: 'privacidad',\s*title: 'Mis datos y privacidad',[^}]*section: 'privacidad'/);
  });

  it('el perfil la monta como sección propia sin quitar el cambio de correo', () => {
    expect(perfil).toContain("import MisDatosPrivacidad from '../privacidad/MisDatosPrivacidad'");
    expect(perfil).toContain('<MisDatosPrivacidad');
    expect(perfil).toContain("title: 'Mis datos y privacidad'");
    expect(perfil).toContain('<CambioCorreoModal');
  });
});
