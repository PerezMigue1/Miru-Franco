import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { leerListaPublica, type ListaPublica } from './contenido';
import type { FotoGaleria } from '../utils/galeria';
import type { FirmaSubida } from '../utils/cloudinary';
import { MENSAJE_SIN_CONEXION } from '../utils/errorRed';

/**
 * Galería del salón (GET /api/galeria y Operaciones > Galería).
 * - Pública: fotos visibles, no ilustrativas y autorizadas, en el orden que eligió el equipo. Sirve en componentes de
 *   servidor (fetch con revalidate 60) y nunca lanza.
 * - Panel: todas las fotos con su revisión y autorización (galeria:lectura o galeria:gestionar en el backend).
 */

export interface FotoPublica {
  id: number;
  url: string;
  /** Texto alternativo que escribió el equipo (qué se ve en la foto). */
  alt: string;
  servicio: { id: number; nombre: string; categoria: string } | null;
}

export interface FotoPanel {
  id: number;
  url: string;
  alt: string;
  orden: number;
  visible: boolean;
  ilustrativa: boolean;
  /** true: no aparece nadie identificable; false: aparece una clienta; null: foto anterior sin revisar. */
  sinPersonasIdentificables: boolean | null;
  revisada: boolean;
  /** Cumple la regla para estar visible (declaración o autorización vigente) y no es ilustrativa. */
  publicable: boolean;
  servicio: { id: number; nombre: string; categoria: string; activo: boolean } | null;
  /** Autorización de la clienta que aparece: id del consentimiento, nombre, fecha y si sigue vigente. */
  consentimiento: { id: string; nombre: string; fecha: string; vigente: boolean } | null;
  subidoPor: { nombre: string } | null;
  creadoEn: string;
}

/** Alta de una foto subida desde el panel: solo el public_id de su firma (la URL la arma el backend). */
export interface NuevaFoto {
  publicId: string;
  alt: string;
  servicioId?: number | null;
  orden?: number;
  visible?: boolean;
  ilustrativa?: boolean;
  sinPersonasIdentificables?: boolean;
  consentimientoId?: string | null;
}

export type CambiosFoto = Partial<Omit<NuevaFoto, 'publicId'>>;

export interface FiltrosGaleria {
  servicioId?: number;
  estado?: 'visible' | 'oculta';
  ilustrativa?: boolean;
}

/** Clienta con autorización vigente de fotos del resultado (sin correo ni teléfono). */
export interface AutorizacionFotos {
  consentimientoId: string;
  nombre: string;
  fecha: string;
}

/** El mismo texto que manda el backend con el 502 (el cliente HTTP oculta el cuerpo de los 5xx). */
export const MENSAJE_FALLO_CLOUDINARY =
  'No se pudo borrar la foto en Cloudinary. La ocultamos de la galería; intenta borrarla de nuevo en unos minutos.';

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FORMATOS_GALERIA_ACEPTADOS = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

function fotoPublica(item: unknown): FotoPublica | null {
  const f = item as Record<string, unknown> | null;
  if (!f || typeof f.id !== 'number' || typeof f.url !== 'string' || typeof f.alt !== 'string') return null;
  const s = f.servicio as Record<string, unknown> | null | undefined;
  const servicio =
    s && typeof s.id === 'number' && typeof s.nombre === 'string'
      ? { id: s.id, nombre: s.nombre, categoria: typeof s.categoria === 'string' ? s.categoria : '' }
      : null;
  return { id: f.id, url: f.url, alt: f.alt, servicio };
}

/** Fotos públicas de la galería (para /cliente/galeria, el inicio y "Sobre nosotros"). */
export function listarGaleriaPublica(): Promise<ListaPublica<FotoPublica>> {
  return leerListaPublica('/api/galeria', fotoPublica);
}

/** Adapta las fotos públicas al mosaico `GaleriaTrabajo` (texto alternativo propio; el servicio es opcional). */
export function aFotosGaleria(fotos: FotoPublica[]): FotoGaleria[] {
  return fotos.map((f) => ({
    url: f.url,
    alt: f.alt,
    servicioId: f.servicio?.id ?? null,
    servicio: f.servicio?.nombre ?? 'Trabajo del salón',
    categoria: f.servicio?.categoria || undefined,
  }));
}

// ---------------------------------------------------------------- Panel

const opciones = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true });

export async function listarGaleriaPanel(filtros: FiltrosGaleria = {}): Promise<FotoPanel[]> {
  const params = new URLSearchParams();
  if (filtros.servicioId) params.set('servicioId', String(filtros.servicioId));
  if (filtros.estado) params.set('estado', filtros.estado);
  if (typeof filtros.ilustrativa === 'boolean') params.set('ilustrativa', String(filtros.ilustrativa));
  const query = params.toString();
  const res = (await apiClient.get<unknown>(`/api/galeria/panel${query ? `?${query}` : ''}`, opciones())) as { data?: unknown } | null;
  return Array.isArray(res?.data) ? (res.data as FotoPanel[]) : [];
}

