import type { AutorizacionFotos, CambiosFoto, FotoPanel } from '../../services/galeria';

/**
 * Lógica de Operaciones > Galería (sin React, para probarla): estado y filtros de las fotos, subir y bajar en el
 * orden, y el formulario de cada foto con la regla de publicación del backend (declaración de que no aparece nadie
 * identificable o autorización vigente de la clienta que aparece; las ilustrativas nunca se publican).
 */

export const PERMISOS_GALERIA = ['galeria:lectura', 'galeria:gestionar'] as const;

export const MENSAJE_ELEGIR_PERSONAS =
  'Para publicarla, elige si aparece una clienta identificable (con su autorización) o confirma que no aparece ninguna persona identificable.';
export const MENSAJE_FALTA_AUTORIZACION = 'Para publicarla, busca y elige la autorización vigente de la clienta que aparece.';
export const MENSAJE_ILUSTRATIVA = 'Una imagen ilustrativa no se publica en la galería: solo se muestran fotos reales del salón.';

/** galeria:gestionar o el comodín del admin. La becaria (galeria:lectura) solo ve. */
export function puedeGestionarGaleria(permisos: readonly string[]): boolean {
  return permisos.includes('*') || permisos.includes('galeria:gestionar');
}

export type EstadoFoto = 'visible' | 'oculta' | 'ilustrativa' | 'sin_revisar';
export type FiltroEstado = 'todas' | EstadoFoto;

export const OPCIONES_ESTADO: { value: FiltroEstado; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'visible', label: 'Visibles' },
  { value: 'oculta', label: 'Ocultas' },
  { value: 'ilustrativa', label: 'Ilustrativas' },
  { value: 'sin_revisar', label: 'Sin revisar' },
];

/** Estado principal de una foto para su insignia. "Sin revisar" manda: hay que revisarla antes que nada. */
export function estadoDeFoto(f: Pick<FotoPanel, 'revisada' | 'ilustrativa' | 'visible'>): EstadoFoto {
  if (!f.revisada) return 'sin_revisar';
  if (f.ilustrativa) return 'ilustrativa';
  return f.visible ? 'visible' : 'oculta';
}

/**
 * Filtro de la cuadrícula. `servicioId`: '' todas, 'ninguno' sin servicio, o el id. `estado`: visible y oculta miran
 * solo si se publica; ilustrativa y sin revisar, su marca.
 */
export function filtrarFotos(fotos: FotoPanel[], filtro: { servicioId: string; estado: FiltroEstado }): FotoPanel[] {
  return fotos.filter((f) => {
    if (filtro.servicioId === 'ninguno' && f.servicio) return false;
    if (filtro.servicioId && filtro.servicioId !== 'ninguno' && String(f.servicio?.id ?? '') !== filtro.servicioId) return false;
    switch (filtro.estado) {
      case 'visible':
        return f.visible;
      case 'oculta':
        return !f.visible;
      case 'ilustrativa':
        return f.ilustrativa;
      case 'sin_revisar':
        return !f.revisada;
      default:
        return true;
    }
  });
}

/**
 * Sube (-1) o baja (+1) una foto: la intercambia con su vecina entre las que se ven (`visibles`, con el filtro
 * aplicado) y devuelve el orden completo para mandarlo al backend. null si ya está en el extremo.
 */
export function moverFoto(orden: number[], id: number, direccion: -1 | 1, visibles: number[] = orden): number[] | null {
  const i = visibles.indexOf(id);
  const vecina = visibles[i + direccion];
  if (i < 0 || vecina === undefined) return null;
  const resultado = [...orden];
  const a = resultado.indexOf(id);
  const b = resultado.indexOf(vecina);
  if (a < 0 || b < 0) return null;
  [resultado[a], resultado[b]] = [resultado[b], resultado[a]];
  return resultado;
}

/** ¿Aparece alguien? null: sin elegir (las fotos anteriores sin revisar empiezan así). */
export type Personas = 'ninguna' | 'clienta' | null;

export interface FormularioFoto {
  alt: string;
  /** '' sin servicio. */
  servicioId: string;
  orden: string;
  visible: boolean;
  ilustrativa: boolean;
  personas: Personas;
  autorizacion: AutorizacionFotos | null;
}

export const FORMULARIO_VACIO: FormularioFoto = {
  alt: '',
  servicioId: '',
  orden: '0',
  visible: false,
  ilustrativa: false,
  personas: null,
  autorizacion: null,
};

export const MAX_ALT = 200;

export function errorTextoAlternativo(alt: string): string | null {
  const texto = alt.trim();
  if (!texto) return 'El texto alternativo es obligatorio: describe qué se ve en la foto.';
  if (texto.length > MAX_ALT) return `El texto alternativo debe tener como máximo ${MAX_ALT} caracteres.`;
  return null;
}

/**
 * Por qué no se puede publicar con lo elegido (null: sí se puede). Una foto anterior ya publicada y sin revisar puede
 * seguir así mientras nadie toque su revisión (el backend la conserva igual).
 */
export function explicacionPublicar(form: FormularioFoto, contexto: { yaPublicadaSinRevisar?: boolean } = {}): string | null {
  if (form.ilustrativa) return MENSAJE_ILUSTRATIVA;
  if (form.personas === 'ninguna') return null;
  if (form.personas === 'clienta') return form.autorizacion ? null : MENSAJE_FALTA_AUTORIZACION;
  return contexto.yaPublicadaSinRevisar ? null : MENSAJE_ELEGIR_PERSONAS;
}

/** Formulario con los datos guardados de una foto (la autorización, solo si sigue vigente). */
export function formularioDesdeFoto(f: FotoPanel): FormularioFoto {
  const personas: Personas = f.sinPersonasIdentificables === true ? 'ninguna' : f.sinPersonasIdentificables === false ? 'clienta' : null;
  return {
    alt: f.alt,
    servicioId: f.servicio ? String(f.servicio.id) : '',
    orden: String(f.orden),
    visible: f.visible,
    ilustrativa: f.ilustrativa,
    personas,
    // Una autorización revocada no sirve para publicar: no se precarga y hay que elegir otra.
    autorizacion:
      f.consentimiento?.vigente ? { consentimientoId: f.consentimiento.id, nombre: f.consentimiento.nombre, fecha: f.consentimiento.fecha } : null,
  };
}

/** Cuerpo para crear o editar: la declaración ("no aparece nadie") o la autorización elegida, nunca las dos. */
export function cuerpoFoto(form: FormularioFoto): CambiosFoto {
  const orden = Number.parseInt(form.orden, 10);
  const cuerpo: CambiosFoto = {
    alt: form.alt.trim(),
    servicioId: form.servicioId ? Number(form.servicioId) : null,
    orden: Number.isFinite(orden) && orden >= 0 ? orden : 0,
    visible: form.ilustrativa ? false : form.visible,
    ilustrativa: form.ilustrativa,
  };
  if (form.personas === 'ninguna') cuerpo.sinPersonasIdentificables = true;
  if (form.personas === 'clienta') {
    if (form.autorizacion) cuerpo.consentimientoId = form.autorizacion.consentimientoId;
    else Object.assign(cuerpo, { sinPersonasIdentificables: false, consentimientoId: null });
  }
  return cuerpo;
}
