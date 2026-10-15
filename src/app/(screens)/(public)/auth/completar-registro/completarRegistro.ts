import { getBackendBaseUrl } from '../../../../services/config';
import { api } from '../../../../services/auth';
import { mergePerfilEnLocalStorage } from '../../../../services/perfil';
import { markSessionStart } from '../../../../utils/security';
import { MENSAJE_SIN_CONEXION } from '../../../../utils/errorRed';
import { esErrorServidor, textoErrorServidor } from '../../../../utils/errorServidor';
import { consentimientosAlta, erroresCasillasAlta, type CasillasAlta } from '../../../../components/legal/reglasAlta';

/** Mensajes del contrato de POST /auth/google/completar (se usan si el backend no manda el suyo). */
export const MENSAJE_ENLACE_VENCIDO = 'El enlace para completar tu registro no es válido o ya venció. Vuelve a entrar con Google.';
export const MENSAJE_CUENTA_EXISTENTE = 'Ya existe una cuenta con este correo. Entra con Google para iniciar sesión.';
const MENSAJE_LIMITE = 'Hiciste varios intentos seguidos. Espera un minuto y vuelve a intentarlo.';
const MENSAJE_GENERICO = 'No pudimos crear tu cuenta. Intenta de nuevo.';

export interface DatosTokenGoogle {
  nombre: string;
  email: string;
}

/** Ruta de la página sin el token: así queda la URL en cuanto se lee. */
export const RUTA_COMPLETAR_REGISTRO = '/auth/completar-registro';

/**
 * Token del alta con Google. El backend lo manda en el fragmento (#token=), que no viaja al servidor web ni a sus
 * logs; ?token= se acepta por compatibilidad con enlaces anteriores. Solo lee: la página lo guarda en su estado
 * al montarse y después limpia la URL fuera del render.
 */
export function leerTokenDeLaUrl(ubicacion: { hash: string; search: string }): string | null {
  const delFragmento = new URLSearchParams(ubicacion.hash.replace(/^#/, '')).get('token');
  return delFragmento || new URLSearchParams(ubicacion.search).get('token') || null;
}

/**
 * Nombre y correo del token de /auth/completar-registro#token=..., solo para mostrarlos. La web no puede
 * verificar la firma: quien decide si el token vale es el backend al completar. null si no es un token
 * de registro con Google legible.
 */
export function datosDelTokenGoogle(token: string | null | undefined): DatosTokenGoogle | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 3 || !partes[1]) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const json = new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
    const payload = JSON.parse(json) as { proposito?: unknown; email?: unknown; nombre?: unknown };
    if (payload.proposito !== 'registro_google' || typeof payload.email !== 'string' || !payload.email) return null;
    return { nombre: typeof payload.nombre === 'string' ? payload.nombre : '', email: payload.email };
  } catch {
    return null;
  }
}

export type MotivoFallaCompletar = 'enlace_vencido' | 'cuenta_existente' | 'casillas' | 'limite' | 'error';

/** origenApp: el token vino de la app; la cuenta quedó creada pero la respuesta no trae sesión para la web. */
export type ResultadoCompletarOk = { ok: true; renovarEnSegundos?: number; origenApp?: true };

export type ResultadoCompletar = ResultadoCompletarOk | { ok: false; motivo: MotivoFallaCompletar; mensaje: string };

/** Mensaje del cuerpo de error del backend ({ message, errors }), o null. */
function mensajeDelCuerpo(cuerpo: unknown): string | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const { message, errors } = cuerpo as { message?: unknown; errors?: unknown };
  if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
    return Object.values(errors as Record<string, unknown>)
      .flat()
      .filter((m): m is string => typeof m === 'string')
      .join(' ');
  }
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) return message.filter((m) => typeof m === 'string').join(' ');
  return null;
}

/**
 * Crea la cuenta de Google después de aceptar (POST /api/auth/google/completar). Va con X-Auth-Mode: cookie,
 * como el canje de /auth/callback: el backend responde con la cookie mf_session y { renovarEnSegundos }.
 * Sin las dos casillas obligatorias no llama al backend: mientras no acepte, la cuenta no existe.
 */
