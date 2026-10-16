import { describe, expect, it } from 'vitest';
import {
  copiarAlPortapapeles,
  estadoListado,
  etiquetaMetodoPagoVenta,
  etiquetaTipoNotificacion,
  folioVenta,
  MAX_MOTIVO_SOLICITUD,
  MONTO_MAXIMO_COMISION,
  puedeMarcarAtendido,
  resultadoCargaEjecucion,
  resumenCitasPagina,
  resumenVentasCobradas,
  rutaVerTodasLasCitas,
  validarMontoComision,
  validarMotivoCancelacionCita,
  validarSolicitudPermiso,
} from './panelOperacion';
import { fechaCortaEnMexico, fechaYHora24EnMexico } from '../../../../utils/fechaSoloDia';

const conClaves = (claves: string[]) => (clave: string | readonly string[] | undefined | null) =>
  typeof clave === 'string' && (claves.includes('*') || claves.includes(clave));

describe('Hallazgo 1: ventas del día', () => {
  it('total y conteo solo cuentan ventas pagadas (sin canceladas ni pendientes)', () => {
    const ventas = [
      { estado: 'pagada' as const, total: 350.5 },
      { estado: 'cancelada' as const, total: 1200 },
      { estado: 'pagada' as const, total: 0.1 },
      { estado: 'pendiente' as const, total: 80 },
      { estado: 'pagada' as const, total: 0.2 },
    ];
    expect(resumenVentasCobradas(ventas)).toEqual({ cantidad: 3, total: 350.8 });
  });
  it('sin ventas da cero', () => {
    expect(resumenVentasCobradas([])).toEqual({ cantidad: 0, total: 0 });
  });
});

describe('Hallazgo 2: fecha y hora de una cita en México (24 h)', () => {
  it('21:00Z es 15:00 del mismo día en México', () => {
    expect(fechaYHora24EnMexico('2026-10-14T21:00:00.000Z')).toEqual({ fecha: '2026-10-14', hora: '15:00' });
  });
  it('05:00Z del día siguiente es 23:00 del día anterior en México', () => {
    expect(fechaYHora24EnMexico('2026-10-15T05:00:00.000Z')).toEqual({ fecha: '2026-10-14', hora: '23:00' });
  });
  it('la medianoche sale como 00:00, nunca 24:00', () => {
    expect(fechaYHora24EnMexico('2026-10-14T06:00:00.000Z')).toEqual({ fecha: '2026-10-14', hora: '00:00' });
  });
  it('sin fecha válida da null', () => {
    expect(fechaYHora24EnMexico('')).toBeNull();
    expect(fechaYHora24EnMexico('no-es-fecha')).toBeNull();
  });
});

describe('Hallazgo 4: seguimientos', () => {
  it('"Marcar atendido" solo con seguimientos:escritura y si requiere acción', () => {
    expect(puedeMarcarAtendido(conClaves(['seguimientos:escritura']), { requiereAccion: true })).toBe(true);
    expect(puedeMarcarAtendido(conClaves(['*']), { requiereAccion: true })).toBe(true);
    expect(puedeMarcarAtendido(conClaves(['seguimientos:lectura']), { requiereAccion: true })).toBe(false);
    expect(puedeMarcarAtendido(conClaves(['seguimientos:escritura']), { requiereAccion: false })).toBe(false);
  });
  it('fecha corta dd/mm/aaaa en hora de México', () => {
    expect(fechaCortaEnMexico('2026-10-10T15:00:00.000Z')).toBe('10/10/2026');
    // 21:00 del 10 en México ya es día 11 en UTC
    expect(fechaCortaEnMexico('2026-10-11T03:00:00.000Z')).toBe('10/10/2026');
    expect(fechaCortaEnMexico('2026-01-05T18:00:00.000Z')).toBe('05/01/2026');
    expect(fechaCortaEnMexico(null)).toBeNull();
    expect(fechaCortaEnMexico('basura')).toBeNull();
  });
});

describe('Hallazgo 5: "Ver todas las citas" según permiso', () => {
  it('con citas:escritura va a gestión de citas', () => {
    expect(rutaVerTodasLasCitas(conClaves(['citas:escritura']))).toBe('/operacion/gestion-citas');
  });
  it('sin citas:escritura (becaria) va a la agenda, que no exige permiso', () => {
    expect(rutaVerTodasLasCitas(conClaves(['citas:asignadas']))).toBe('/operacion/agenda-calendario');
  });
});

describe('Hallazgo 6: motivo al cancelar una cita', () => {
  it('es obligatorio', () => {
    expect(validarMotivoCancelacionCita('   ')).toBe('Escribe el motivo de la cancelación');
    expect(validarMotivoCancelacionCita('La clienta avisó')).toBeNull();
  });
});

describe('Hallazgo 7: estados de un listado', () => {
  it('con error no se pinta el vacío', () => {
    expect(estadoListado({ cargando: false, error: 'Falló', cantidad: 0 })).toBe('error');
    expect(estadoListado({ cargando: true, error: null, cantidad: 0 })).toBe('cargando');
    expect(estadoListado({ cargando: false, error: null, cantidad: 0 })).toBe('vacio');
    expect(estadoListado({ cargando: false, error: null, cantidad: 2 })).toBe('lista');
  });
  it('ejecución de servicios avisa si falla alguna de las dos consultas', () => {
    const ok = <T,>(value: T): PromiseSettledResult<T> => ({ status: 'fulfilled', value });
    const falla = <T,>(): PromiseSettledResult<T> => ({ status: 'rejected', reason: new Error('500') });
    expect(resultadoCargaEjecucion(ok({ data: [1] }), ok({ data: [2] }))).toEqual({ enCurso: [1], hoy: [2], error: null });
    const r = resultadoCargaEjecucion(falla<{ data: number[] }>(), ok({ data: [2] }));
    expect(r.enCurso).toEqual([]);
    expect(r.hoy).toEqual([2]);
    expect(r.error).toMatch(/No se pudieron cargar/);
  });
});

