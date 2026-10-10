import { afterEach, describe, expect, it, vi } from 'vitest';

const { get, post, put, patch } = vi.hoisted(() => ({
  get: vi.fn<(ruta: string, base?: unknown) => Promise<unknown>>(async () => ({ data: [] })),
  post: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ initPoint: 'https://mp.test/pagar' })),
  put: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ data: {} })),
  patch: vi.fn<(ruta: string, body: unknown, base?: unknown) => Promise<unknown>>(async () => ({ data: {} })),
}));
vi.mock('../services/client', () => ({ apiClient: { get, post, put, patch, delete: vi.fn() } }));
vi.mock('../services/config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

import { accionesAnticipo, estadoAnticipo, INFO_ANTICIPO, reembolsoSaleDeCaja, tiempoRestante } from './anticipoCita';
import { itemsDeVenta, totalesTicket, validarCobro, type LineaCobro } from './cobroPos';
import { PLAZOS_TERMINOS } from './terminosCondiciones';
import {
  consultarEstadoAnticipo,
  crearPreferenciaAnticipo,
  listarCitas,
  marcarNoAsistio,
  reembolsarAnticipo,
  registrarAnticipo,
  retenerAnticipo,
  type CitaApi,
} from '../services/citas';
import { actualizarAnticipoServicio } from '../services/servicios';

afterEach(() => { get.mockClear(); post.mockClear(); put.mockClear(); patch.mockClear(); });

const AHORA = new Date('2026-10-20T16:00:00.000Z');
const min = (m: number) => new Date(AHORA.getTime() + m * 60_000).toISOString();
const cita = (extra: Partial<CitaApi> = {}): CitaApi => ({
  id: 7, clienteId: 'yo', especialistaId: 'e', servicioId: 5, fechaHoraInicio: min(1440), fechaHoraFin: min(1500), estado: 'pendiente',
  anticipoRequerido: 150, anticipoVenceEn: min(83), anticipoPagadoEn: null, pagosAnticipo: [], anticipoPagado: 0, ...extra,
});

describe('Estado del anticipo de una cita', () => {
  it('sin anticipo, pendiente con plazo, vencido y liberada', () => {
    expect(estadoAnticipo(cita({ anticipoRequerido: null }), AHORA)).toBe('no_requiere');
    expect(estadoAnticipo(cita({ anticipoRequerido: 0 }), AHORA)).toBe('no_requiere');
    expect(estadoAnticipo(cita(), AHORA)).toBe('pendiente');
    expect(estadoAnticipo(cita({ anticipoVenceEn: min(-1) }), AHORA)).toBe('vencido');
    expect(estadoAnticipo(cita({ estado: 'cancelada', motivoCancelacion: 'anticipo_no_pagado' }), AHORA)).toBe('liberada');
  });
  it('pagado, retenido (no asistió), en revisión y reembolsado salen de los pagos', () => {
    const pagado = { anticipoPagadoEn: min(-30), pagosAnticipo: [{ id: 1, estado: 'aprobado', monto: 150, metodo: 'mercado_pago', proveedor: 'mercadopago', pagadoEn: min(-30) }] };
    expect(estadoAnticipo(cita({ ...pagado, estado: 'confirmada' }), AHORA)).toBe('pagado');
    expect(estadoAnticipo(cita({ ...pagado, estado: 'no_asistio' }), AHORA)).toBe('retenido');
    expect(estadoAnticipo(cita({ estado: 'cancelada', pagosAnticipo: [{ ...pagado.pagosAnticipo[0], estado: 'en_revision' }] }), AHORA)).toBe('en_revision');
    expect(estadoAnticipo(cita({ ...pagado, estado: 'cancelada', pagosAnticipo: [{ ...pagado.pagosAnticipo[0], estado: 'reembolsado' }] }), AHORA)).toBe('reembolsado');
  });
  it('cada estado tiene etiqueta y variante de badge', () => {
    expect(INFO_ANTICIPO.pendiente).toEqual({ etiqueta: 'Anticipo pendiente', variante: 'warning' });
    expect(INFO_ANTICIPO.pagado.variante).toBe('success');
  });
  it('cuenta regresiva legible', () => {
    expect(tiempoRestante(min(83), AHORA)).toBe('1 h 23 min');
    expect(tiempoRestante(min(12), AHORA)).toBe('12 min');
    expect(tiempoRestante(new Date(AHORA.getTime() + 20_000).toISOString(), AHORA)).toBe('menos de 1 min');
    expect(tiempoRestante(min(-5), AHORA)).toBe('vencido');
  });
});

describe('Acciones del personal sobre el anticipo', () => {
  const permisos = (claves: string[]) => (c: string | readonly string[] | null | undefined) =>
    !c || claves.includes('*') || (typeof c === 'string' ? claves.includes(c) : c.some((x) => claves.includes(x)));
  const estilista = permisos(['caja:escritura', 'ventas:escritura', 'citas:escritura']);
  const empleado = permisos(['ventas:escritura', 'citas:escritura']);
  const becario = permisos(['citas:asignadas']);

  it('registrar en el salón: caja o ventas, mientras la cita siga vigente y sin pagar', () => {
    expect(accionesAnticipo(cita(), AHORA, estilista).registrar).toBe(true);
    expect(accionesAnticipo(cita({ anticipoVenceEn: min(-5) }), AHORA, empleado).registrar).toBe(true);
    expect(accionesAnticipo(cita(), AHORA, becario).registrar).toBe(false);
    expect(accionesAnticipo(cita({ estado: 'cancelada' }), AHORA, estilista).registrar).toBe(false);
  });
  it('reembolsar y retener: solo caja; reembolsar si la cita se canceló con anticipo pagado o está en revisión', () => {
    const pagadaCancelada = cita({ estado: 'cancelada', anticipoPagadoEn: min(-60), pagosAnticipo: [{ id: 1, estado: 'aprobado', monto: 150, metodo: 'efectivo', proveedor: null, pagadoEn: min(-60) }] });
    expect(accionesAnticipo(pagadaCancelada, AHORA, estilista)).toMatchObject({ reembolsar: true, retener: false });
    expect(accionesAnticipo(pagadaCancelada, AHORA, empleado).reembolsar).toBe(false);
    const enRevision = cita({ estado: 'cancelada', pagosAnticipo: [{ id: 1, estado: 'en_revision', monto: 150, metodo: 'mercado_pago', proveedor: 'mercadopago', pagadoEn: min(-60) }] });
    expect(accionesAnticipo(enRevision, AHORA, estilista)).toMatchObject({ reembolsar: true, retener: true });
  });
  it('no asistió: citas:escritura y cita vigente', () => {
    expect(accionesAnticipo(cita({ estado: 'confirmada' }), AHORA, empleado).noAsistio).toBe(true);
    expect(accionesAnticipo(cita({ estado: 'completada' }), AHORA, empleado).noAsistio).toBe(false);
    expect(accionesAnticipo(cita(), AHORA, becario).noAsistio).toBe(false);
  });
});

describe('POS con anticipo', () => {
  const lineas: LineaCobro[] = [
    { tipo: 'servicio', servicioId: 5, cantidad: 1, precioUnitario: 900, citaId: 40, anticipo: 150 },
    { tipo: 'producto', presentacionId: 2, cantidad: 1, precioUnitario: 100 },
  ];
  it('el saldo descuenta el anticipo; el anticipo no viaja en el payload (lo calcula el backend)', () => {
    expect(totalesTicket(lineas, 0)).toEqual({ subtotal: 1000, descuento: 0, anticipo: 150, total: 850 });
    expect(itemsDeVenta(lineas)[0]).toEqual({ servicioId: 5, cantidad: 1, citaId: 40 });
  });
  it('descuento más anticipo no pasa del subtotal y el mixto suma el saldo', () => {
    expect(validarCobro({ lineas, descuento: 900, motivoDescuento: 'x', metodoPago: 'efectivo', pagos: {} })).toMatch(/anticipo/);
    expect(validarCobro({ lineas, descuento: 0, motivoDescuento: '', metodoPago: 'mixto', pagos: { efectivo: '850' } })).toBeNull();
    expect(validarCobro({ lineas, descuento: 0, motivoDescuento: '', metodoPago: 'mixto', pagos: { efectivo: '1000' } })).toMatch(/total es \$850\.00/);
  });
});

describe('Términos: plazo del anticipo', () => {
  it('2 horas, igual que el backend', () => {
    expect(PLAZOS_TERMINOS.horasAnticipoCita).toBe(2);
  });
});

describe('Servicios de anticipo', () => {
  it('normaliza los campos del anticipo de la cita', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 7, clienteId: 'yo', especialistaId: 'e', servicioId: 5, fechaHoraInicio: min(1), fechaHoraFin: min(60), estado: 'pendiente', anticipoRequerido: '150.00', anticipoVenceEn: min(83), anticipoPagadoEn: null, pagos: [{ id: 1, estado: 'aprobado', monto: '150.00', metodo: 'efectivo', proveedor: null, pagadoEn: min(-1) }, { id: 2, estado: 'reembolsado', monto: '150.00', metodo: 'efectivo', proveedor: null, pagadoEn: min(-1) }] }] });
    const { data } = await listarCitas({ propios: true });
    expect(data[0]).toMatchObject({ anticipoRequerido: 150, anticipoVenceEn: min(83), anticipoPagadoEn: null, anticipoPagado: 150 });
    expect(data[0].pagosAnticipo).toHaveLength(2);
  });
  it('pagar, consultar, registrar, reembolsar, retener, no asistió y configurar usan sus endpoints', async () => {
    await expect(crearPreferenciaAnticipo(7)).resolves.toEqual({ initPoint: 'https://mp.test/pagar' });
    expect(post.mock.calls[0][0]).toBe('/api/pagos-en-linea/citas/7/preferencia');
    get.mockResolvedValueOnce({ estado: 'aprobado', citaEstado: 'confirmada', anticipoRequerido: 150, anticipoVenceEn: min(83), anticipoPagadoEn: min(-1) });
    await expect(consultarEstadoAnticipo(7)).resolves.toMatchObject({ estado: 'aprobado', citaEstado: 'confirmada' });
    expect(get.mock.calls[0][0]).toBe('/api/pagos-en-linea/citas/7/estado');
    await registrarAnticipo(7, 'tarjeta');
    expect(post.mock.calls[1]).toEqual(['/api/citas/7/anticipo', { metodo: 'tarjeta' }, 'http://api.test']);
    await reembolsarAnticipo(7);
    expect(post.mock.calls[2][0]).toBe('/api/citas/7/anticipo/reembolsar');
    await retenerAnticipo(7);
    expect(post.mock.calls[3][0]).toBe('/api/citas/7/anticipo/retener');
    await marcarNoAsistio(7);
    expect(patch.mock.calls[0][0]).toBe('/api/citas/7/no-asistio');
    await actualizarAnticipoServicio(5, 150);
    expect(put.mock.calls[0]).toEqual(['/api/servicios/5/anticipo', { anticipoMonto: 150 }, 'http://api.test']);
  });
});

