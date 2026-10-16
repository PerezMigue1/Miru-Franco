import {
  CONFIGURACION_POR_OMISION,
  DIAS_SEMANA,
  type HorarioDia,
  type SeccionConfiguracion,
} from '../../../services/configuracionSitio';
import { formatearFechaSoloDia } from '../../../utils/fechaSoloDia';
import { PLAZOS_TERMINOS } from '../../../utils/terminosCondiciones';
import { CAMPOS_CONTACTO, CAMPOS_INICIO, CAMPOS_REDES, CAMPOS_SALON, CAMPOS_SOBRE_NOSOTROS, type DefCampo } from './validacionConfiguracion';

/**
 * Lógica pura de Admin > Configuración del sitio: valor inicial de cada sección, qué cambió entre dos
 * valores (para la confirmación y el historial), permisos agregados y quitados, y los textos de las reglas.
 */

export const REGLAS_POR_OMISION = { anticiposDesde: null as string | null };

const POR_OMISION: Record<SeccionConfiguracion, unknown> = {
  salon: CONFIGURACION_POR_OMISION.salon,
  redes: CONFIGURACION_POR_OMISION.redes,
  horario: CONFIGURACION_POR_OMISION.horario,
  contenido_inicio: CONFIGURACION_POR_OMISION.contenido.inicio,
  contenido_sobre_nosotros: CONFIGURACION_POR_OMISION.contenido.sobreNosotros,
  contenido_contacto: CONFIGURACION_POR_OMISION.contenido.contacto,
  reglas: REGLAS_POR_OMISION,
};

const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Lo guardado sobre los valores de hoy: cada campo que falta o no es del tipo esperado toma el valor por omisión. */
export function valorInicial(clave: SeccionConfiguracion, dato: unknown): unknown {
  const base = POR_OMISION[clave] as Record<string, unknown>;
  if (!esObjeto(dato)) return structuredClone(base);
  if (clave === 'reglas') {
    // Las demás reglas se conservan tal cual (el editor las arma con definicionesReglas del backend).
    const f = dato.anticiposDesde;
    return { ...structuredClone(dato), anticiposDesde: typeof f === 'string' && f ? f : null };
  }
  const salida: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(base)) {
    const v = dato[k];
    if (Array.isArray(def)) salida[k] = Array.isArray(v) ? structuredClone(v) : structuredClone(def);
    else if (typeof def === 'string') salida[k] = typeof v === 'string' ? v : def;
    else salida[k] = structuredClone(v ?? def);
  }
  return salida;
}

export interface Cambio {
  campo: string;
  antes: string;
  despues: string;
}

const VACIO = '(vacío)';
const SIN_DATO = '(sin dato)';
const NO_EXISTE = '(no existe)';

const textoDe = (v: unknown): string => {
  if (v === undefined || v === null) return SIN_DATO;
  if (typeof v === 'string') return v.trim() ? v : VACIO;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return JSON.stringify(v);
};

const hora = (h: string) => h.replace(/^0(\d)/, '$1');
const NOMBRE_DIA: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};
export const nombreDia = (dia: string) => NOMBRE_DIA[dia] ?? dia;
const textoDia = (d: Partial<HorarioDia> | undefined) => {
  if (!d) return SIN_DATO;
  return d.cerrado ? 'Cerrado' : `${hora(d.abre ?? '')} a ${hora(d.cierra ?? '')} h`;
};

export const fechaLarga = (f: string) => formatearFechaSoloDia(`${f}T12:00:00Z`, { day: 'numeric', month: 'long', year: 'numeric' }) ?? f;

const TITULOS: Partial<Record<SeccionConfiguracion, Record<string, DefCampo>>> = {
  salon: CAMPOS_SALON,
  redes: CAMPOS_REDES,
  contenido_inicio: CAMPOS_INICIO,
  contenido_sobre_nosotros: CAMPOS_SOBRE_NOSOTROS,
  contenido_contacto: CAMPOS_CONTACTO,
};

function cambiosDeLista(anterior: unknown, nuevo: unknown, nombre: string, aTexto: (x: unknown) => string): Cambio[] {
  const a = Array.isArray(anterior) ? anterior : [];
  const n = Array.isArray(nuevo) ? nuevo : [];
  const cambios: Cambio[] = [];
  for (let i = 0; i < Math.max(a.length, n.length); i++) {
    const antes = i < a.length ? aTexto(a[i]) : NO_EXISTE;
    const despues = i < n.length ? aTexto(n[i]) : NO_EXISTE;
    if (antes !== despues) cambios.push({ campo: `${nombre} ${i + 1}`, antes, despues });
  }
  return cambios;
}

const textoValor = (x: unknown) => {
  const v = (x ?? {}) as { titulo?: string; descripcion?: string };
  return `${v.titulo ?? ''}: ${v.descripcion ?? ''}`;
};