/** public_id que genera el backend para una foto del panel. */
const PATRON_PUBLIC_ID_PANEL = /^galeria\/(ilustrativas\/)?panel_[0-9a-f]{32}$/;

/**
 * Firma de UNA foto de la galería (POST /api/galeria/firma): el backend elige carpeta y public_id y la guarda una
 * hora. Una firma sin un public_id del panel se rechaza aquí, antes de subir nada.
 */
export async function pedirFirmaFotoGaleria(ilustrativa: boolean): Promise<FirmaSubida> {
  const res = (await apiClient.post<unknown>('/api/galeria/firma', ilustrativa ? { ilustrativa: true } : {}, opciones())) as { data?: FirmaSubida } | null;
  const firma = res?.data;
  if (!firma?.uploadUrl || !firma.apiKey || !firma.signature || !PATRON_PUBLIC_ID_PANEL.test(firma.params?.public_id ?? '')) {
    throw new Error('La subida no está disponible por ahora. Vuelve a intentarlo más tarde.');
  }
  return firma;
}

/** Registra una foto ya subida desde el panel con su firma (solo el public_id; nunca una URL). */
export async function crearFoto(datos: NuevaFoto): Promise<FotoPanel> {
  const res = (await apiClient.post<unknown>('/api/galeria', datos, opciones())) as { data: FotoPanel };
  return res.data;
}

export async function actualizarFoto(id: number, cambios: CambiosFoto): Promise<FotoPanel> {
  const res = (await apiClient.patch<unknown>(`/api/galeria/${id}`, cambios, getBackendBaseUrl(), { skip403Redirect: true })) as { data: FotoPanel };
  return res.data;
}

/** Cada id toma su posición en la lista como orden. */
export async function reordenarGaleria(ids: number[]): Promise<void> {
  await apiClient.put<unknown>('/api/galeria/orden', { ids }, opciones());
}

/** Borra la foto en Cloudinary y en la base. Si Cloudinary falla, la foto queda oculta y se puede reintentar. */
export async function eliminarFoto(id: number): Promise<void> {
  try {
    await apiClient.delete<unknown>(`/api/galeria/${id}`, { customBase: getBackendBaseUrl(), skip500Redirect: true, skip403Redirect: true });
  } catch (e) {
    if ((e as { status?: unknown })?.status === 502) throw new Error(MENSAJE_FALLO_CLOUDINARY);
    throw e;
  }
}

/** Clientas con autorización vigente que coinciden por nombre (desde 2 letras). */
export async function buscarAutorizaciones(q: string): Promise<AutorizacionFotos[]> {
  const texto = q.trim();
  if (texto.length < 2) return [];
  const res = (await apiClient.get<unknown>(`/api/galeria/autorizaciones?q=${encodeURIComponent(texto)}`, opciones())) as { data?: unknown } | null;
  return Array.isArray(res?.data) ? (res.data as AutorizacionFotos[]) : [];
}

// ---------------------------------------------------------------- Subida

/** Mensaje si el archivo no se puede subir a la galería (null: se puede). JPG, PNG o WebP de hasta 5 MB. */
export function validarArchivoGaleria(archivo: Pick<File, 'type' | 'size' | 'name'>): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return `«${archivo.name}» no es JPG, PNG o WebP. Elige una foto en uno de esos formatos.`;
  }
  if (archivo.size > MAX_BYTES) {
    return `«${archivo.name}» pesa ${(archivo.size / (1024 * 1024)).toFixed(1)} MB; el máximo es 5 MB.`;
  }
  return null;
}

/**
 * Sube un archivo a Cloudinary con la firma del backend (tal cual la entregó) e informa el avance de 0 a 100.
 * XMLHttpRequest en lugar de fetch porque fetch no expone el progreso de la subida. Devuelve la secure_url.
 */
export function subirFotoConProgreso(archivo: File, firma: FirmaSubida, alAvanzar: (porcentaje: number) => void): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const datos = new FormData();
    datos.append('file', archivo);
    datos.append('api_key', firma.apiKey);
    datos.append('signature', firma.signature);
    for (const [nombre, valor] of Object.entries(firma.params)) datos.append(nombre, valor);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', firma.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alAvanzar(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onerror = () => rechazar(new Error(MENSAJE_SIN_CONEXION));
    xhr.onload = () => {
      let cuerpo: { secure_url?: string; error?: { message?: string } } = {};
      try {
        cuerpo = JSON.parse(xhr.responseText);
      } catch {
        // Respuesta que no es JSON: se trata como fallo abajo.
      }
      if (xhr.status >= 200 && xhr.status < 300 && cuerpo.secure_url) {
        alAvanzar(100);
        resolver(cuerpo.secure_url);
        return;
      }
      console.error('Cloudinary rechazó la subida', xhr.status, cuerpo.error?.message);
      rechazar(new Error('No se pudo subir la foto. Revisa que sea JPG, PNG o WebP y vuelve a intentarlo.'));
    };
    xhr.send(datos);
  });
}
