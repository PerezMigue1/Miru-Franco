import type { DefinicionRegla, DiaInhabil } from '../../../utils/reglasNegocio';
import { fechaLarga, type Cambio } from './cambiosConfiguracion';
import { esFechaValida, type Errores } from './validacionConfiguracion';

/**
 * Lógica pura de Admin > Configuración del sitio > Reglas. Los campos salen de definicionesReglas del backend
 * (etiqueta, qué afecta, tipo, rango y mínimo de ley): el panel no repite los rangos, los lee. Las validaciones son
 * las mismas que hace el backend, para avisar antes de guardar; el backend vuelve a validar todo.
 */

export type ReglasAdmin = Record<string, unknown> & { anticiposDesde: string | null };

export const MAX_RECORDATORIOS = 3;
export const MAX_DIAS_INHABILES = 60;
export const MAX_MOTIVO_DIA = 80;
const CLABE = /^\d{18}$/;

const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export function leerRuta(obj: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((o, k) => (esObjeto(o) ? o[k] : undefined), obj);
}

/** Copia con el valor cambiado en la ruta (no muta el original). */
export function escribirRuta<T>(obj: T, ruta: string, valor: unknown): T {
  const copia = structuredClone(obj) as Record<string, unknown>;
  const partes = ruta.split('.');
  let o = copia;
  for (const k of partes.slice(0, -1)) {
    if (!esObjeto(o[k])) o[k] = {};
    o = o[k] as Record<string, unknown>;
  }
  o[partes[partes.length - 1]] = valor;
  return copia as T;
}

/** Grupos en el orden en que llegan las definiciones. */
export function gruposDeReglas(definiciones: DefinicionRegla[]): { grupo: string; reglas: DefinicionRegla[] }[] {
  const grupos: { grupo: string; reglas: DefinicionRegla[] }[] = [];
  for (const d of definiciones) {
    const g = grupos.find((x) => x.grupo === d.grupo);
    if (g) g.reglas.push(d);
    else grupos.push({ grupo: d.grupo, reglas: [d] });
  }
  return grupos;
}

const unidad = (d: DefinicionRegla) => (d.unidad ? ` ${d.unidad}` : '');

/** "Entre 1 y 72 horas", "Mínimo de ley: 5 días hábiles"... (ayuda bajo el campo). */
export function rangoDeRegla(d: DefinicionRegla): string | null {
  if (d.tipo === 'entero') {
    if (d.opciones) return `Opciones: ${d.opciones.join(', ')}${unidad(d)}.`;
    if (d.minimoLegal && d.min !== undefined && d.min === d.max) return `Plazo fijado por la ley: ${d.min}${unidad(d)}.`;
    if (d.minimoLegal && d.min !== undefined) return `Mínimo de ley: ${d.min}${unidad(d)}. Máximo ${d.max}.`;
    if (d.min !== undefined && d.max !== undefined) return `Entre ${d.min} y ${d.max}${unidad(d)}.`;
  }
  if (d.tipo === 'horas') return `Hasta ${MAX_RECORDATORIOS}, de ${d.min ?? 1} a ${d.max ?? 168} horas antes.`;
  if (d.tipo === 'texto' && d.maxLargo) return `Máximo ${d.maxLargo} caracteres.`;
  return null;
}

/** Error de un valor según su definición (mismos mensajes que el backend), o null. */
export function errorDeRegla(d: DefinicionRegla, v: unknown): string | null {
  switch (d.tipo) {
    case 'booleano':
      return typeof v === 'boolean' ? null : `"${d.etiqueta}" debe ser sí o no.`;
    case 'texto':
      if (typeof v !== 'string') return `"${d.etiqueta}" debe ser texto.`;
      return d.maxLargo && v.trim().length > d.maxLargo ? `"${d.etiqueta}" tiene como máximo ${d.maxLargo} caracteres.` : null;
    case 'fecha':
      if (v === null || v === undefined || v === '') return null;
      return typeof v === 'string' && esFechaValida(v) ? null : `La ${d.etiqueta.toLowerCase()} debe ser una fecha válida (AAAA-MM-DD).`;
    case 'entero': {
      if (typeof v !== 'number' || !Number.isInteger(v)) return `"${d.etiqueta}" debe ser un número entero.`;
      if (d.opciones && !d.opciones.includes(v)) return `"${d.etiqueta}": elige ${d.opciones.join(', ')}${unidad(d)}.`;
      if (d.min !== undefined && v < d.min) {
        return d.minimoLegal ? `"${d.etiqueta}": la ley pide al menos ${d.min}${unidad(d)}.` : `"${d.etiqueta}" debe ser de al menos ${d.min}${unidad(d)}.`;
      }
      if (d.max !== undefined && v > d.max) {
        return d.minimoLegal && d.min === d.max
          ? `"${d.etiqueta}": el plazo de ley es de ${d.max}${unidad(d)}.`
          : `"${d.etiqueta}" debe ser de como máximo ${d.max}${unidad(d)}.`;
      }
      return null;
    }
    case 'horas': {
      const ok =
        Array.isArray(v) && v.length <= MAX_RECORDATORIOS && v.every((h) => Number.isInteger(h) && h >= (d.min ?? 1) && h <= (d.max ?? 168));
      return ok ? null : `"${d.etiqueta}": hasta ${MAX_RECORDATORIOS} recordatorios, cada uno de ${d.min ?? 1} a ${d.max ?? 168} horas antes.`;
    }
    case 'dias-inhabiles': {
      if (!Array.isArray(v) || v.length > MAX_DIAS_INHABILES) return `Días inhábiles: una lista de hasta ${MAX_DIAS_INHABILES} días.`;
      for (const [i, x] of (v as Partial<DiaInhabil>[]).entries()) {
        if (typeof x?.fecha !== 'string' || !esFechaValida(x.fecha)) return `Día inhábil ${i + 1}: la fecha debe ser válida (AAAA-MM-DD).`;
        if ((x.motivo ?? '').trim().length > MAX_MOTIVO_DIA) return `Día inhábil ${i + 1}: el motivo tiene como máximo ${MAX_MOTIVO_DIA} caracteres.`;
      }
      const fechas = (v as DiaInhabil[]).map((x) => x.fecha);
      return new Set(fechas).size === fechas.length ? null : 'Días inhábiles: hay una fecha repetida.';
    }
  }
}

