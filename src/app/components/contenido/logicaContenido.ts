import type { DatosPerfilPublico, DatosPregunta, DatosPromocion, PromocionAdmin } from '../../services/contenido';

/**
 * Validación y cuerpos de Admin > Contenido (sin React, para probarlos). Los mismos límites que el backend
 * (backend-miru src/contenido): título 120, descripción 1000, pregunta 200, respuesta 2000, presentación 600.
 */

export type Errores<K extends string> = Partial<Record<K, string>>;

/** Ruta interna: empieza con una sola "/" (nada de "//otro.sitio"), sin espacios ni barras invertidas. */
const REGEX_ENLACE = /^\/(?![/\\])[^\s\\]*$/;
const REGEX_CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/?#\s]+\/image\/upload\/[^?#\s]+$/;

function texto(valor: string, etiqueta: string, max: number): string | undefined {
  const t = valor.trim();
  if (!t) return `Escribe ${etiqueta}.`;
  if (t.length > max) return `Debe tener como máximo ${max} caracteres.`;
  return undefined;
}

const imagenValida = (url: string) => !url.trim() || REGEX_CLOUDINARY.test(url.trim());
const vacioANulo = (v: string) => v.trim() || null;

// ---------------------------------------------------------------- Promociones

export interface FormPromocion {
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  enlace: string;
  vigenteDesde: string;
  vigenteHasta: string;
  activa: boolean;
  destacada: boolean;
}

export const FORM_PROMOCION_VACIO: FormPromocion = {
  titulo: '',
  descripcion: '',
  imagenUrl: '',
  enlace: '',
  vigenteDesde: '',
  vigenteHasta: '',
  activa: false,
  destacada: false,
};

export function validarPromocion(f: FormPromocion): Errores<keyof FormPromocion> {
  const e: Errores<keyof FormPromocion> = {};
  const titulo = texto(f.titulo, 'el título', 120);
  if (titulo) e.titulo = titulo;
  const descripcion = texto(f.descripcion, 'la descripción', 1000);
  if (descripcion) e.descripcion = descripcion;
  if (!imagenValida(f.imagenUrl)) e.imagenUrl = 'La imagen debe estar subida a Cloudinary del salón (usa "Subir imagen").';
  if (f.enlace.trim() && !REGEX_ENLACE.test(f.enlace.trim())) {
    e.enlace = 'El enlace debe ser una ruta del sitio que empiece con "/" (por ejemplo /cliente/servicios-citas).';
  }
  if (f.vigenteDesde && f.vigenteHasta && f.vigenteDesde > f.vigenteHasta) {
    e.vigenteHasta = 'La fecha de fin debe ser igual o posterior a la fecha de inicio.';
  }
  return e;
}

export function cuerpoPromocion(f: FormPromocion): DatosPromocion {
  return {
    titulo: f.titulo.trim(),
    descripcion: f.descripcion.trim(),
    imagenUrl: vacioANulo(f.imagenUrl),
    enlace: vacioANulo(f.enlace),
    vigenteDesde: f.vigenteDesde || null,
    vigenteHasta: f.vigenteHasta || null,
    activa: f.activa,
    destacada: f.destacada,
  };
}

export function formPromocionDesde(p: PromocionAdmin): FormPromocion {
  return {
    titulo: p.titulo,
    descripcion: p.descripcion,
    imagenUrl: p.imagenUrl ?? '',
    enlace: p.enlace ?? '',
    vigenteDesde: p.vigenteDesde ?? '',
    vigenteHasta: p.vigenteHasta ?? '',
    activa: p.activa,
    destacada: p.destacada,
  };
}

export type EstadoPromocion = 'publicada' | 'programada' | 'vencida' | 'oculta';

/** Qué ve el público hoy (día 'AAAA-MM-DD' en México): las fechas son días completos. */
export function estadoPromocion(p: Pick<PromocionAdmin, 'activa' | 'vigenteDesde' | 'vigenteHasta'>, hoy: string): EstadoPromocion {
  if (!p.activa) return 'oculta';
  if (p.vigenteDesde && hoy < p.vigenteDesde) return 'programada';
  if (p.vigenteHasta && hoy > p.vigenteHasta) return 'vencida';
  return 'publicada';
}

// ---------------------------------------------------------------- Preguntas frecuentes

export interface FormPregunta {
  pregunta: string;
  respuesta: string;
  visible: boolean;
}

export const FORM_PREGUNTA_VACIO: FormPregunta = { pregunta: '', respuesta: '', visible: true };

export function validarPregunta(f: FormPregunta): Errores<keyof FormPregunta> {
  const e: Errores<keyof FormPregunta> = {};
  const pregunta = texto(f.pregunta, 'la pregunta', 200);
  if (pregunta) e.pregunta = pregunta;
  const respuesta = texto(f.respuesta, 'la respuesta', 2000);
  if (respuesta) e.respuesta = respuesta;
  return e;
}

export function cuerpoPregunta(f: FormPregunta): DatosPregunta {
  return { pregunta: f.pregunta.trim(), respuesta: f.respuesta.trim(), visible: f.visible };
}

// ---------------------------------------------------------------- Equipo

export interface FormPerfil {
  mostrarEnSitio: boolean;
  fotoPublica: string;
  bioPublica: string;
}

export const MAX_BIO = 600;

export function validarPerfil(f: FormPerfil): Errores<keyof FormPerfil> {
  const e: Errores<keyof FormPerfil> = {};
  if (!imagenValida(f.fotoPublica)) e.fotoPublica = 'La foto debe estar subida a Cloudinary del salón (usa "Subir foto").';
  if (f.bioPublica.trim().length > MAX_BIO) e.bioPublica = `La presentación debe tener como máximo ${MAX_BIO} caracteres.`;
  return e;
}

export function cuerpoPerfil(f: FormPerfil): DatosPerfilPublico {
  return { mostrarEnSitio: f.mostrarEnSitio, fotoPublica: vacioANulo(f.fotoPublica), bioPublica: vacioANulo(f.bioPublica) };
}