describe('Hallazgo 9: contadores de gestión de citas', () => {
  it('se etiquetan como de esta página', () => {
    const resumen = resumenCitasPagina([
      { estado: 'pendiente' }, { estado: 'confirmada' }, { estado: 'en_curso' }, { estado: 'cancelada' }, { estado: 'completada' },
    ]);
    expect(resumen).toEqual({
      pendientes: { etiqueta: 'Pendientes / confirmadas en esta página', valor: 2 },
      enCurso: { etiqueta: 'En curso en esta página', valor: 1 },
      canceladas: { etiqueta: 'Canceladas en esta página', valor: 1 },
    });
  });
});

describe('Hallazgo 10: nueva solicitud de permiso', () => {
  const base = { fechaInicio: '2026-10-20', fechaFin: '2026-10-21', motivo: 'Cita médica' };
  it('el motivo tiene tope de 500 caracteres', () => {
    expect(MAX_MOTIVO_SOLICITUD).toBe(500);
    expect(validarSolicitudPermiso({ ...base, motivo: 'a'.repeat(501) })).toBe('El motivo admite hasta 500 caracteres');
    expect(validarSolicitudPermiso({ ...base, motivo: 'a'.repeat(500) })).toBeNull();
  });
  it('mantiene las reglas de fechas y motivo', () => {
    expect(validarSolicitudPermiso({ ...base, fechaInicio: '' })).toBe('Selecciona el rango de fechas');
    expect(validarSolicitudPermiso({ ...base, fechaFin: '2026-10-19' })).toBe('La fecha de fin no puede ser anterior a la de inicio');
    expect(validarSolicitudPermiso({ ...base, motivo: '  ' })).toBe('Ingresa el motivo');
  });
});

describe('Hallazgo 11: etiquetas de la ficha de clienta', () => {
  it('tipos de notificación en palabras', () => {
    expect(etiquetaTipoNotificacion('cita_recordatorio')).toBe('Recordatorio de cita');
    expect(etiquetaTipoNotificacion('pedido_listo_recoger')).toBe('Pedido listo para recoger');
    expect(etiquetaTipoNotificacion('algo_nuevo')).toBe('Algo nuevo');
    expect(etiquetaTipoNotificacion('')).toBe('Aviso');
  });
  it('todos los tipos que crea el backend tienen su nombre en español (ninguno sale con el nombre interno)', () => {
    const tipos = ['cita_nueva', 'anticipo_pagado', 'anticipo_por_devolver', 'pedido_nuevo', 'revocacion_por_recibir', 'arco_solicitud', 'arco_respuesta', 'pago_revision', 'pedido_cancelado_pagado', 'reembolso'];
    expect(tipos.map(etiquetaTipoNotificacion)).toEqual([
      'Cita nueva',
      'Anticipo pagado',
      'Anticipo por devolver',
      'Pedido nuevo',
      'Revocación por recibir',
      'Solicitud ARCO',
      'Respuesta a solicitud ARCO',
      'Pago en revisión',
      'Pedido pagado cancelado',
      'Reembolso',
    ]);
  });
});

describe('Hallazgo 12: método de pago y folio de ventas', () => {
  it('método de pago en palabras', () => {
    expect(etiquetaMetodoPagoVenta('efectivo')).toBe('Efectivo');
    expect(etiquetaMetodoPagoVenta('tarjeta')).toBe('Tarjeta');
    expect(etiquetaMetodoPagoVenta('transferencia')).toBe('Transferencia');
    expect(etiquetaMetodoPagoVenta('mixto')).toBe('Mixto');
    expect(etiquetaMetodoPagoVenta('')).toBe('-');
    expect(etiquetaMetodoPagoVenta('vale_regalo')).toBe('Vale regalo');
  });
  it('folio de la venta, o su número si no trae', () => {
    expect(folioVenta({ id: 7, folio: 'V-0007' })).toBe('V-0007');
    expect(folioVenta({ id: 7 })).toBe('#7');
  });
});

describe('Hallazgo 13: comisiones y copiar URLs', () => {
  it('el monto de comisión no pasa del máximo de la base (Decimal 10,2)', () => {
    expect(MONTO_MAXIMO_COMISION).toBe(99999999.99);
    expect(validarMontoComision('99999999.99')).toBeNull();
    expect(validarMontoComision('100000000')).toBe('El monto máximo es $99,999,999.99');
    expect(validarMontoComision('abc')).toBe('Monto inválido: cero o más, con hasta 2 decimales');
  });
  it('copiar avisa si el navegador no deja usar el portapapeles', async () => {
    const copiados: string[] = [];
    expect(await copiarAlPortapapeles('x', { writeText: async (t) => { copiados.push(t); } })).toBe(true);
    expect(copiados).toEqual(['x']);
    expect(await copiarAlPortapapeles('x', { writeText: async () => { throw new Error('denegado'); } })).toBe(false);
    expect(await copiarAlPortapapeles('x', undefined)).toBe(false);
  });
});

describe('Fecha y hora de una cita en hora de México', () => {
  it('arma el ISO con el desfase de México, sin depender de la zona del navegador', async () => {
    const { isoDesdeFechaHoraMexico } = await import('./panelOperacion');
    expect(isoDesdeFechaHoraMexico('2026-10-16', '15:00')).toBe('2026-10-16T21:00:00.000Z');
    expect(isoDesdeFechaHoraMexico('2026-10-14', '23:00')).toBe('2026-10-15T05:00:00.000Z');
  });
});
