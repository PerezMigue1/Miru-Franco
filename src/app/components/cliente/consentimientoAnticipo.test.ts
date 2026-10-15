import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(),
}));
vi.mock('../../services/client', () => ({ apiClient: { get: vi.fn(), post } }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  conAceptacionDeAnticipos,
  ENLACE_POLITICA_ANTICIPOS,
  MENSAJE_FALTA_ANTICIPOS,
  TEXTO_POLITICA_ANTICIPOS,
} from './consentimientoAnticipo';
import { aceptacionDeDocumento } from '../../services/consentimientos';

afterEach(() => {
  post.mockReset();
});

const casilla = readFileSync(join(__dirname, 'CasillaPoliticaAnticipos.tsx'), 'utf8');
const portal = readFileSync(join(__dirname, 'AnticipoPortal.tsx'), 'utf8');
const encabezado = readFileSync(join(__dirname, 'EncabezadoAnticipo.tsx'), 'utf8');

/** Cuerpo de una función flecha `const nombre = async (...) => { ... };` del código fuente. */
function cuerpoDe(fuente: string, nombre: string): string {
  const inicio = fuente.indexOf(`const ${nombre} = `);
  expect(inicio, `no se encontró ${nombre}`).toBeGreaterThan(-1);
  return fuente.slice(inicio, fuente.indexOf('\n  };', inicio));
}

describe('Política de anticipos: casilla obligatoria antes de pagar o apartar', () => {
  it('la casilla es real, sin marcar por defecto, y enlaza la sección de anticipos en otra pestaña', () => {
    expect(ENLACE_POLITICA_ANTICIPOS).toBe('/politica-de-reembolsos#anticipos');
    expect(casilla).toMatch(/type="checkbox"/);
    expect(casilla).toMatch(/htmlFor=\{/);
    expect(casilla).toContain('Leí la');
    expect(casilla).toContain('Política de anticipos y cancelación');
    expect(casilla).toMatch(/href=\{ENLACE_POLITICA_ANTICIPOS\} target="_blank" rel="noopener noreferrer"/);
    expect(casilla).not.toMatch(/defaultChecked|checked=\{true\}/);
    expect(casilla).toMatch(/role="alert"/);
  });

  it('explica en dos frases cuándo se devuelve el anticipo', () => {
    expect(TEXTO_POLITICA_ANTICIPOS).toMatch(/más de 10 días hábiles/);
    expect(TEXTO_POLITICA_ANTICIPOS).toMatch(/dentro de los 5 días hábiles siguientes a tu pago/);
    expect(TEXTO_POLITICA_ANTICIPOS).toMatch(/anticipo completo/);
    expect(TEXTO_POLITICA_ANTICIPOS).toMatch(/10 días hábiles o menos, al cancelar el anticipo no se devuelve/);
    expect(TEXTO_POLITICA_ANTICIPOS).toMatch(/reagendar con aviso/);
    expect(TEXTO_POLITICA_ANTICIPOS).toMatch(/si el salón cancela, te lo devolvemos/);
    expect(TEXTO_POLITICA_ANTICIPOS.split('. ').length).toBeLessThanOrEqual(2);
    expect(casilla).toContain('{TEXTO_POLITICA_ANTICIPOS}');
  });

  it('cuenta los 10 días hábiles desde el pago del anticipo, como el backend (politicaCancelacionAnticipo usa pagadoEn)', () => {
    expect(TEXTO_POLITICA_ANTICIPOS).toContain(
      'Si al pagar tu anticipo faltan más de 10 días hábiles para tu cita, puedes cancelarla dentro de los 5 días hábiles siguientes a tu pago y te devolvemos el anticipo completo.',
    );
    expect(TEXTO_POLITICA_ANTICIPOS).toContain(
      'Si faltan 10 días hábiles o menos, al cancelar el anticipo no se devuelve, pero puedes reagendar con aviso; si el salón cancela, te lo devolvemos.',
    );
    expect(TEXTO_POLITICA_ANTICIPOS).not.toMatch(/agendaste/);
  });

  it('registra anticipos con su documento (formulario anticipo-cita) antes de la acción', async () => {
    post.mockResolvedValue({ success: true, data: [] });
    const accion = vi.fn(async () => ({ initPoint: 'https://mp.test/pago' }));

    await expect(conAceptacionDeAnticipos('/cliente/servicios-citas/mis-citas/5', accion)).resolves.toEqual({
      initPoint: 'https://mp.test/pago',
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/api/consentimientos');
    expect(post.mock.calls[0][1]).toEqual({
      items: [aceptacionDeDocumento('anticipos')],
      formulario: 'anticipo-cita',
      rutaOrigen: '/cliente/servicios-citas/mis-citas/5',
    });
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(accion.mock.invocationCallOrder[0]);
  });

  it('si el registro falla, no avanza y lo dice', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { status: 400, data: { message: 'Recarga la página y vuelve a intentarlo.' } }));
    const accion = vi.fn(async () => ({ initPoint: 'https://mp.test/pago' }));

    await expect(conAceptacionDeAnticipos('/x', accion)).rejects.toThrow(
      /Política de anticipos y cancelación.*Recarga la página y vuelve a intentarlo\./,
    );
    expect(accion).not.toHaveBeenCalled();
  });
});

describe('Pagar el anticipo (OpcionesAnticipo, en el detalle y en la confirmación de la cita)', () => {
  const opciones = readFileSync(join(__dirname, 'OpcionesAnticipo.tsx'), 'utf8');

  it('muestra la casilla sin marcar antes de los botones de pagar', () => {
    expect(opciones).toContain('const [acepta, setAcepta] = useState(false)');
    const casillaEn = opciones.indexOf('<CasillaPoliticaAnticipos');
    expect(casillaEn).toBeGreaterThan(-1);
    expect(casillaEn).toBeLessThan(opciones.indexOf('onClick={() => void pagarEnLinea()}'));
    expect(casillaEn).toBeLessThan(opciones.indexOf('onClick={() => void pagarEnSalon()}'));
  });

  it('sin la casilla no abre Mercado Pago ni aparta en el salón; con ella registra la aceptación antes', () => {
    const revisar = cuerpoDe(opciones, 'revisarCasilla');
    expect(revisar).toContain('setErrorCasilla(MENSAJE_FALTA_ANTICIPOS)');
    const linea = cuerpoDe(opciones, 'pagarEnLinea');
    expect(linea).toContain('if (!revisarCasilla()) return;');
    expect(linea.indexOf('revisarCasilla()')).toBeLessThan(linea.indexOf('crearPreferenciaAnticipo('));
    expect(linea).toContain('conAceptacionDeAnticipos(rutaOrigen, () => crearPreferenciaAnticipo(cita.id))');
    const salon = cuerpoDe(opciones, 'pagarEnSalon');
    expect(salon).toContain('if (!revisarCasilla()) return;');
    expect(salon).toContain('conAceptacionDeAnticipos(rutaOrigen, () => pagarAnticipoEnSalon(cita.id))');
    expect(MENSAJE_FALTA_ANTICIPOS).toMatch(/Política de anticipos y cancelación/);
  });

  it('la confirmación y el detalle no abren Mercado Pago por su cuenta: todo pasa por OpcionesAnticipo', () => {
    for (const fuente of [encabezado, portal]) {
      expect(fuente).toContain('<OpcionesAnticipo');
      expect(fuente).not.toContain('crearPreferenciaAnticipo(');
    }
    expect(opciones.match(/crearPreferenciaAnticipo\(/g)).toHaveLength(1);
  });

  it('en la lista de citas el botón lleva al detalle, donde está la casilla', () => {
    expect(portal).toContain('const rutaDetalle = `/cliente/servicios-citas/mis-citas/${cita.id}`;');
    expect(portal).toMatch(/<Link href={rutaDetalle}/);
  });
});
