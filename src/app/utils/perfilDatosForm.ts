import type { ActualizarMiPerfilPayload, PerfilUsuarioCompleto, TipoCabelloValor } from '../services/perfil';
import { sanitizarEntradaTelefono10 } from './phone';
import { requiereConsentimiento } from './consentimientoDatosSensibles';

/** Valores del formulario "Información personal" del perfil de la clienta (PerfilDatosForm). */
export interface ValoresPerfil {
  nombre: string;
  telefono: string;
  fechaNacimiento: string;
  tipoCabello: string;
  colorNatural: string;
  colorActual: string;
  productosUsados: string;
  alergias: string;
  /** Consentimiento expreso para datos de salud: se pide en cada guardado con alergias y no se guarda. */
  consienteDatosSensibles: boolean;
  aceptaAvisoPrivacidad: boolean;
  recibePromociones: boolean;
}

export const VALORES_PERFIL_VACIOS: ValoresPerfil = {
  nombre: '', telefono: '', fechaNacimiento: '', tipoCabello: '',
  colorNatural: '', colorActual: '', productosUsados: '', alergias: '', consienteDatosSensibles: false,
  aceptaAvisoPrivacidad: false, recibePromociones: false,
};

/** Valores con los que se precarga el formulario a partir del perfil que devuelve GET /api/auth/me. */
export function valoresDesdePerfil(p: PerfilUsuarioCompleto): ValoresPerfil {
  return {
    nombre: p.nombre || '',
    telefono: sanitizarEntradaTelefono10(p.telefono || ''),
    fechaNacimiento: p.fechaNacimiento?.slice(0, 10) || '',
    tipoCabello: p.tipoCabello || '',
    colorNatural: p.colorNatural || '',
    colorActual: p.colorActual || '',
    productosUsados: p.productosUsados || '',
    alergias: p.alergias || '',
    consienteDatosSensibles: false,
    aceptaAvisoPrivacidad: p.aceptaAvisoPrivacidad === true,
    recibePromociones: p.recibePromociones === true,
  };
}

/**
 * Si los campos y el botón de guardar se pueden usar. Sin perfil cargado (getMiPerfil falló) el formulario
 * tiene los valores vacíos de inicio: habilitarlo permitiría guardar y borrar alergias, teléfono, etc.
 */
export function formularioPerfilHabilitado(estado: {
  cargando: boolean;
  enviando: boolean;
  perfil: PerfilUsuarioCompleto | null;
}): boolean {
  return !estado.cargando && !estado.enviando && estado.perfil != null;
}

/** Cuerpo de PATCH /api/auth/me a partir del formulario, o null si no se debe guardar (perfil sin cargar). */
export function cuerpoGuardarPerfil(
  perfil: PerfilUsuarioCompleto | null,
  values: ValoresPerfil,
): ActualizarMiPerfilPayload | null {
  if (!perfil) return null;
  const tc = values.tipoCabello as TipoCabelloValor | '';
  return {
    nombre: values.nombre.trim() || perfil.nombre || '',
    telefono: values.telefono.trim() ? sanitizarEntradaTelefono10(values.telefono) : null,
    fechaNacimiento: values.fechaNacimiento.trim() || null,
    tipoCabello: tc === '' ? null : tc,
    colorNatural: values.colorNatural.trim() || null,
    colorActual: values.colorActual.trim() || null,
    productosUsados: values.productosUsados.trim() || null,
    alergias: values.alergias.trim() || null,
    ...(requiereConsentimiento(values.alergias) ? { consienteDatosSensibles: values.consienteDatosSensibles } : {}),
    aceptaAvisoPrivacidad: values.aceptaAvisoPrivacidad,
    recibePromociones: values.recibePromociones,
  };
}