describe('Revisión: retener, duplicados y prioridad del anticipo pagado', () => {
  const permisos = (claves: string[]) => (c: string | readonly string[] | null | undefined) =>
    !c || claves.includes('*') || (typeof c === 'string' ? claves.includes(c) : c.some((x) => claves.includes(x)));
  const estilista = permisos(['caja:escritura', 'ventas:escritura', 'citas:escritura']);
  const pago = (estado: string, extra: Record<string, unknown> = {}) => ({ id: Math.random(), estado, monto: 150, metodo: 'efectivo', proveedor: null, pagadoEn: min(-60), ...extra });

  it('un anticipo retenido se muestra retenido y ya no se puede reembolsar', () => {
    const c = cita({ estado: 'cancelada', anticipoPagadoEn: min(-60), pagosAnticipo: [pago('aprobado', { retenidoEn: min(-5) })] });
    expect(estadoAnticipo(c, AHORA)).toBe('retenido');
    expect(accionesAnticipo(c, AHORA, estilista)).toMatchObject({ reembolsar: false, retener: false });
  });
  it('un duplicado reembolsado no tapa el anticipo pagado', () => {
    const c = cita({ estado: 'confirmada', anticipoPagadoEn: min(-60), pagosAnticipo: [pago('aprobado'), pago('reembolsado')] });
    expect(estadoAnticipo(c, AHORA)).toBe('pagado');
  });
  it('con un anticipo aprobado, el pago duplicado en revisión solo se reembolsa (no se retiene)', () => {
    const c = cita({ estado: 'cancelada', anticipoPagadoEn: min(-60), pagosAnticipo: [pago('aprobado'), pago('en_revision', { proveedor: 'mercadopago' })] });
    expect(accionesAnticipo(c, AHORA, estilista)).toMatchObject({ reembolsar: true, retener: false });
  });
  it('el pago en revisión de una cita vigente no se retiene', () => {
    const c = cita({ estado: 'pendiente', pagosAnticipo: [pago('en_revision')] });
    expect(accionesAnticipo(c, AHORA, estilista)).toMatchObject({ reembolsar: true, retener: false });
  });
});

