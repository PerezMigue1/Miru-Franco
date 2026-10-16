import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

/**
 * Admin > Textos del sitio (permiso configuracion:editar; solo admin). Las lecturas de la pantalla manejan el 403 en
 * la misma pantalla (sin ir a /403). Lo público llega dentro de GET /api/configuracion-publica (campo textos).
 */

export type TipoTexto = 'texto' | 'correo-asunto' | 'correo-cuerpo' | 'aviso-titulo' | 'aviso-mensaje';

export interface VariableTexto {
  nombre: string;
  descripcion: string;
  /** Valor de hoy (reglas) o un ejemplo (contexto) para la vista previa. */
  ejemplo: string;
  origen: 'regla' | 'contexto';
}

export interface TextoAdmin {
  clave: string;
  pagina: string;
  descripcion: string;
  tipo: TipoTexto;
  max: number;
  valor: string;
  porDefecto: string;
  personalizado: boolean;
  variables: VariableTexto[];
  actualizadoEn: string | null;
  actualizadoPor: string | null;
}

export interface CatalogoTextos {
  paginas: string[];
  data: TextoAdmin[];
}

export interface CambioTexto {
  id: number;
  clave: string;
  valorAnterior: string | null;
  valorNuevo: string;
  restaurado: boolean;
  creadoEn: string;
  actualizadoPor: string | null;
}

const EN_PANTALLA = () => ({ customBase: getBackendBaseUrl(), skip403Redirect: true });
const ruta = (clave: string) => `/api/textos-sitio/${encodeURIComponent(clave)}`;

const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Solo filas con lo mínimo para mostrarse (clave, valor y largo); lo demás con valores seguros. */
export function normalizarCatalogo(dato: unknown): CatalogoTextos {
  const d = esObjeto(dato) ? dato : {};
  const data = (Array.isArray(d.data) ? d.data : [])
    .filter((t): t is Record<string, unknown> => esObjeto(t) && typeof t.clave === 'string' && typeof t.valor === 'string')
    .map((t) => ({
      clave: t.clave as string,
      pagina: typeof t.pagina === 'string' ? t.pagina : 'Otros',
      descripcion: typeof t.descripcion === 'string' ? t.descripcion : '',
      tipo: (typeof t.tipo === 'string' ? t.tipo : 'texto') as TipoTexto,
      max: typeof t.max === 'number' && t.max > 0 ? t.max : 300,
      valor: t.valor as string,
      porDefecto: typeof t.porDefecto === 'string' ? t.porDefecto : (t.valor as string),
      personalizado: t.personalizado === true,
      variables: (Array.isArray(t.variables) ? t.variables : []).filter(
        (v): v is VariableTexto => esObjeto(v) && typeof v.nombre === 'string' && typeof v.descripcion === 'string',
      ),
      actualizadoEn: typeof t.actualizadoEn === 'string' ? t.actualizadoEn : null,
      actualizadoPor: typeof t.actualizadoPor === 'string' ? t.actualizadoPor : null,
    }));
  const paginas = Array.isArray(d.paginas) ? d.paginas.filter((p): p is string => typeof p === 'string') : [...new Set(data.map((t) => t.pagina))];
  return { paginas, data };
}

export async function obtenerTextosSitio(): Promise<CatalogoTextos> {
  return normalizarCatalogo(await apiClient.get<unknown>('/api/textos-sitio', EN_PANTALLA()));
}

export function guardarTextoSitio(clave: string, valor: string): Promise<{ valor: string }> {
  return apiClient.put<{ valor: string }>(ruta(clave), { valor }, getBackendBaseUrl());
}

export function restaurarTextoSitio(clave: string): Promise<{ valor: string }> {
  return apiClient.post<{ valor: string }>(`${ruta(clave)}/restaurar`, {}, getBackendBaseUrl());
}

export async function obtenerHistorialTexto(clave: string): Promise<CambioTexto[]> {
  const r = await apiClient.get<{ data?: CambioTexto[] }>(`${ruta(clave)}/historial`, EN_PANTALLA());
  return Array.isArray(r?.data) ? r.data : [];
}
