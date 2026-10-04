import { describe, expect, it } from 'vitest';
import { evaluarPermiso } from './permisos';
import { payloadTurnoSinCita, validarTurnoSinCita, type FormTurnoSinCita } from './turnoSinCita';
import { itemsDeVenta, montoValido, pagosMixtos, totalesTicket, validarCobro, type LineaCobro } from './cobroPos';
import { causasDe, etiquetaCausa, requiereArticulo } from './politicaDevolucion';
import { rangoDelMes } from './fechaSoloDia';

describe('evaluarPermiso con varias claves', () => {
  it('con una lista basta con tener cualquiera', () => {
    expect(evaluarPermiso(['comisiones:ver_propias'], ['comisiones:configurar', 'comisiones:ver_propias'])).toBe(true);
    expect(evaluarPermiso(['ventas:escritura'], ['comisiones:configurar', 'comisiones:ver_propias'])).toBe(false);
    expect(evaluarPermiso(['*'], ['comisiones:configurar'])).toBe(true);
  });
  it('una clave sola sigue igual', () => {
    expect(evaluarPermiso(['caja:lectura'], 'caja:lectura')).toBe(true);
    expect(evaluarPermiso([], undefined)).toBe(true);
  });
});

const base: FormTurnoSinCita = { modo: 'invitada', nombre: 'Ana López', telefono: '771 123 4567', clienteId: '', servicioId: '5', especialistaId: 'e' };

describe('Turno sin cita', () => {
  it('una persona sin cuenta necesita nombre', () => {
    expect(validarTurnoSinCita({ ...base, nombre: '   ' })).toBe('Escribe el nombre de la persona');
  });
  it('el teléfono solo admite números, espacios, +, ( ) y -', () => {
    expect(validarTurnoSinCita({ ...base, telefono: '771-abc' })).toMatch(/Teléfono/);
    expect(validarTurnoSinCita({ ...base, telefono: '' })).toBeNull();
  });
  it('una clienta registrada necesita elegirse de la búsqueda', () => {
    expect(validarTurnoSinCita({ ...base, modo: 'registrada', clienteId: '' })).toBe('Busca y elige a la clienta');
  });
  it('pide servicio y especialista', () => {
    expect(validarTurnoSinCita({ ...base, servicioId: '' })).toBe('Elige el servicio');
    expect(validarTurnoSinCita({ ...base, especialistaId: '' })).toBe('Elige quién la atiende');
    expect(validarTurnoSinCita(base)).toBeNull();
  });
  it('el payload manda nombre y teléfono limpios para una invitada y solo clienteId para una registrada', () => {
    expect(payloadTurnoSinCita(base, true)).toEqual({ nombre: 'Ana López', telefono: '771 123 4567', servicioId: 5, especialistaId: 'e', iniciarAhora: true });
    expect(payloadTurnoSinCita({ ...base, modo: 'registrada', clienteId: 'c1' }, false)).toEqual({ clienteId: 'c1', servicioId: 5, especialistaId: 'e', iniciarAhora: false });
    expect(payloadTurnoSinCita({ ...base, telefono: '  ' }, false)).not.toHaveProperty('telefono');
  });
});

const lineas: LineaCobro[] = [
  { tipo: 'producto', presentacionId: 2, cantidad: 2, precioUnitario: 150 },
  { tipo: 'servicio', servicioId: 5, cantidad: 1, precioUnitario: 900, citaId: 40, participantes: ['aux-1'] },
];

describe('Cobro en el punto de venta', () => {
  it('los items nunca llevan precio; la línea de cita lleva citaId y participantes', () => {
    expect(itemsDeVenta(lineas)).toEqual([
      { presentacionId: 2, cantidad: 2 },
      { servicioId: 5, cantidad: 1, citaId: 40, participantes: ['aux-1'] },
    ]);
  });
  it('totales con descuento', () => {
    expect(totalesTicket(lineas, 100)).toEqual({ subtotal: 1200, descuento: 100, total: 1100 });
  });
  it('un descuento mayor a 0 exige motivo y no puede pasar del subtotal', () => {
    const t = { lineas, metodoPago: 'efectivo', pagos: {} };
    expect(validarCobro({ ...t, descuento: 100, motivoDescuento: ' ' })).toBe('Escribe el motivo del descuento');
    expect(validarCobro({ ...t, descuento: 5000, motivoDescuento: 'x' })).toBe('El descuento no puede ser mayor al subtotal');
    expect(validarCobro({ ...t, descuento: 100, motivoDescuento: 'Clienta frecuente' })).toBeNull();
  });
  it('en pago mixto la suma debe ser igual al total', () => {
    const t = { lineas, descuento: 0, motivoDescuento: '', metodoPago: 'mixto' };
    expect(validarCobro({ ...t, pagos: { efectivo: '400', tarjeta: '500' } })).toMatch(/suman \$900\.00 y el total es \$1,200\.00/);
    expect(validarCobro({ ...t, pagos: { efectivo: '700', tarjeta: '500' } })).toBeNull();
    expect(validarCobro({ ...t, pagos: { efectivo: '700.10', tarjeta: '499.90' } })).toBeNull();
  });
  it('el ticket vacío no se cobra', () => {
    expect(validarCobro({ lineas: [], descuento: 0, motivoDescuento: '', metodoPago: 'efectivo', pagos: {} })).toMatch(/Agrega/);
  });
  it('pagosMixtos solo aplica a mixto y omite los montos vacíos', () => {
    expect(pagosMixtos('mixto', { efectivo: '700', tarjeta: '500', transferencia: '' })).toEqual({ efectivo: 700, tarjeta: 500 });
    expect(pagosMixtos('efectivo', { efectivo: '700' })).toBeUndefined();
  });
});

describe('Política de cambios y reembolsos', () => {
  it('cada tipo tiene sus causas', () => {
    expect(causasDe('cambio')).toEqual(['sellado_sin_abrir', 'defecto_fabrica']);
    expect(causasDe('reembolso')).toContain('cancelacion_antes_listo');
    expect(etiquetaCausa('sellado_sin_abrir')).toBe('Producto sellado y sin abrir');
  });
  it('el cambio y los defectos piden elegir el artículo; un reembolso por cancelación no', () => {
    expect(requiereArticulo('cambio', 'sellado_sin_abrir')).toBe(true);
    expect(requiereArticulo('reembolso', 'producto_distinto')).toBe(true);
    expect(requiereArticulo('reembolso', 'cancelacion_antes_listo')).toBe(false);
  });
});

describe('Periodo de comisiones', () => {
  it('el mes del día dado, del 1 al último día', () => {
    expect(rangoDelMes('2026-10-04')).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(rangoDelMes('2028-02-10')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
  });
});

describe('Monto de comisión', () => {
  it('acepta cero o más con hasta 2 decimales, incluidos los que fallan con punto flotante', () => {
    for (const v of ['0', '100', '0.29', '1.10', '0.1', '12.5']) expect(montoValido(v)).toBe(true);
    for (const v of ['', ' ', '-1', '1.234', 'abc', '1e2']) expect(montoValido(v)).toBe(false);
  });
});
