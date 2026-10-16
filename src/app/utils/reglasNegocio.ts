/**
 * Reglas de negocio que publica el backend (GET /api/configuracion-publica, campo `reglas`): plazos de citas y de la
 * tienda, métodos de pago activos, días inhábiles y las variables ya llenas para los textos ({plazoAnticipoHoras}...).
 * La dueña las cambia en Admin > Configuración del sitio > Reglas. Los valores por omisión son los de hoy y solo se
 * usan si el backend no responde.
 */

export type MetodoSalon = 'efectivo' | 'tarjeta' | 'transferencia';

/** Qué es cada regla (definicionesReglas de GET /api/configuracion-sitio): el panel arma sus campos con esto. */
export interface DefinicionRegla {
  /** Ruta dentro de las reglas, por ejemplo 'citas.plazoAnticipoHoras'. */
  ruta: string;
  grupo: string;
  etiqueta: string;
  /** Qué afecta: se muestra debajo del campo. */
  afecta: string;
  tipo: 'entero' | 'booleano' | 'texto' | 'fecha' | 'horas' | 'dias-inhabiles';
  unidad?: string;
  min?: number;
  max?: number;
  /** El mínimo lo fija la ley: el panel no deja bajarlo. */
  minimoLegal?: boolean;
  opciones?: number[];
  maxLargo?: number;
}

export interface DiaInhabil {
  fecha: string;
  motivo: string;
}

export interface ReglasPublicas {
  citas: {
    plazoAnticipoHoras: number;
    minutosAntesPagoSalon: number;
    minutosLlegadaAntes: number;
    toleranciaLlegadaMinutos: number;
    porcentajeAnticipoSugerido: number;
    horasAvisoCancelarReagendar: number;
    noAsistio: { pierdeAnticipo: boolean; mesesSoloPagoEnLinea: number };
    maxCitasPorPagarEnSalon: number;
    permitirAnticipoEnSalon: boolean;
    intervaloHorariosMinutos: number;
    recordatoriosHorasAntes: number[];
    diasHabilesExcepcionAnticipo: number;
    diasHabilesCancelarConReembolso: number;
  };
  tienda: {
    plazoPagoLineaHoras: number;
    diasPrepararApartado: number;
    diaRecordatorioRecoger: number;
    diasCancelarNoRecogido: number;
    diasResguardoPagado: number;
    tiempoPreparacionTexto: string;
    diasCambioProducto: number;
  };
  revocacion: { diasHabiles: number };
  garantia: { diasServicio: number };
  facturacion: { plazoTexto: string };
  arco: { diasHabilesRespuesta: number; diasHabilesEfectividad: number; diasAvisoVencePronto: number };
  pagos: {
    mercadoPagoTienda: boolean;
    mercadoPagoAnticipos: boolean;
    metodosSalon: MetodoSalon[];
    /** Solo si la transferencia está activa y sus datos completos. */
    transferencia: { banco: string; titular: string; clabe: string } | null;
  };
  diasInhabiles: DiaInhabil[];
  /** Variables para los textos, ya con el valor vigente ("2", "15"...). */
  variables: Record<string, string>;
}

/** Los valores de hoy (semilla de la migración 20261017120000_reglas_negocio). */
export const REGLAS_PUBLICAS_POR_OMISION: ReglasPublicas = {
  citas: {
    plazoAnticipoHoras: 2,
    minutosAntesPagoSalon: 15,
    minutosLlegadaAntes: 20,
    toleranciaLlegadaMinutos: 15,
    porcentajeAnticipoSugerido: 0,
    horasAvisoCancelarReagendar: 0,
    noAsistio: { pierdeAnticipo: true, mesesSoloPagoEnLinea: 6 },
    maxCitasPorPagarEnSalon: 1,
    permitirAnticipoEnSalon: true,
    intervaloHorariosMinutos: 30,
    recordatoriosHorasAntes: [24, 1],
    diasHabilesExcepcionAnticipo: 10,
    diasHabilesCancelarConReembolso: 5,
  },
  tienda: {
    plazoPagoLineaHoras: 24,
    diasPrepararApartado: 3,
    diaRecordatorioRecoger: 3,
    diasCancelarNoRecogido: 7,
    diasResguardoPagado: 15,
    tiempoPreparacionTexto: 'Suele estar listo en 24 a 48 horas hábiles',
    diasCambioProducto: 7,
  },
  revocacion: { diasHabiles: 5 },
  garantia: { diasServicio: 7 },
  facturacion: { plazoTexto: 'dentro del mismo mes de tu compra o servicio' },
  arco: { diasHabilesRespuesta: 20, diasHabilesEfectividad: 15, diasAvisoVencePronto: 5 },
  pagos: { mercadoPagoTienda: true, mercadoPagoAnticipos: true, metodosSalon: ['efectivo', 'tarjeta', 'transferencia'], transferencia: null },
  diasInhabiles: [],
  variables: {},
};

