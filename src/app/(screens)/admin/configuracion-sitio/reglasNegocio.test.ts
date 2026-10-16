// Admin > Configuración del sitio > Reglas: lógica pura y pintado (vitest corre sin DOM: renderToStaticMarkup).
import { createElement, type FunctionComponent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DefinicionRegla } from '../../../utils/reglasNegocio';
import { cambiosDeReglas, escribirRuta, errorDeRegla, gruposDeReglas, leerRuta, rangoDeRegla, rutaDeMensaje, validarReglasNegocio } from './reglasNegocioAdmin';
import { prepararValor } from './validacionConfiguracion';
import { valorInicial } from './cambiosConfiguracion';
import FormReglasNegocio from './FormReglasNegocio';

/** Muestra de definicionesReglas como las manda el backend. */
const DEFS: DefinicionRegla[] = [
  { ruta: 'anticiposDesde', grupo: 'Citas y anticipos', etiqueta: 'Fecha de inicio de los anticipos', afecta: 'Desde esta fecha se pide anticipo.', tipo: 'fecha' },
  { ruta: 'citas.plazoAnticipoHoras', grupo: 'Citas y anticipos', etiqueta: 'Plazo para pagar el anticipo en línea', afecta: 'Cuánto tiempo queda apartado el horario.', tipo: 'entero', unidad: 'horas', min: 1, max: 72 },
  { ruta: 'citas.permitirAnticipoEnSalon', grupo: 'Citas y anticipos', etiqueta: 'Permitir pagar el anticipo en el salón', afecta: 'Si se apaga, solo en línea.', tipo: 'booleano' },
  { ruta: 'citas.intervaloHorariosMinutos', grupo: 'Citas y anticipos', etiqueta: 'Horarios cada', afecta: 'Cada cuántos minutos.', tipo: 'entero', unidad: 'minutos', opciones: [15, 20, 30, 60] },
  { ruta: 'citas.recordatoriosHorasAntes', grupo: 'Citas y anticipos', etiqueta: 'Recordatorios de cita', afecta: 'Horas antes.', tipo: 'horas', min: 1, max: 168 },
  { ruta: 'tienda.diaRecordatorioRecoger', grupo: 'Tienda y apartados', etiqueta: 'Recordatorio para recoger', afecta: 'Día del recordatorio.', tipo: 'entero', unidad: 'días', min: 1, max: 30 },
  { ruta: 'tienda.diasCancelarNoRecogido', grupo: 'Tienda y apartados', etiqueta: 'Días para cancelar un apartado no recogido', afecta: 'Se cancela.', tipo: 'entero', unidad: 'días', min: 1, max: 60 },
  { ruta: 'tienda.tiempoPreparacionTexto', grupo: 'Tienda y apartados', etiqueta: 'Tiempo estimado de preparación', afecta: 'Texto.', tipo: 'texto', maxLargo: 120 },
  { ruta: 'revocacion.diasHabiles', grupo: 'Plazos legales', etiqueta: 'Días hábiles para revocar una compra en línea', afecta: 'Art. 56 LFPC.', tipo: 'entero', unidad: 'días hábiles', min: 5, max: 60, minimoLegal: true },
  { ruta: 'arco.diasHabilesRespuesta', grupo: 'Plazos legales', etiqueta: 'Responder una solicitud ARCO en', afecta: 'Plazo de ley.', tipo: 'entero', unidad: 'días hábiles', min: 20, max: 20, minimoLegal: true },
  { ruta: 'pagos.mercadoPagoAnticipos', grupo: 'Métodos de pago', etiqueta: 'Pago en línea de anticipos (Mercado Pago)', afecta: 'Si se apaga, solo en el salón.', tipo: 'booleano' },
  { ruta: 'pagos.salon.efectivo', grupo: 'Métodos de pago', etiqueta: 'En el salón: efectivo', afecta: 'Forma de pago.', tipo: 'booleano' },
  { ruta: 'pagos.salon.tarjeta', grupo: 'Métodos de pago', etiqueta: 'En el salón: tarjeta', afecta: 'Forma de pago.', tipo: 'booleano' },
  { ruta: 'pagos.salon.transferencia', grupo: 'Métodos de pago', etiqueta: 'En el salón: transferencia', afecta: 'Forma de pago.', tipo: 'booleano' },
  { ruta: 'pagos.transferencia.banco', grupo: 'Métodos de pago', etiqueta: 'Banco para transferencias', afecta: 'Solo si está activa.', tipo: 'texto', maxLargo: 60 },
  { ruta: 'pagos.transferencia.titular', grupo: 'Métodos de pago', etiqueta: 'Titular de la cuenta', afecta: 'Solo si está activa.', tipo: 'texto', maxLargo: 120 },
  { ruta: 'pagos.transferencia.clabe', grupo: 'Métodos de pago', etiqueta: 'CLABE interbancaria', afecta: '18 dígitos.', tipo: 'texto', maxLargo: 18 },
  { ruta: 'diasInhabiles', grupo: 'Días inhábiles', etiqueta: 'Días inhábiles y festivos del salón', afecta: 'Se suman a domingos y festivos.', tipo: 'dias-inhabiles' },
];

