import { formatearPrecioMXN } from './formatoPrecio';
import { listaMetodosSalon, variablesDeReglas, type ReglasPublicas } from './reglasNegocio';
import { conUnidad, textoSitio, TEXTOS_POR_OMISION, type Variables } from './textosSitio';

/**
 * Forma de pago de una cita (Crear cita, Mis citas): qué opciones del anticipo se ofrecen y los textos de plazo,
 * consecuencias y métodos del salón, todo con las reglas de Admin > Configuración del sitio > Reglas. Los textos salen
 * de Admin > Textos del sitio (`textos` de la configuración pública; sin ellos, los de hoy).
 */

export type OpcionAnticipo = 'linea' | 'salon';
type Textos = Record<string, string>;

/** El precio llega como número o como texto decimal del API ("450.00"). */
type Precio = number | string | null | undefined;
const aNumero = (p: Precio): number => (typeof p === 'number' ? p : p ? Number(p) : 0);

/** Texto del catálogo con las variables de reglas y las de contexto. */
const tx = (textos: Textos, clave: string, reglas: ReglasPublicas | null, contexto: Variables = {}) =>
  textoSitio(textos, clave, { ...(reglas ? { ...reglas.variables, ...variablesDeReglas(reglas) } : {}), ...contexto });

/** Las opciones activas para pagar el anticipo, en el orden en que se muestran. */
export function opcionesAnticipo(reglas: ReglasPublicas): OpcionAnticipo[] {
  const opciones: OpcionAnticipo[] = [];
  if (reglas.pagos.mercadoPagoAnticipos) opciones.push('linea');
  if (reglas.citas.permitirAnticipoEnSalon) opciones.push('salon');
  // El panel no deja apagar las dos; si llegara así, se ofrece en línea y el backend decide.
  return opciones.length ? opciones : ['linea'];
}

/** La opción que se marca al entrar: en línea si está activa. */
export function opcionInicial(reglas: ReglasPublicas): OpcionAnticipo {
  return opcionesAnticipo(reglas)[0];
}

const CLAVE_OPCION: Record<OpcionAnticipo, string> = { linea: 'citas.formaPago.opcionLinea', salon: 'citas.formaPago.opcionSalon' };

/** "Pagar anticipo en línea" / "Pagar anticipo en el salón". */
export function etiquetaOpcion(opcion: OpcionAnticipo, textos: Textos = TEXTOS_POR_OMISION): string {
  return textoSitio(textos, CLAVE_OPCION[opcion]);
}
export const ETIQUETA_OPCION: Record<OpcionAnticipo, string> = { linea: etiquetaOpcion('linea'), salon: etiquetaOpcion('salon') };

/** Plazo y qué pasa si no se paga, según la opción. */
export function plazoDeOpcion(opcion: OpcionAnticipo, reglas: ReglasPublicas, textos: Textos = TEXTOS_POR_OMISION): string {
  const c = reglas.citas;
  if (opcion === 'linea') {
    return tx(textos, 'citas.formaPago.plazoLinea', reglas, { plazoAnticipo: conUnidad(c.plazoAnticipoHoras, 'hora', 'horas') });
  }
  const llegada = c.minutosLlegadaAntes > c.minutosAntesPagoSalon ? `${tx(textos, 'citas.formaPago.llegadaSalon', reglas)} ` : '';
  return `${llegada}${tx(textos, 'citas.formaPago.plazoSalon', reglas)}`;
}

/** Qué pasa con el anticipo si no llega (regla "Si no llega, pierde el anticipo"). */
export function consecuenciaNoAsistir(reglas: ReglasPublicas, textos: Textos = TEXTOS_POR_OMISION): string {
  const meses = reglas.citas.noAsistio.mesesSoloPagoEnLinea;
  const base = tx(textos, reglas.citas.noAsistio.pierdeAnticipo ? 'citas.formaPago.noAsistePierde' : 'citas.formaPago.noAsisteRevisa', reglas);
  return meses > 0 && reglas.pagos.mercadoPagoAnticipos
    ? `${base} ${tx(textos, 'citas.formaPago.soloLineaDespuesFalta', reglas, { mesesSoloLinea: conUnidad(meses, 'mes', 'meses') })}`
    : base;
}

/** Aviso mínimo para cancelar o reagendar (solo si la regla lo pide). */
export function avisoCancelar(reglas: ReglasPublicas, textos: Textos = TEXTOS_POR_OMISION): string | null {
  const h = reglas.citas.horasAvisoCancelarReagendar;
  return h > 0 ? tx(textos, 'citas.formaPago.avisoCancelar', reglas, { horasAviso: conUnidad(h, 'hora', 'horas') }) : null;
}

/** "En el salón puedes pagar con efectivo, tarjeta o transferencia." (o null si no hay métodos activos). */
export function textoMetodosSalon(reglas: ReglasPublicas, textos: Textos = TEXTOS_POR_OMISION): string | null {
  const metodos = reglas.pagos.metodosSalon;
  return metodos.length ? tx(textos, 'citas.formaPago.metodosSalon', reglas, { metodosSalon: listaMetodosSalon(metodos) }) : null;
}

/** Sin anticipo: "Pagas $X en el salón el día de tu cita." */
export function textoSinAnticipo(precio: Precio, textos: Textos = TEXTOS_POR_OMISION): string {
  const n = aNumero(precio);
  return Number.isFinite(n) && n > 0
    ? textoSitio(textos, 'citas.formaPago.sinAnticipoPrecio', { precio: formatearPrecioMXN(n) })
    : textoSitio(textos, 'citas.formaPago.sinAnticipo');
}

/** Lo que queda por pagar en el salón después del anticipo (nunca negativo). */
export function saldoEnSalon(precio: Precio, anticipo: number): number | null {
  const n = aNumero(precio);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0, Math.round((n - anticipo) * 100) / 100);
}

/** Texto del botón de Crear cita según la forma de pago elegida (los de "enviando" son genéricos y se quedan aquí). */
export function textoBotonConfirmar(anticipo: number, opcion: OpcionAnticipo, enviando: false | OpcionAnticipo, textos: Textos = TEXTOS_POR_OMISION): string {
  if (anticipo <= 0) return enviando ? 'Confirmando…' : textoSitio(textos, 'citas.crear.botonConfirmar');
  if (opcion === 'linea') return enviando ? 'Abriendo Mercado Pago…' : textoSitio(textos, 'citas.crear.botonConfirmarLinea');
  return enviando ? 'Apartando…' : textoSitio(textos, 'citas.crear.botonConfirmarSalon');
}
