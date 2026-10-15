import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(),
}));
vi.mock('../../../../../services/client', () => ({ apiClient: { get: vi.fn(), post } }));
vi.mock('../../../../../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import {
  anticipoDelServicio,
  crearCitaConConsentimientos,
  destinoTrasCrearCita,
  MENSAJE_SERVICIO_NO_CARGADO,
  servicioSinCargar,
  TEXTO_FOTOS_RESULTADO,
} from './consentimientosCita';
import { aceptacionDeDocumento } from '../../../../../services/consentimientos';

afterEach(() => {
  post.mockReset();
});

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
const RUTA = '/cliente/servicios-citas/crear-cita';

/** Cuerpo de una función flecha `const nombre = async (...) => { ... };` del código fuente. */
function cuerpoDe(fuente: string, nombre: string): string {
  const inicio = fuente.indexOf(`const ${nombre} = `);
  expect(inicio, `no se encontró ${nombre}`).toBeGreaterThan(-1);
  return fuente.slice(inicio, fuente.indexOf('\n  };', inicio));
}

const formularios = () => post.mock.calls.map(([, cuerpo]) => (cuerpo as { formulario: string }).formulario);

describe('Crear cita: los consentimientos se registran antes de crear la cita', () => {
  it('con anticipo y fotos: anticipos (anticipo-cita), luego fotos (crear-cita) y al final la cita', async () => {
    post.mockResolvedValue({ success: true, data: [] });
    const crear = vi.fn(async () => ({ id: 9 }));

    await expect(crearCitaConConsentimientos({ requiereAnticipo: true, autorizaFotos: true }, crear)).resolves.toEqual({ id: 9 });

    expect(post.mock.calls.map(([, cuerpo]) => cuerpo)).toEqual([
      { items: [aceptacionDeDocumento('anticipos')], formulario: 'anticipo-cita', rutaOrigen: RUTA },
      { items: [{ tipo: 'fotos_resultado', accion: 'aceptado' }], formulario: 'crear-cita', rutaOrigen: RUTA },
    ]);
    expect(post.mock.invocationCallOrder[1]).toBeLessThan(crear.mock.invocationCallOrder[0]);
  });

  it('las fotos solo se registran si la clienta marcó la casilla', async () => {
    post.mockResolvedValue({ success: true, data: [] });
    const crear = vi.fn(async () => ({ id: 9 }));

    await crearCitaConConsentimientos({ requiereAnticipo: true, autorizaFotos: false }, crear);
    expect(formularios()).toEqual(['anticipo-cita']);

    post.mockClear();
    await crearCitaConConsentimientos({ requiereAnticipo: false, autorizaFotos: false }, crear);
    expect(post).not.toHaveBeenCalled();

    await crearCitaConConsentimientos({ requiereAnticipo: false, autorizaFotos: true }, crear);
    expect(formularios()).toEqual(['crear-cita']);
    expect(crear).toHaveBeenCalledTimes(3);
  });

  it('si falla el registro del anticipo no se aparta la cita', async () => {
    post.mockRejectedValue(Object.assign(new Error('x'), { status: 429, data: { message: 'Demasiadas peticiones.' } }));
    const crear = vi.fn(async () => ({ id: 9 }));

    await expect(crearCitaConConsentimientos({ requiereAnticipo: true, autorizaFotos: true }, crear)).rejects.toThrow(
      /Política de anticipos y cancelación/,
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(crear).not.toHaveBeenCalled();
  });

  it('si falla el registro de las fotos no se crea la cita y dice cómo seguir', async () => {
    post.mockResolvedValueOnce({ success: true, data: [] }).mockRejectedValueOnce(new Error('Sin conexión'));
    const crear = vi.fn(async () => ({ id: 9 }));

    await expect(crearCitaConConsentimientos({ requiereAnticipo: true, autorizaFotos: true }, crear)).rejects.toThrow(
      /autorización de fotos.*desmarca/,
    );
    expect(crear).not.toHaveBeenCalled();
  });
});

describe('Crear cita: si el servicio no cargó no se sabe si pide anticipo', () => {
  const servicio = { id: 8, nombre: 'Corte', anticipoMonto: 150 };

  it('con servicioId y el servicio sin cargar (null): bloquea el envío', () => {
    expect(servicioSinCargar({ servicioId: '8', servicio: null, cargando: false })).toBe(true);
  });

  it('mientras carga, con el servicio cargado o sin servicioId: no bloquea por esto', () => {
    expect(servicioSinCargar({ servicioId: '8', servicio: null, cargando: true })).toBe(false);
    expect(servicioSinCargar({ servicioId: '8', servicio, cargando: false })).toBe(false);
    expect(servicioSinCargar({ servicioId: null, servicio: null, cargando: false })).toBe(false);
  });

  it('el error dice que la cita no se puede confirmar y cómo seguir', () => {
    expect(MENSAJE_SERVICIO_NO_CARGADO).toBe(
      'No pudimos cargar los datos del servicio, así que todavía no puedes confirmar tu cita. Revisa tu conexión y vuelve a intentarlo.',
    );
  });

  it('la pantalla corta el envío, muestra el error con role alert y un botón para reintentar', () => {
    const enviar = cuerpoDe(pagina, 'manejarEnviar');
    const revision = enviar.indexOf('if (sinServicio) return;');
    expect(revision).toBeGreaterThan(-1);
    expect(revision).toBeLessThan(enviar.indexOf('crearCita('));
    expect(pagina).toMatch(/const sinServicio = servicioSinCargar\(\{ servicioId, servicio, cargando: loadingServicio \}\)/);
    expect(pagina).toMatch(/role="alert"[^>]*>\s*\{MENSAJE_SERVICIO_NO_CARGADO\}/);
    expect(pagina).toMatch(/onClick=\{cargarServicio\}[^>]*>\s*Reintentar/);
    // Los dos botones de enviar quedan desactivados sin el servicio.
    expect(pagina.match(/disabled=\{!!enviando \|\| datosIncompletos \|\| sinServicio\}/g)).toHaveLength(2);
  });
});

describe('Crear cita: anticipoAplica del backend', () => {
  it('con anticipoAplica false no se anuncia anticipo (sin casilla ni Mercado Pago): la cita se crea sin anticipo', () => {
    expect(anticipoDelServicio({ anticipoMonto: 150, anticipoAplica: false })).toBe(0);
  });

  it('con anticipoAplica true se usa el monto del servicio', () => {
    expect(anticipoDelServicio({ anticipoMonto: 150, anticipoAplica: true })).toBe(150);
  });

  it('sin el campo (backend anterior) se conserva el comportamiento de siempre: el monto del servicio', () => {
    expect(anticipoDelServicio({ anticipoMonto: 150 })).toBe(150);
    expect(anticipoDelServicio({ anticipoMonto: null })).toBe(0);
    expect(anticipoDelServicio(null)).toBe(0);
  });

  it('la pantalla toma el anticipo de esa regla', () => {
    expect(pagina).toMatch(/const anticipo = anticipoDelServicio\(servicio\);/);
    expect(pagina).not.toContain('servicio?.anticipoMonto ?? 0');
  });
});

describe('Crear cita: casilla y botones bajo "Detalles de la Cita" (no al fondo de la columna angosta)', () => {
  it('la casilla, los botones y el aviso van en su propia tarjeta de la columna ancha, fuera del resumen', () => {
    const inicioResumen = pagina.indexOf('Resumen de la Cita');
    const inicioConfirmar = pagina.indexOf('id="titulo-confirmar-cita"');
    expect(inicioResumen).toBeGreaterThan(-1);
    expect(inicioConfirmar).toBeGreaterThan(inicioResumen);
    const resumen = pagina.slice(inicioResumen, inicioConfirmar);
    for (const pieza of ['<CasillaPoliticaAnticipos', "modoPago.current = 'linea'", "modoPago.current = 'salon'", '<AvisoSimplificado']) {
      expect(resumen, pieza).not.toContain(pieza);
      expect(pagina.indexOf(pieza), pieza).toBeGreaterThan(inicioConfirmar);
    }
    // En escritorio la tarjeta ocupa las dos columnas anchas, debajo de los detalles; el resumen abarca las dos filas.
    expect(pagina).toMatch(/<section[^>]*aria-labelledby="titulo-confirmar-cita"[^>]*className="[^"]*lg:col-span-2/);
    expect(pagina).toMatch(/lg:row-span-2/);
  });
});