const HOY = {
  anticiposDesde: null,
  citas: { plazoAnticipoHoras: 2, permitirAnticipoEnSalon: true, intervaloHorariosMinutos: 30, recordatoriosHorasAntes: [24, 1] },
  tienda: { diaRecordatorioRecoger: 3, diasCancelarNoRecogido: 7, tiempoPreparacionTexto: 'Suele estar listo en 24 a 48 horas hábiles' },
  revocacion: { diasHabiles: 5 },
  arco: { diasHabilesRespuesta: 20 },
  pagos: { mercadoPagoAnticipos: true, salon: { efectivo: true, tarjeta: true, transferencia: false }, transferencia: { banco: '', titular: '', clabe: '' } },
  diasInhabiles: [],
};

const pintar = (props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(FormReglasNegocio as unknown as FunctionComponent<Record<string, unknown>>, props));

describe('Rutas dentro de las reglas', () => {
  it('lee y escribe sin mutar el original', () => {
    expect(leerRuta(HOY, 'citas.plazoAnticipoHoras')).toBe(2);
    const otro = escribirRuta(HOY, 'citas.plazoAnticipoHoras', 3);
    expect(leerRuta(otro, 'citas.plazoAnticipoHoras')).toBe(3);
    expect(HOY.citas.plazoAnticipoHoras).toBe(2);
  });

  it('agrupa en el orden del backend', () => {
    expect(gruposDeReglas(DEFS).map((g) => g.grupo)).toEqual(['Citas y anticipos', 'Tienda y apartados', 'Plazos legales', 'Métodos de pago', 'Días inhábiles']);
  });
});

describe('Validación igual a la del backend', () => {
  it('con los valores de hoy no hay errores', () => {
    expect(validarReglasNegocio(HOY, DEFS)).toEqual({});
  });

  it('rango, mínimo de ley y plazo fijo de ley, con mensajes en español', () => {
    const d = (r: string) => DEFS.find((x) => x.ruta === r)!;
    expect(errorDeRegla(d('citas.plazoAnticipoHoras'), 0)).toMatch(/al menos 1 horas/);
    expect(errorDeRegla(d('citas.plazoAnticipoHoras'), 73)).toMatch(/como máximo 72/);
    expect(errorDeRegla(d('citas.plazoAnticipoHoras'), 2.5)).toMatch(/número entero/);
    expect(errorDeRegla(d('revocacion.diasHabiles'), 4)).toMatch(/la ley pide al menos 5/);
    expect(errorDeRegla(d('arco.diasHabilesRespuesta'), 25)).toMatch(/plazo de ley es de 20/);
    expect(errorDeRegla(d('citas.intervaloHorariosMinutos'), 25)).toMatch(/elige 15, 20, 30, 60/);
    expect(errorDeRegla(d('citas.recordatoriosHorasAntes'), [48, 24, 2, 1])).toMatch(/hasta 3 recordatorios/);
    expect(errorDeRegla(d('tienda.tiempoPreparacionTexto'), 'x'.repeat(121))).toMatch(/máximo 120/);
    expect(errorDeRegla(d('diasInhabiles'), [{ fecha: '2026-02-30', motivo: '' }])).toMatch(/Día inhábil 1/);
    expect(errorDeRegla(d('diasInhabiles'), [{ fecha: '2026-11-18', motivo: '' }, { fecha: '2026-11-18', motivo: 'x' }])).toMatch(/repetida/);
  });

  it('validaciones cruzadas: recordatorio antes de cancelar, una forma de pago del anticipo y datos de transferencia', () => {
    expect(validarReglasNegocio(escribirRuta(HOY, 'tienda.diaRecordatorioRecoger', 7), DEFS)['tienda.diaRecordatorioRecoger']).toMatch(/antes del día/);
    const sinPago = escribirRuta(escribirRuta(HOY, 'pagos.mercadoPagoAnticipos', false), 'citas.permitirAnticipoEnSalon', false);
    expect(validarReglasNegocio(sinPago, DEFS)['pagos.mercadoPagoAnticipos']).toMatch(/al menos una forma de pago/);
    const clabeCorta = escribirRuta(HOY, 'pagos.transferencia', { banco: 'Banco', titular: 'Titular', clabe: '123' });
    expect(validarReglasNegocio(clabeCorta, DEFS)['pagos.transferencia.clabe']).toMatch(/18 dígitos/);
  });

  it('cada mensaje del backend va junto a su regla', () => {
    expect(rutaDeMensaje('"Plazo para pagar el anticipo en línea" debe ser de como máximo 72 horas.', DEFS)).toBe('citas.plazoAnticipoHoras');
    expect(rutaDeMensaje('Día inhábil 2: la fecha debe ser válida (AAAA-MM-DD).', DEFS)).toBe('diasInhabiles');
    expect(rutaDeMensaje('Algo que no se reconoce.', DEFS)).toBeNull();
  });
});

