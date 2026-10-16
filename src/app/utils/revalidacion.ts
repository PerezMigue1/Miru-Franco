import { timingSafeEqual } from 'node:crypto';

/** Etiquetas de los fetch públicos (services/configuracionSitio.ts y services/contenido.ts) que vacía POST /api/revalidar. */
export const ETIQUETAS_PUBLICAS = ['configuracion-publica', 'contenido-publico'] as const;

/** El secreto que manda el backend: al menos 32 caracteres y comparación en tiempo constante. */
export function secretoValido(dado: string | null, esperado: string | undefined): boolean {
  const secreto = (esperado ?? '').trim();
  if (secreto.length < 32 || !dado) return false;
  const a = Buffer.from(dado);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}
