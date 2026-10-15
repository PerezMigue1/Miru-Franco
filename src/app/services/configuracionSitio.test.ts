import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  CONFIGURACION_POR_OMISION,
  domicilioCompleto,
  enlaceTelefono,
  enlaceWhatsApp,
  frasesHorario,
  normalizarConfiguracion,
  obtenerConfiguracionPublica,
} from './configuracionSitio';
import { HORARIO_SALON, TELEFONO_SALON } from '../utils/contactoSalon';
import { PROVEEDOR } from '../(screens)/(privada)/cliente/tienda-online/checkout/infoComercio';
import { RESPONSABLE_DATOS } from '../components/privacidad/responsable';

/**
 * Configuración del sitio en la web: una sola fuente para el contacto, el horario y los textos públicos. Sin el API
 * se usan los valores de hoy (los mismos de los documentos legales), así nada cambia si el backend no responde.
 */
afterEach(() => vi.unstubAllGlobals());

describe('Valores por omisión: los mismos que hoy publica el sitio y los documentos legales', () => {
  it('nombre, responsable, domicilio y correo de privacidad coinciden con los Términos (PROVEEDOR) y el Aviso', () => {
    const s = CONFIGURACION_POR_OMISION.salon;
    expect(s.nombre).toBe(PROVEEDOR.nombreComercial);
    expect(s.responsable).toBe(PROVEEDOR.responsable);
    expect(domicilioCompleto(s)).toBe(PROVEEDOR.domicilio);
    expect(s.correoPrivacidad).toBe(PROVEEDOR.correo);
    expect(RESPONSABLE_DATOS.contacto).toContain('771 186 7645');
    expect(s.whatsapp).toContain('771 186 7645');
    expect(s.telefono).toBe(TELEFONO_SALON!.visible);
  });

  it('el horario por omisión se lee igual que el de hoy', () => {
    expect(frasesHorario(CONFIGURACION_POR_OMISION.horario.dias)).toEqual(HORARIO_SALON.frases);
  });
});

describe('Frases del horario', () => {
  const dias = (cambios: Record<string, { cerrado?: boolean; abre?: string; cierra?: string }>) =>
    CONFIGURACION_POR_OMISION.horario.dias.map((d) => ({ ...d, ...(cambios[d.dia] ?? {}) }));

  it('agrupa los días seguidos con el mismo horario y quita el cero de la hora', () => {
    expect(frasesHorario(dias({ miercoles: { cerrado: true, abre: '', cierra: '' } }))).toEqual([
      'Lunes y martes de 9:30 a 19:30 h.',
      'Miércoles cerrado.',
      'Jueves y viernes de 9:30 a 19:30 h.',
      'Sábados de 9:30 a 19:00 h.',
      'Domingos cerrado.',
    ]);
  });

  it('un domingo abierto se lee como los demás', () => {
    expect(frasesHorario(dias({ domingo: { cerrado: false, abre: '10:00', cierra: '14:00' } })).at(-1)).toBe('Domingos de 10:00 a 14:00 h.');
  });
});

describe('Enlaces de contacto', () => {
  it('teléfono y WhatsApp con solo dígitos y lada', () => {
    expect(enlaceTelefono('+52 771 268 1432')).toBe('tel:+527712681432');
    expect(enlaceWhatsApp('+52 771 186 7645')).toBe('https://wa.me/527711867645');
    expect(enlaceWhatsApp('771 186 7645')).toBe('https://wa.me/527711867645');
    expect(enlaceWhatsApp('')).toBeNull();
  });
});

describe('Lectura desde el API', () => {
  it('lo que falta o no es válido se completa con los valores por omisión', () => {
    const c = normalizarConfiguracion({ salon: { nombre: 'Otro Nombre', telefono: 5 }, horario: { dias: 'no' }, anticiposActivos: true });
    expect(c.salon.nombre).toBe('Otro Nombre');
    expect(c.salon.telefono).toBe(CONFIGURACION_POR_OMISION.salon.telefono);
    expect(c.horario.dias).toEqual(CONFIGURACION_POR_OMISION.horario.dias);
    expect(c.anticiposActivos).toBe(true);
  });

  it('una lista que la dueña dejó vacía a propósito (los valores de "Sobre nosotros") se respeta; una que no es lista se completa', () => {
    const vacia = normalizarConfiguracion({ contenido: { sobreNosotros: { valores: [] } } });
    expect(vacia.contenido.sobreNosotros.valores).toEqual([]);
    const mala = normalizarConfiguracion({ contenido: { sobreNosotros: { valores: 'no' } } });
    expect(mala.contenido.sobreNosotros.valores).toEqual(CONFIGURACION_POR_OMISION.contenido.sobreNosotros.valores);
  });

  it('pide GET /api/configuracion-publica con revalidación de 60 s (el cambio se ve sin deploy)', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ salon: { nombre: 'Nombre del API' }, anticiposActivos: false })));
    vi.stubGlobal('fetch', fetchMock);
    const c = await obtenerConfiguracionPublica();
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/configuracion-publica');
    expect((fetchMock.mock.calls[0] as unknown as [string, { next?: { revalidate?: number } }])[1].next?.revalidate).toBe(60);
    expect(c.salon.nombre).toBe('Nombre del API');
  });

  it('si el API falla, devuelve los valores por omisión (sin anticipos prometidos)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red'); }));
    const c = await obtenerConfiguracionPublica();
    expect(c.salon.nombre).toBe(CONFIGURACION_POR_OMISION.salon.nombre);
    expect(c.anticiposActivos).toBe(false);
  });
});

describe('Admin > Configuración del sitio: lecturas que muestran el 403 en la pantalla', () => {
  it('configuración, permisos e historial piden skip403Redirect (sin ir a /403)', async () => {
    const { apiClient } = await import('./client');
    const servicio = await import('./configuracionSitio');
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] } as never);
    await servicio.obtenerConfiguracionAdminEnPantalla();
    await servicio.obtenerPermisosPorRolEnPantalla();
    const historial = await servicio.obtenerHistorialEnPantalla('permisos:estilista');
    expect(get.mock.calls).toEqual([
      ['/api/configuracion-sitio', { customBase: 'http://api.test', skip403Redirect: true }],
      ['/api/configuracion-sitio/permisos', { customBase: 'http://api.test', skip403Redirect: true }],
      ['/api/configuracion-sitio/historial?clave=permisos%3Aestilista', { customBase: 'http://api.test', skip403Redirect: true }],
    ]);
    expect(historial).toEqual([]);
    get.mockRestore();
  });
});
