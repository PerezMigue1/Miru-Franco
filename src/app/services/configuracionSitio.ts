import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/**
 * Configuración del sitio (Admin > Configuración del sitio): la única fuente del contacto, el horario y los textos
 * públicos. Si el API no responde se usan los valores de hoy, que son los mismos de los documentos legales; así nada
 * cambia ni se rompe si el backend falla. Los documentos legales NO leen esta configuración: su texto es una versión
 * registrada y solo cambia con una versión nueva.
 */

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];
export interface HorarioDia {
  dia: DiaSemana;
  cerrado: boolean;
  abre: string;
  cierra: string;
}

export interface DatosSalon {
  nombre: string;
  responsable: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
  whatsapp: string;
  correoContacto: string;
  correoPrivacidad: string;
  mapaUrl: string;
  lema: string;
  descripcionSeo: string;
}
export interface RedesSalon {
  instagram: string;
  facebook: string;
  tiktok: string;
  twitter: string;
}
export interface ContenidoInicio {
  heroTexto: string;
  heroDestacado: string;
  productosDescripcion: string;
  serviciosDescripcion: string;
  trabajoDescripcion: string;
  sobreNosotrosParrafos: string[];
  sobreNosotrosImagen: string;
  cierreTitulo: string;
  cierreTexto: string;
}
export interface ContenidoSobreNosotros {
  titulo: string;
  parrafos: string[];
  imagen: string;
  valores: { titulo: string; descripcion: string }[];
}
export interface ContenidoContacto {
  introduccion: string;
  agendaTexto: string;
}
export interface ConfiguracionPublica {
  salon: DatosSalon;
  redes: RedesSalon;
  horario: { dias: HorarioDia[] };
  contenido: { inicio: ContenidoInicio; sobreNosotros: ContenidoSobreNosotros; contacto: ContenidoContacto };
  /** Sin fecha de inicio de anticipos, el sitio no promete anticipo en ningún lado. */
  anticiposActivos: boolean;
}

const PARRAFO_EQUIPO =
  'En Mirú Franco, nos dedicamos a realzar tu belleza natural con productos y servicios de la más alta calidad. Nuestro equipo de profesionales está comprometido a brindarte una experiencia excepcional en cada visita.';
const PARRAFO_UBICACION =
  'Estamos en Huejutla de Reyes, Hidalgo. Aquí puedes agendar tus servicios en línea, comprar productos profesionales para el cuidado de tu cabello y recogerlos en el salón.';

/** Los valores que hoy publica el sitio (semilla de la migración 20261016130000_configuracion_sitio). */
export const CONFIGURACION_POR_OMISION: ConfiguracionPublica = {
  salon: {
    nombre: 'Mirú Franco Salón Beauty',
    responsable: 'Mildred Rubí Franco Martínez',
    direccion: 'Segunda Cerrada de Allende No. 15, Col. Juárez',
    ciudad: 'Huejutla de Reyes, Hidalgo',
    codigoPostal: '43000',
    telefono: '+52 771 268 1432',
    whatsapp: '+52 771 186 7645',
    correoContacto: 'contacto@mirufranco.com',
    correoPrivacidad: 'mildredfranco24@gmail.com',
    mapaUrl: '',
    lema: 'Salón de belleza profesional dedicado a realzar tu belleza natural con productos y servicios de alta calidad.',
    descripcionSeo:
      'Salón de belleza profesional en Huejutla de Reyes. Cortes, coloración, tratamientos capilares, alaciado y nanoplastía. Agenda tu cita en línea.',
  },
  redes: { instagram: '', facebook: '', tiktok: '', twitter: '' },
  horario: {
    dias: [
      { dia: 'lunes', cerrado: false, abre: '09:30', cierra: '19:30' },
      { dia: 'martes', cerrado: false, abre: '09:30', cierra: '19:30' },
      { dia: 'miercoles', cerrado: false, abre: '09:30', cierra: '19:30' },
      { dia: 'jueves', cerrado: false, abre: '09:30', cierra: '19:30' },
      { dia: 'viernes', cerrado: false, abre: '09:30', cierra: '19:30' },
      { dia: 'sabado', cerrado: false, abre: '09:30', cierra: '19:00' },
      { dia: 'domingo', cerrado: true, abre: '', cierra: '' },
    ],
  },
  contenido: {
    inicio: {
      heroTexto: 'Realza tu belleza natural con productos y servicios profesionales. Agenda tu cita y descubre la experiencia Mirú Franco.',
      heroDestacado: 'Brillo que se nota',
      productosDescripcion: 'Lo que usamos en el salón, para que lo sigas en casa.',
      serviciosDescripcion: 'Nuestra carta: elige un servicio para ver qué incluye y reservar tu horario.',
      trabajoDescripcion: 'Fotos de servicios hechos en el salón. Tócalas para verlas en grande.',
      sobreNosotrosParrafos: [PARRAFO_EQUIPO, PARRAFO_UBICACION],
      sobreNosotrosImagen: '',
      cierreTitulo: '¿Lista para tu cambio de look?',
      cierreTexto: 'Agenda una cita con nosotros y descubre la diferencia que hace la calidad profesional.',
    },
    sobreNosotros: {
      titulo: 'Pasión por la belleza natural',
      parrafos: [
        PARRAFO_EQUIPO,
        PARRAFO_UBICACION,
        'Cada cliente es único, y por eso diseñamos un plan de cuidado personalizado para adaptarnos a tus necesidades específicas, tu tipo de cabello y tus preferencias de estilo.',
      ],
      imagen: '',
      valores: [
        { titulo: 'Profesionalismo', descripcion: 'Cada servicio se ejecuta con técnica depurada y productos de primera calidad.' },
        { titulo: 'Calidez', descripcion: 'Te recibimos con atención personalizada desde el primer momento.' },
        { titulo: 'Innovación', descripcion: 'Combinamos técnicas tradicionales con las últimas tendencias del mundo capilar.' },
        { titulo: 'Confianza', descripcion: 'Construimos relaciones duraderas basadas en resultados reales y honestos.' },
      ],
    },
    contacto: {
      introduccion: 'Agenda una cita, resuelve tus dudas o simplemente escríbenos. Estaremos encantados de atenderte.',
      agendaTexto: 'Elige el servicio, la fecha y la hora que prefieras. Si el servicio pide anticipo, tu cita se confirma al pagarlo.',
    },
  },
  anticiposActivos: false,
};