/** Cambios campo por campo entre dos valores de una sección (valor anterior null: primera vez que se guarda). */
export function cambiosDeSeccion(clave: SeccionConfiguracion, anterior: unknown, nuevo: unknown): Cambio[] {
  const a = esObjeto(anterior) ? anterior : {};
  const n = esObjeto(nuevo) ? nuevo : {};

  if (clave === 'horario') {
    const da = Array.isArray(a.dias) ? (a.dias as HorarioDia[]) : [];
    const dn = Array.isArray(n.dias) ? (n.dias as HorarioDia[]) : [];
    return DIAS_SEMANA.flatMap((dia) => {
      const antes = textoDia(da.find((d) => d.dia === dia));
      const despues = textoDia(dn.find((d) => d.dia === dia));
      return antes === despues ? [] : [{ campo: nombreDia(dia), antes, despues }];
    });
  }

  if (clave === 'reglas') {
    const t = (v: unknown) => (typeof v === 'string' && v ? fechaLarga(v) : 'Variable del servidor');
    const antes = t(a.anticiposDesde);
    const despues = t(n.anticiposDesde);
    return antes === despues ? [] : [{ campo: 'Inicio de los anticipos', antes, despues }];
  }

  const titulos = TITULOS[clave] ?? {};
  const llaves = [...new Set([...Object.keys(titulos), ...Object.keys(n)])];
  const cambios: Cambio[] = [];
  for (const k of llaves) {
    if (k === 'sobreNosotrosParrafos' || k === 'parrafos') {
      cambios.push(...cambiosDeLista(a[k], n[k], 'Párrafo', (x) => textoDe(x)));
    } else if (k === 'valores') {
      cambios.push(...cambiosDeLista(a[k], n[k], 'Valor', textoValor));
    } else {
      const antes = textoDe(a[k]);
      const despues = textoDe(n[k]);
      if (antes !== despues) cambios.push({ campo: titulos[k]?.titulo ?? k, antes, despues });
    }
  }
  return cambios;
}

export interface PermisoCatalogo {
  clave: string;
  descripcion: string;
  grupo: string;
}

/** Claves de permiso agregadas y quitadas, con la descripción del catálogo. */
export function cambiosDePermisos(anterior: unknown, nuevo: unknown, catalogo: PermisoCatalogo[]) {
  const a = Array.isArray(anterior) ? (anterior as string[]) : [];
  const n = Array.isArray(nuevo) ? (nuevo as string[]) : [];
  const describir = (clave: string) => ({ clave, descripcion: catalogo.find((c) => c.clave === clave)?.descripcion ?? clave });
  return {
    agregadas: n.filter((c) => !a.includes(c)).map(describir),
    quitadas: a.filter((c) => !n.includes(c)).map(describir),
  };
}

export function alternarClave(claves: string[], clave: string, marcado: boolean): string[] {
  if (marcado) return claves.includes(clave) ? claves : [...claves, clave];
  return claves.filter((c) => c !== clave);
}

/** Mueve el elemento i una posición (delta -1 arriba, +1 abajo); fuera de rango no cambia nada. */
export function mover<T>(lista: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

export const quitar = <T,>(lista: T[], i: number): T[] => lista.filter((_, k) => k !== i);

/** ¿Este campo también está escrito en los documentos legales? (camposEnDocumentosLegales del backend). */
export function esCampoLegal(campos: Record<string, string[]> | undefined, clave: string, campo: string): boolean {
  return Boolean(campos?.[clave]?.includes(campo));
}

export const AVISO_CAMPO_LEGAL = 'Este dato también aparece en los documentos legales.';
export const AVISO_DOCUMENTOS_LEGALES =
  'Cambiaste datos que también aparecen en los documentos legales. Los documentos legales publicados no cambian solos: para que coincidan, hay que publicar una versión nueva de ellos.';
export const NOTA_PLAZOS_TERMINOS = 'Forman parte de los Términos y Condiciones: cambian con una versión nueva de los términos.';

/** Qué pasa con los anticipos según la fecha propia y la variable del servidor (respaldo). */
export function explicacionAnticipos(fecha: string | null, respaldo: string | null): string {
  if (fecha) {
    return `Desde el ${fechaLarga(fecha)}, los servicios que tienen anticipo lo piden al agendar en línea. Esta fecha manda sobre la variable del servidor.`;
  }
  if (respaldo) {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(respaldo) ? fechaLarga(respaldo) : respaldo;
    return `Se usa la variable del servidor: los anticipos se piden desde el ${f}.`;
  }
  return 'No hay fecha propia ni variable del servidor: el sitio no pide ni promete anticipos al agendar.';
}

export const PLAZOS_SOLO_LECTURA: { etiqueta: string; valor: string }[] = [
  { etiqueta: 'Tiempo para pagar el anticipo de una cita agendada en línea', valor: `${PLAZOS_TERMINOS.horasAnticipoCita} horas` },
  { etiqueta: 'Vencimiento del anticipo (pago en línea y en el salón)', valor: `${PLAZOS_TERMINOS.minutosAntesPagoSalon} minutos antes de la cita` },
  { etiqueta: 'Llegada para pagar el anticipo en el salón', valor: `desde ${PLAZOS_TERMINOS.minutosLlegadaSalon} minutos antes de la cita` },
  { etiqueta: 'Tolerancia para llegar a la cita', valor: `${PLAZOS_TERMINOS.minutosToleranciaCita} minutos` },
  { etiqueta: 'Solo pago en línea tras no pagar un anticipo apartado para el salón', valor: `${PLAZOS_TERMINOS.mesesSoloPagoEnLinea} meses` },
  { etiqueta: 'Garantía de un servicio', valor: `${PLAZOS_TERMINOS.diasGarantiaServicio} días` },
  { etiqueta: 'Pago en línea de un pedido', valor: `${PLAZOS_TERMINOS.horasPagoEnLinea} horas` },
  { etiqueta: 'Cambio de un producto después de recogerlo', valor: `${PLAZOS_TERMINOS.diasCambioProducto} días naturales` },
  { etiqueta: 'Resguardo de un pedido pagado listo para recoger', valor: `${PLAZOS_TERMINOS.diasResguardoPedidoPagado} días` },
];