export async function completarRegistroGoogle(
  token: string,
  casillas: CasillasAlta,
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<ResultadoCompletar> {
  const faltante = Object.values(erroresCasillasAlta(casillas))[0];
  if (faltante) return { ok: false, motivo: 'casillas', mensaje: faltante };

  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${getBackendBaseUrl()}/api/auth/google/completar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Mode': 'cookie' },
      credentials: 'include',
      body: JSON.stringify({ token, ...consentimientosAlta(casillas) }),
    });
  } catch {
    return { ok: false, motivo: 'error', mensaje: MENSAJE_SIN_CONEXION };
  }

  const texto = await respuesta.text().catch(() => '');
  let cuerpo: unknown = null;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {
    cuerpo = null;
  }

  if (respuesta.ok) {
    // Token de la app: el backend crea la cuenta y responde { data: { origen: 'app' } } sin sesión.
    if ((cuerpo as { data?: { origen?: unknown } } | null)?.data?.origen === 'app') return { ok: true, origenApp: true };
    const renovar = (cuerpo as { renovarEnSegundos?: unknown } | null)?.renovarEnSegundos;
    return typeof renovar === 'number' ? { ok: true, renovarEnSegundos: renovar } : { ok: true };
  }
  if (respuesta.status === 401) return { ok: false, motivo: 'enlace_vencido', mensaje: mensajeDelCuerpo(cuerpo) ?? MENSAJE_ENLACE_VENCIDO };
  if (respuesta.status === 409) return { ok: false, motivo: 'cuenta_existente', mensaje: mensajeDelCuerpo(cuerpo) ?? MENSAJE_CUENTA_EXISTENTE };
  if (respuesta.status === 400) return { ok: false, motivo: 'casillas', mensaje: mensajeDelCuerpo(cuerpo) ?? MENSAJE_GENERICO };
  if (respuesta.status === 429) return { ok: false, motivo: 'limite', mensaje: MENSAJE_LIMITE };
  if (esErrorServidor(respuesta.status)) {
    console.error('[API 5xx]', '/api/auth/google/completar', respuesta.status, texto);
    return { ok: false, motivo: 'error', mensaje: textoErrorServidor(respuesta.status, cuerpo ?? undefined) };
  }
  return { ok: false, motivo: 'error', mensaje: mensajeDelCuerpo(cuerpo) ?? MENSAJE_GENERICO };
}

/**
 * Pantalla que sigue a un alta correcta: con un token de la app no se inicia sesión en la web ('lista_app': volver a
 * la app); en la web se inicia como /auth/callback ('lista') o, si /auth/me falla, se pide entrar ('sin_perfil').
 */
export async function estadoTrasCompletar(
  r: ResultadoCompletarOk,
  iniciarSesion: (renovarEnSegundos?: number) => Promise<boolean> = iniciarSesionTrasCompletar,
): Promise<'lista' | 'sin_perfil' | 'lista_app'> {
  if (r.origenApp) return 'lista_app';
  return (await iniciarSesion(r.renovarEnSegundos)) ? 'lista' : 'sin_perfil';
}

/**
 * Completa la sesión como /auth/callback: marca el inicio (renovación a tiempo), pide GET /auth/me y guarda
 * en localStorage solo lo que la interfaz necesita (mergePerfilEnLocalStorage quita los datos de salud).
 * false si /auth/me falló: la cuenta existe, pero hay que iniciar sesión otra vez.
 */
export async function iniciarSesionTrasCompletar(renovarEnSegundos?: number): Promise<boolean> {
  markSessionStart(renovarEnSegundos);
  try {
    const perfil = await api.getProfile();
    if (perfil.success && perfil.data) {
      mergePerfilEnLocalStorage(perfil.data);
      return true;
    }
  } catch {
    /* sin red: igual que un fallo de /auth/me */
  }
  return false;
}