describe('Resumen de cambios e historial', () => {
  it('nombra la regla con su etiqueta y unidad', () => {
    expect(cambiosDeReglas(HOY, escribirRuta(HOY, 'citas.plazoAnticipoHoras', 3), DEFS)).toEqual([
      { campo: 'Plazo para pagar el anticipo en línea', antes: '2 horas', despues: '3 horas' },
    ]);
  });

  it('una entrada vieja del historial (solo la fecha de anticipos) no inventa cambios', () => {
    expect(cambiosDeReglas({ anticiposDesde: null }, HOY, DEFS)).toEqual([]);
  });
});

describe('Valor que se guarda', () => {
  it('se conservan todas las reglas y la fecha vacía va como null', () => {
    expect(prepararValor('reglas', { ...HOY, anticiposDesde: '' })).toEqual({ ...HOY, anticiposDesde: null });
    expect(valorInicial('reglas', HOY)).toEqual(HOY);
  });
});

describe('Pantalla de reglas', () => {
  it('cada regla con su explicación, su rango y los mínimos de ley', () => {
    const html = pintar({ valor: HOY, definiciones: DEFS, errores: {}, respaldoApartados: null, onCambiar: () => undefined });
    expect(html).toContain('Plazo para pagar el anticipo en línea');
    expect(html).toContain('Cuánto tiempo queda apartado el horario.');
    expect(html).toContain('Entre 1 y 72 horas.');
    expect(html).toContain('Mínimo de ley: 5 días hábiles.');
    expect(html).toContain('Plazo fijado por la ley: 20 días hábiles.');
    expect(html).toContain('conservan la regla con la que se hicieron');
    expect(html).toContain('Agregar día inhábil');
  });

  it('los datos de transferencia solo aparecen con la transferencia activa', () => {
    const apagada = pintar({ valor: HOY, definiciones: DEFS, errores: {}, respaldoApartados: null, onCambiar: () => undefined });
    expect(apagada).not.toContain('CLABE interbancaria');
    const activa = pintar({ valor: escribirRuta(HOY, 'pagos.salon.transferencia', true), definiciones: DEFS, errores: {}, respaldoApartados: null, onCambiar: () => undefined });
    expect(activa).toContain('CLABE interbancaria');
  });

  it('el error del campo se anuncia junto a él', () => {
    const html = pintar({ valor: HOY, definiciones: DEFS, errores: { 'citas.plazoAnticipoHoras': 'Mensaje de prueba' }, respaldoApartados: null, onCambiar: () => undefined });
    expect(html).toMatch(/id="regla-citas-plazoAnticipoHoras-error"[^>]*>Mensaje de prueba/);
  });

  it('rango de cada tipo', () => {
    expect(rangoDeRegla(DEFS[3])).toBe('Opciones: 15, 20, 30, 60 minutos.');
  });
});