describe('Crear cita: Mercado Pago solo con la casilla de anticipos registrada', () => {
  it('pago en línea, la cita pide anticipo y la casilla se registró: abre Mercado Pago', () => {
    expect(destinoTrasCrearCita({ anticipoRequerido: 150, anticiposRegistrados: true, pagarEnSalon: false })).toBe('mercado_pago');
  });

  it('la cita pide anticipo pero la casilla no se registró (el anticipo cambió o no se conocía): va a la confirmación', () => {
    expect(destinoTrasCrearCita({ anticipoRequerido: 150, anticiposRegistrados: false, pagarEnSalon: false })).toBe('confirmacion');
    expect(destinoTrasCrearCita({ anticipoRequerido: 150, anticiposRegistrados: false, pagarEnSalon: true })).toBe('confirmacion');
  });

  it('pago en el salón o sin anticipo: va a la confirmación', () => {
    expect(destinoTrasCrearCita({ anticipoRequerido: 150, anticiposRegistrados: true, pagarEnSalon: true })).toBe('confirmacion');
    expect(destinoTrasCrearCita({ anticipoRequerido: 0, anticiposRegistrados: false, pagarEnSalon: false })).toBe('confirmacion');
    expect(destinoTrasCrearCita({ anticipoRequerido: undefined, anticiposRegistrados: false, pagarEnSalon: false })).toBe('confirmacion');
  });

  it('la pantalla decide con destinoTrasCrearCita antes de pedir la preferencia de pago', () => {
    const enviar = cuerpoDe(pagina, 'manejarEnviar');
    const decision = enviar.indexOf("destinoTrasCrearCita({");
    expect(decision).toBeGreaterThan(-1);
    expect(decision).toBeLessThan(enviar.indexOf('crearPreferenciaAnticipo('));
    expect(enviar).toMatch(/anticiposRegistrados: requiereAnticipo/);
    expect(enviar).toMatch(/crearCitaConConsentimientos\(\s*\{ requiereAnticipo, autorizaFotos \}/);
    expect(enviar).not.toMatch(/if \(\(cita\.anticipoRequerido \?\? 0\) > 0 && !pagarEnSalon\)/);
  });
});

describe('Crear cita: casillas en la pantalla', () => {
  it('la de anticipos y la de fotos empiezan sin marcar', () => {
    expect(pagina).toMatch(/const \[aceptaAnticipos, setAceptaAnticipos\] = useState\(false\)/);
    expect(pagina).toMatch(/const \[autorizaFotos, setAutorizaFotos\] = useState\(false\)/);
    expect(pagina).not.toMatch(/defaultChecked|checked=\{true\}/);
  });

  it('la de anticipos va antes de los botones de pagar y de apartar, solo si hay anticipo', () => {
    const casillaEn = pagina.indexOf('<CasillaPoliticaAnticipos');
    expect(casillaEn).toBeGreaterThan(-1);
    expect(casillaEn).toBeLessThan(pagina.indexOf("modoPago.current = 'linea'"));
    expect(casillaEn).toBeLessThan(pagina.indexOf("modoPago.current = 'salon'"));
    expect(pagina.slice(pagina.lastIndexOf('{anticipo > 0 && (', casillaEn), casillaEn)).not.toMatch(/\)\}/);
  });

  it('la de fotos es opcional, aparte y con el texto acordado', () => {
    expect(TEXTO_FOTOS_RESULTADO).toBe(
      'Autorizo que el salón tome fotos del resultado de mi servicio para mostrarlas en sus redes y galería (puedes retirar tu autorización cuando quieras desde tu perfil)',
    );
    expect(pagina).toContain('{TEXTO_FOTOS_RESULTADO}');
    expect(pagina).toMatch(/checked=\{autorizaFotos\}/);
    const fotos = pagina.slice(pagina.indexOf('checked={autorizaFotos}') - 400, pagina.indexOf('{TEXTO_FOTOS_RESULTADO}'));
    expect(fotos).toMatch(/type="checkbox"/);
    expect(fotos).toMatch(/htmlFor="casilla-fotos-resultado"/);
    expect(fotos).not.toMatch(/required/);
  });

  it('el formulario no usa la validación nativa, para que salga el aviso propio de la casilla (role alert)', () => {
    // La casilla lleva `required` nativo: sin noValidate el navegador frena el submit con su burbuja genérica
    // y manejarEnviar nunca llega a mostrar MENSAJE_FALTA_ANTICIPOS ni aria-invalid.
    const etiquetasForm = pagina.match(/<form\b[^>]*>/g) ?? [];
    expect(etiquetasForm).toHaveLength(1);
    expect(etiquetasForm[0]).toMatch(/\bnoValidate\b/);
    expect(etiquetasForm[0]).toMatch(/onSubmit=\{manejarEnviar\}/);
  });

  it('sin la casilla de anticipos no se crea la cita; con ella se registran antes de crearla', () => {
    const enviar = cuerpoDe(pagina, 'manejarEnviar');
    const revision = enviar.indexOf('if (anticipo > 0 && !aceptaAnticipos)');
    expect(revision).toBeGreaterThan(-1);
    expect(enviar.slice(revision, enviar.indexOf('return;', revision))).toContain('MENSAJE_FALTA_ANTICIPOS');
    expect(revision).toBeLessThan(enviar.indexOf('crearCita('));
    expect(pagina).toMatch(/const requiereAnticipo = anticipo > 0;/);
    expect(enviar).toMatch(
      /crearCitaConConsentimientos\(\s*\{ requiereAnticipo, autorizaFotos \},\s*\(\) =>\s*crearCita\(/,
    );
  });
});
