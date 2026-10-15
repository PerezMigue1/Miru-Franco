import type { EstadoQueja } from '../../../../services/quejas';

export const MAX_ASUNTO = 120;
export const MAX_DESCRIPCION = 2000;

/** Errores del formulario de garantía o soporte; vacío si se puede enviar. */
export function validarQueja(asunto: string, descripcion: string): { asunto?: string; descripcion?: string } {
  const errores: { asunto?: string; descripcion?: string } = {};
  const a = asunto.trim();
  const d = descripcion.trim();
  if (a.length < 3) errores.asunto = 'Escribe de qué se trata (al menos 3 caracteres).';
  else if (a.length > MAX_ASUNTO) errores.asunto = `El asunto tiene como máximo ${MAX_ASUNTO} caracteres.`;
  if (d.length < 10) errores.descripcion = 'Cuéntanos qué pasó (al menos 10 caracteres).';
  else if (d.length > MAX_DESCRIPCION) errores.descripcion = `La descripción tiene como máximo ${MAX_DESCRIPCION} caracteres.`;
  return errores;
}

export const ETIQUETA_ESTADO_QUEJA: Record<EstadoQueja, string> = {
  abierta: 'Recibida',
  en_proceso: 'En revisión',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};