const esTexto = (v: unknown): v is string => typeof v === 'string';
const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Cada campo del API que no es del tipo esperado se reemplaza por el valor por omisión. */
function mezclar<T extends object>(base: T, dato: unknown): T {
  if (!esObjeto(dato)) return base;
  const salida = { ...base } as Record<string, unknown>;
  for (const [k, def] of Object.entries(base)) {
    const v = dato[k];
    if (Array.isArray(def)) {
      // Una lista vacía también vale: la dueña pudo quitar todos los elementos a propósito.
      if (Array.isArray(v) && v.every((x) => (esTexto(def[0]) ? esTexto(x) : esObjeto(x)))) salida[k] = v;
    } else if (esTexto(def)) {
      if (esTexto(v)) salida[k] = v;
    } else if (esObjeto(def)) {
      salida[k] = mezclar(def, v);
    }
  }
  return salida as T;
}

function horarioValido(dias: unknown): dias is HorarioDia[] {
  return (
    Array.isArray(dias) &&
    dias.length === DIAS_SEMANA.length &&
    dias.every((d, i) => esObjeto(d) && d.dia === DIAS_SEMANA[i] && typeof d.cerrado === 'boolean' && esTexto(d.abre) && esTexto(d.cierra))
  );
}

export function normalizarConfiguracion(dato: unknown): ConfiguracionPublica {
  const d = esObjeto(dato) ? dato : {};
  const contenido = esObjeto(d.contenido) ? d.contenido : {};
  const horario = esObjeto(d.horario) ? d.horario.dias : undefined;
  const base = CONFIGURACION_POR_OMISION;
  return {
    salon: mezclar(base.salon, d.salon),
    redes: mezclar(base.redes, d.redes),
    horario: { dias: horarioValido(horario) ? horario : base.horario.dias },
    contenido: {
      inicio: mezclar(base.contenido.inicio, contenido.inicio),
      sobreNosotros: mezclar(base.contenido.sobreNosotros, contenido.sobreNosotros),
      contacto: mezclar(base.contenido.contacto, contenido.contacto),
    },
    anticiposActivos: d.anticiposActivos === true,
  };
}

/** Para componentes de servidor: revalida cada 60 s, así lo que guarda la dueña se ve sin deploy. Nunca lanza. */
export async function obtenerConfiguracionPublica(): Promise<ConfiguracionPublica> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/configuracion-publica`, { next: { revalidate: 60 } } as RequestInit);
    if (!res.ok) return CONFIGURACION_POR_OMISION;
    return normalizarConfiguracion(await res.json());
  } catch {
    return CONFIGURACION_POR_OMISION;
  }
}

/** Para componentes de cliente (el pie): una petición por minuto y por pestaña. */
let enCache: { valor: ConfiguracionPublica; hasta: number } | null = null;
export async function cargarConfiguracionPublicaCliente(ahora: number = Date.now()): Promise<ConfiguracionPublica> {
  if (enCache && ahora < enCache.hasta) return enCache.valor;
  const valor = await obtenerConfiguracionPublica();
  enCache = { valor, hasta: ahora + 60_000 };
  return valor;
}

/** "Calle, colonia, ciudad, C.P. 00000". */
export function domicilioCompleto(s: Pick<DatosSalon, 'direccion' | 'ciudad' | 'codigoPostal'>): string {
  return [s.direccion, s.ciudad, s.codigoPostal ? `C.P. ${s.codigoPostal}` : ''].filter(Boolean).join(', ');
}

const soloDigitos = (t: string) => t.replace(/\D/g, '');
export function enlaceTelefono(telefono: string): string | null {
  const d = soloDigitos(telefono);
  if (d.length < 10) return null;
  return `tel:+${d.length === 10 ? `52${d}` : d}`;
}
export function enlaceWhatsApp(telefono: string): string | null {
  const d = soloDigitos(telefono);
  if (d.length < 10) return null;
  return `https://wa.me/${d.length === 10 ? `52${d}` : d}`;
}

