import { afterEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, opts?: unknown) => Promise<unknown>>(async () => ({})),
}));
vi.mock('../../../../../../services/client', () => ({ apiClient: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  consultarPoliticaCancelacionAnticipo,
  puedeConfirmarCancelacion,
  textoAnticipoAlCancelar,
  toastCitaCancelada,
} from './avisoAnticipo';

afterEach(() => get.mockClear());

/**
 * Qué pasa con el anticipo si la clienta cancela (política de anticipos compatible con el art. 56): la regla la
 * calcula el backend (GET /pagos-en-linea/citas/:id/estado, campo `cancelacion`) y la pantalla la explica.
 */
const LIMITE = '2026-10-21T05:59:59.999Z'; // martes 20 de octubre de 2026, 23:59:59.999 en México
const ANTES = new Date('2026-10-19T12:00:00-06:00');
const DESPUES = new Date('2026-10-21T00:00:00-06:00');

describe('Texto del anticipo en la pantalla de cancelar', () => {
  it('reembolsable: se le devuelve completo, hasta cuándo y por qué', () => {
    const t = textoAnticipoAlCancelar(150, { reembolsable: true, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 }, ANTES);
    expect(t).toBe(
      'Si cancelas ahora, te devolvemos completo tu anticipo de $150 por el mismo medio con el que lo pagaste: tu cita está a más de 10 días hábiles de tu pago y cancelas dentro de los 5 días hábiles siguientes. Tienes hasta el martes, 20 de octubre de 2026.',
    );
  });

  it('pasado el plazo de 5 días hábiles: no se devuelve, cuándo terminó y que puede reprogramar', () => {
    const t = textoAnticipoAlCancelar(150, { reembolsable: false, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 }, DESPUES);
    expect(t).toBe(
      'Tu anticipo de $150 ya no se devuelve si cancelas: el plazo para cancelar con reembolso terminó el martes, 20 de octubre de 2026. Si reprogramas tu cita con aviso, tu anticipo se respeta para la nueva fecha.',
    );
  });

  it('si el reloj ya pasó la fecha límite aunque el dato diga reembolsable (página abierta desde antes): ya no se devuelve', () => {
    const t = textoAnticipoAlCancelar(150, { reembolsable: true, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 }, DESPUES);
    expect(t.startsWith('Tu anticipo de $150 ya no se devuelve si cancelas')).toBe(true);
  });

  it('a 10 días hábiles o menos del pago: no se devuelve y puede reprogramar', () => {
    const t = textoAnticipoAlCancelar(150, { reembolsable: false, reembolsableHasta: null, diasHabilesHastaCita: 6 }, ANTES);
    expect(t).toBe(
      'Tu anticipo de $150 no se devuelve si cancelas, porque tu cita está a 10 días hábiles o menos de la fecha en que lo pagaste. Si reprogramas tu cita con aviso, tu anticipo se respeta para la nueva fecha.',
    );
  });

  it('sin el dato del backend: explica la regla completa sin prometer nada', () => {
    const t = textoAnticipoAlCancelar(150, null, ANTES);
    expect(t).toBe(
      'Si tu cita está a más de 10 días hábiles de la fecha en que pagaste tu anticipo de $150 y cancelas dentro de los 5 días hábiles siguientes a tu pago, te lo devolvemos completo; en otro caso no se devuelve. Si reprogramas tu cita con aviso, tu anticipo se respeta para la nueva fecha.',
    );
  });
});

describe('Aviso al terminar de cancelar', () => {
  it('reembolsable a tiempo: dice que se le devuelve el anticipo', () => {
    expect(toastCitaCancelada({ reembolsable: true, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 }, ANTES)).toBe(
      'Tu cita quedó cancelada. Te devolvemos tu anticipo completo por el mismo medio con el que lo pagaste.',
    );
  });

  it('en cualquier otro caso, el aviso de siempre', () => {
    expect(toastCitaCancelada({ reembolsable: true, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 }, DESPUES)).toBe('Tu cita quedó cancelada.');
    expect(toastCitaCancelada(null, ANTES)).toBe('Tu cita quedó cancelada.');
  });
});

describe('Botón "Sí, Cancelar Cita" mientras carga la política del anticipo', () => {
  it('con el anticipo pagado y la política cargando: desactivado, para que el aviso final sea el correcto', () => {
    expect(puedeConfirmarCancelacion({ anticipoPagado: true, politicaCargando: true, cancelando: false })).toBe(false);
  });

  it('con el anticipo pagado y la política ya respondida (o fallida): activo', () => {
    expect(puedeConfirmarCancelacion({ anticipoPagado: true, politicaCargando: false, cancelando: false })).toBe(true);
  });

  it('sin anticipo pagado no espera la política', () => {
    expect(puedeConfirmarCancelacion({ anticipoPagado: false, politicaCargando: true, cancelando: false })).toBe(true);
  });

  it('mientras se cancela, siempre desactivado', () => {
    expect(puedeConfirmarCancelacion({ anticipoPagado: false, politicaCargando: false, cancelando: true })).toBe(false);
  });

  it('la pantalla usa la regla en el botón final y marca la carga de la política', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toMatch(/disabled=\{!puedeConfirmarCancelacion\(\{ anticipoPagado, politicaCargando: cargandoPolitica, cancelando \}\)\}/);
    expect(pagina).toMatch(/setCargandoPolitica\(true\);\s*void consultarPoliticaCancelacionAnticipo\(c\.id\)/);
    expect(pagina).toMatch(/\.finally\(\(\) => setCargandoPolitica\(false\)\)/);
    expect(pagina).toContain('Revisando tu anticipo…');
  });
});

describe('Dato del backend', () => {
  it('lo lee del estado del anticipo (campo cancelacion)', async () => {
    get.mockResolvedValueOnce({ estado: 'aprobado', cancelacion: { reembolsable: true, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 } });
    const p = await consultarPoliticaCancelacionAnticipo(7);
    expect(get.mock.calls[0][0]).toBe('/api/pagos-en-linea/citas/7/estado');
    expect(p).toEqual({ reembolsable: true, reembolsableHasta: LIMITE, diasHabilesHastaCita: 11 });
  });

  it('sin el campo, o si la consulta falla: null', async () => {
    get.mockResolvedValueOnce({ estado: 'aprobado', cancelacion: null });
    expect(await consultarPoliticaCancelacionAnticipo(7)).toBeNull();
    get.mockRejectedValueOnce(new Error('500'));
    expect(await consultarPoliticaCancelacionAnticipo(7)).toBeNull();
  });
});