/** Variables de los textos calculadas con las reglas (las mismas que arma el backend en variablesDeReglas). */
export function variablesDeReglas(r: ReglasPublicas): Record<string, string> {
  return {
    plazoAnticipoHoras: String(r.citas.plazoAnticipoHoras),
    minutosAntesPagoSalon: String(r.citas.minutosAntesPagoSalon),
    minutosLlegadaAntes: String(r.citas.minutosLlegadaAntes),
    toleranciaLlegadaMinutos: String(r.citas.toleranciaLlegadaMinutos),
    horasAvisoCancelarReagendar: String(r.citas.horasAvisoCancelarReagendar),
    mesesSoloPagoEnLinea: String(r.citas.noAsistio.mesesSoloPagoEnLinea),
    diasHabilesExcepcionAnticipo: String(r.citas.diasHabilesExcepcionAnticipo),
    diasHabilesCancelarConReembolso: String(r.citas.diasHabilesCancelarConReembolso),
    plazoPagoLineaHoras: String(r.tienda.plazoPagoLineaHoras),
    diasPrepararApartado: String(r.tienda.diasPrepararApartado),
    diaRecordatorioRecoger: String(r.tienda.diaRecordatorioRecoger),
    diasCancelarNoRecogido: String(r.tienda.diasCancelarNoRecogido),
    diasRestantesRecoger: String(r.tienda.diasCancelarNoRecogido - r.tienda.diaRecordatorioRecoger),
    diasResguardo: String(r.tienda.diasResguardoPagado),
    tiempoPreparacion: r.tienda.tiempoPreparacionTexto,
    diasCambioProducto: String(r.tienda.diasCambioProducto),
    diasHabilesRevocacion: String(r.revocacion.diasHabiles),
    diasGarantia: String(r.garantia.diasServicio),
    plazoFactura: r.facturacion.plazoTexto,
    diasHabilesArcoRespuesta: String(r.arco.diasHabilesRespuesta),
    diasHabilesArcoEfectividad: String(r.arco.diasHabilesEfectividad),
  };
}
REGLAS_PUBLICAS_POR_OMISION.variables = variablesDeReglas(REGLAS_PUBLICAS_POR_OMISION);

const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const METODOS: readonly MetodoSalon[] = ['efectivo', 'tarjeta', 'transferencia'];

/** Cada valor que falta o no es del tipo esperado toma el de hoy (misma idea que normalizarConfiguracion). */
function mezclar<T>(base: T, dato: unknown): T {
  if (!esObjeto(dato) || !esObjeto(base)) return base;
  const salida: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, def] of Object.entries(base as Record<string, unknown>)) {
    const v = dato[k];
    if (typeof def === 'number') salida[k] = typeof v === 'number' && Number.isFinite(v) ? v : def;
    else if (typeof def === 'boolean') salida[k] = typeof v === 'boolean' ? v : def;
    else if (typeof def === 'string') salida[k] = typeof v === 'string' ? v : def;
    else if (Array.isArray(def)) salida[k] = Array.isArray(v) && v.every((x) => typeof x === 'number') ? v : def;
    else if (esObjeto(def)) salida[k] = mezclar(def, v);
  }
  return salida as T;
}

export function normalizarReglasPublicas(dato: unknown): ReglasPublicas {
  const base = REGLAS_PUBLICAS_POR_OMISION;
  if (!esObjeto(dato)) return base;
  const pagos = esObjeto(dato.pagos) ? dato.pagos : {};
  const t = pagos.transferencia;
  const transferencia =
    esObjeto(t) && typeof t.banco === 'string' && typeof t.titular === 'string' && typeof t.clabe === 'string' && t.banco && t.titular && t.clabe
      ? { banco: t.banco, titular: t.titular, clabe: t.clabe }
      : null;
  const reglas: ReglasPublicas = {
    citas: mezclar(base.citas, dato.citas),
    tienda: mezclar(base.tienda, dato.tienda),
    revocacion: mezclar(base.revocacion, dato.revocacion),
    garantia: mezclar(base.garantia, dato.garantia),
    facturacion: mezclar(base.facturacion, dato.facturacion),
    arco: mezclar(base.arco, dato.arco),
    pagos: {
      mercadoPagoTienda: typeof pagos.mercadoPagoTienda === 'boolean' ? pagos.mercadoPagoTienda : base.pagos.mercadoPagoTienda,
      mercadoPagoAnticipos: typeof pagos.mercadoPagoAnticipos === 'boolean' ? pagos.mercadoPagoAnticipos : base.pagos.mercadoPagoAnticipos,
      metodosSalon: Array.isArray(pagos.metodosSalon)
        ? METODOS.filter((m) => (pagos.metodosSalon as unknown[]).includes(m))
        : base.pagos.metodosSalon,
      transferencia,
    },
    diasInhabiles: Array.isArray(dato.diasInhabiles)
      ? dato.diasInhabiles.filter((d): d is DiaInhabil => esObjeto(d) && typeof d.fecha === 'string' && typeof d.motivo === 'string')
      : base.diasInhabiles,
    variables: {},
  };
  // Las variables del backend mandan; las que falten se calculan aquí con las mismas reglas.
  const servidor = esObjeto(dato.variables) ? dato.variables : {};
  reglas.variables = {
    ...variablesDeReglas(reglas),
    ...Object.fromEntries(Object.entries(servidor).filter((e): e is [string, string] => typeof e[1] === 'string')),
  };
  return reglas;
}

/** "Te esperamos {minutosLlegadaAntes} minutos antes" con las variables llenas. Una variable desconocida se queda tal cual. */
export function llenarVariables(texto: string, variables: Record<string, string>): string {
  return texto.replace(/\{([a-zA-Z]+)\}/g, (todo, nombre: string) => (nombre in variables ? variables[nombre] : todo));
}

export const ETIQUETA_METODO_SALON: Record<MetodoSalon, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

/** "efectivo, tarjeta o transferencia" (en minúsculas, para una oración). */
export function listaMetodosSalon(metodos: MetodoSalon[]): string {
  const n = metodos.map((m) => ETIQUETA_METODO_SALON[m].toLowerCase());
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} o ${n[n.length - 1]}`;
}