const NOMBRE_DIA: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábados',
  domingo: 'Domingos',
};
const hora = (h: string) => h.replace(/^0(\d)/, '$1');

/** "Lunes a viernes de 9:30 a 19:30 h.", "Sábados de 9:30 a 19:00 h.", "Domingos cerrado.": agrupa los días seguidos iguales. */
export function frasesHorario(dias: HorarioDia[]): string[] {
  const grupos: HorarioDia[][] = [];
  for (const d of dias) {
    const ultimo = grupos.at(-1);
    const igual = ultimo && ultimo[0].cerrado === d.cerrado && (d.cerrado || (ultimo[0].abre === d.abre && ultimo[0].cierra === d.cierra));
    if (igual) ultimo.push(d);
    else grupos.push([d]);
  }
  return grupos.map((g) => {
    const primero = NOMBRE_DIA[g[0].dia];
    const ultimo = NOMBRE_DIA[g[g.length - 1].dia].toLowerCase();
    const dias = g.length === 1 ? primero : g.length === 2 ? `${primero} y ${ultimo}` : `${primero} a ${ultimo}`;
    return g[0].cerrado ? `${dias} cerrado.` : `${dias} de ${hora(g[0].abre)} a ${hora(g[0].cierra)} h.`;
  });
}

// --- Admin > Configuración del sitio ---

export type SeccionConfiguracion = 'salon' | 'redes' | 'horario' | 'contenido_inicio' | 'contenido_sobre_nosotros' | 'contenido_contacto' | 'reglas';
export interface EntradaHistorial {
  id: number;
  clave: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
  creadoEn: string;
  actualizadoPor: string | null;
  afectaDocumentosLegales: boolean;
}
export interface ConfiguracionAdmin {
  data: Partial<Record<SeccionConfiguracion, { valor: unknown; actualizadoEn: string; actualizadoPor: string | null }>>;
  camposEnDocumentosLegales: Record<string, string[]>;
  anticiposDesdeRespaldo: string | null;
}
export interface PermisosPorRol {
  catalogo: { clave: string; descripcion: string; grupo: string }[];
  roles: { rol: string; editable: boolean; claves: string[] }[];
}

const BASE = () => getBackendBaseUrl();

export function obtenerConfiguracionAdmin(): Promise<ConfiguracionAdmin> {
  return apiClient.get<ConfiguracionAdmin>('/api/configuracion-sitio', BASE());
}
export function guardarSeccionConfiguracion(clave: SeccionConfiguracion, valor: unknown): Promise<{ afectaDocumentosLegales: boolean }> {
  return apiClient.put<{ afectaDocumentosLegales: boolean }>(`/api/configuracion-sitio/${clave}`, { valor }, BASE());
}
export async function obtenerHistorialConfiguracion(clave?: string): Promise<EntradaHistorial[]> {
  const r = await apiClient.get<{ data?: EntradaHistorial[] }>(`/api/configuracion-sitio/historial${clave ? `?clave=${encodeURIComponent(clave)}` : ''}`, BASE());
  return Array.isArray(r?.data) ? r.data : [];
}
export function obtenerPermisosPorRol(): Promise<PermisosPorRol> {
  return apiClient.get<PermisosPorRol>('/api/configuracion-sitio/permisos', BASE());
}
export function guardarPermisosDeRol(rol: string, claves: string[]): Promise<unknown> {
  return apiClient.put<unknown>(`/api/configuracion-sitio/permisos/${encodeURIComponent(rol)}`, { claves }, BASE());
}

// Lecturas de la pantalla de Admin > Configuración del sitio: un 403 se muestra en la misma pantalla en vez de ir a /403.
const EN_PANTALLA = () => ({ customBase: BASE(), skip403Redirect: true });

export function obtenerConfiguracionAdminEnPantalla(): Promise<ConfiguracionAdmin> {
  return apiClient.get<ConfiguracionAdmin>('/api/configuracion-sitio', EN_PANTALLA());
}
export function obtenerPermisosPorRolEnPantalla(): Promise<PermisosPorRol> {
  return apiClient.get<PermisosPorRol>('/api/configuracion-sitio/permisos', EN_PANTALLA());
}
export async function obtenerHistorialEnPantalla(clave: string): Promise<EntradaHistorial[]> {
  const r = await apiClient.get<{ data?: EntradaHistorial[] }>(`/api/configuracion-sitio/historial?clave=${encodeURIComponent(clave)}`, EN_PANTALLA());
  return Array.isArray(r?.data) ? r.data : [];
}