describe('Reembolso de un anticipo cobrado en efectivo: sale de la caja de hoy', () => {
  const pago = (extra: Record<string, unknown>) => ({ id: 1, estado: 'aprobado', monto: 150, metodo: 'efectivo', proveedor: null, pagadoEn: AHORA.toISOString(), ...extra });
  const cita = (estado: string, pagos: Record<string, unknown>[]) => ({ estado, pagosAnticipo: pagos } as unknown as CitaApi);

  it('el anticipo en efectivo de una cita cancelada por el salón sale de la caja', () => {
    expect(reembolsoSaleDeCaja(cita('cancelada', [pago({})]))).toBe(true);
  });

  it('con tarjeta, transferencia o Mercado Pago no sale efectivo', () => {
    expect(reembolsoSaleDeCaja(cita('cancelada', [pago({ metodo: 'tarjeta_terminal' })]))).toBe(false);
    expect(reembolsoSaleDeCaja(cita('cancelada', [pago({ metodo: 'mercado_pago', proveedor: 'mercadopago' })]))).toBe(false);
  });

  it('mira el pago que se reembolsa: el más reciente en revisión, o el aprobado sin retener si canceló el salón', () => {
    expect(reembolsoSaleDeCaja(cita('confirmada', [pago({}), pago({ id: 2, estado: 'en_revision', metodo: 'mercado_pago' })]))).toBe(false);
    expect(reembolsoSaleDeCaja(cita('cancelada', [pago({ metodo: 'mercado_pago' }), pago({ id: 2, estado: 'en_revision' })]))).toBe(true);
    expect(reembolsoSaleDeCaja(cita('cancelada', [pago({ retenidoEn: AHORA.toISOString() })]))).toBe(false);
  });
});