/** Errores por ruta, más las validaciones cruzadas del backend (en la clave "general" y junto al campo que toca). */
export function validarReglasNegocio(v: unknown, definiciones: DefinicionRegla[] | undefined): Errores {
  if (!definiciones?.length) return {};
  const errores: Errores = {};
  for (const d of definiciones) {
    // La fecha de inicio de anticipos la valida FormReglas (con su opción "usar la variable del servidor").
    if (d.ruta === 'anticiposDesde') continue;
    const e = errorDeRegla(d, leerRuta(v, d.ruta));
    if (e) errores[d.ruta] = e;
  }
  const n = (ruta: string) => leerRuta(v, ruta);
  if (typeof n('tienda.diaRecordatorioRecoger') === 'number' && (n('tienda.diaRecordatorioRecoger') as number) >= (n('tienda.diasCancelarNoRecogido') as number)) {
    errores['tienda.diaRecordatorioRecoger'] ??= 'El recordatorio para recoger debe ser antes del día en que se cancela el apartado no recogido.';
  }
  const enLinea = n('pagos.mercadoPagoAnticipos') === true;
  const enSalon = n('citas.permitirAnticipoEnSalon') === true;
  const metodosSalon = ['efectivo', 'tarjeta', 'transferencia'].filter((m) => n(`pagos.salon.${m}`) === true);
  if (!enLinea && !enSalon) errores['pagos.mercadoPagoAnticipos'] ??= 'El anticipo necesita al menos una forma de pago: en línea o en el salón.';
  if (enSalon && !enLinea && metodosSalon.length === 0) {
    errores['pagos.salon.efectivo'] ??= 'Activa al menos un método de pago en el salón o el pago en línea de anticipos.';
  }
  const banco = String(n('pagos.transferencia.banco') ?? '').trim();
  const titular = String(n('pagos.transferencia.titular') ?? '').trim();
  const clabe = String(n('pagos.transferencia.clabe') ?? '').trim();
  if (banco || titular || clabe) {
    if (!banco) errores['pagos.transferencia.banco'] ??= 'Para mostrar los datos de transferencia escribe el banco y el titular.';
    if (!titular) errores['pagos.transferencia.titular'] ??= 'Para mostrar los datos de transferencia escribe el banco y el titular.';
    if (!CLABE.test(clabe)) errores['pagos.transferencia.clabe'] ??= 'La CLABE debe tener 18 dígitos.';
  }
  return errores;
}

/** Texto de un valor para el resumen de cambios y el historial. */
export function textoDeRegla(d: DefinicionRegla, v: unknown): string {
  if (v === undefined || v === null || v === '') return d.tipo === 'fecha' ? 'Sin fecha (variable de respaldo)' : '(vacío)';
  switch (d.tipo) {
    case 'booleano':
      return v ? 'Sí' : 'No';
    case 'fecha':
      return typeof v === 'string' ? fechaLarga(v) : String(v);
    case 'entero':
      return `${v}${unidad(d)}`;
    case 'horas':
      return Array.isArray(v) && v.length ? `${v.join(', ')} horas antes` : 'Sin recordatorios';
    case 'dias-inhabiles':
      return Array.isArray(v) && v.length
        ? (v as DiaInhabil[]).map((x) => `${fechaLarga(x.fecha)}${x.motivo ? ` (${x.motivo})` : ''}`).join('; ')
        : 'Ninguno';
    default:
      return String(v);
  }
}

/** Cambios regla por regla (sin la fecha de anticipos, que ya la resume cambiosDeSeccion). */
export function cambiosDeReglas(anterior: unknown, nuevo: unknown, definiciones: DefinicionRegla[] | undefined): Cambio[] {
  if (!definiciones?.length) return [];
  const cambios: Cambio[] = [];
  for (const d of definiciones) {
    if (d.ruta === 'anticiposDesde') continue;
    const a = leerRuta(anterior, d.ruta);
    const n = leerRuta(nuevo, d.ruta);
    // Una regla que no existía en el valor anterior (historial de antes de esta ronda) no se cuenta como cambio.
    if (a === undefined) continue;
    const antes = textoDeRegla(d, a);
    const despues = textoDeRegla(d, n);
    if (antes !== despues) cambios.push({ campo: d.etiqueta, antes, despues });
  }
  return cambios;
}

/** A qué regla se refiere un mensaje del backend (por su etiqueta entre comillas o su nombre). */
export function rutaDeMensaje(mensaje: string, definiciones: DefinicionRegla[] | undefined): string | null {
  for (const d of definiciones ?? []) {
    if (mensaje.includes(`"${d.etiqueta}"`) || mensaje.toLowerCase().includes(`la ${d.etiqueta.toLowerCase()} debe`)) return d.ruta;
  }
  if (/^Día inhábil|^Días inhábiles/.test(mensaje)) return 'diasInhabiles';
  if (/CLABE/.test(mensaje)) return 'pagos.transferencia.clabe';
  if (/recordatorio para recoger/.test(mensaje)) return 'tienda.diaRecordatorioRecoger';
  return null;
}
