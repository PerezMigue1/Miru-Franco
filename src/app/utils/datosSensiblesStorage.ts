import { normalizarUsuarioAlmacenado } from './normalizarUsuarioAlmacenado';

/**
 * Datos de salud del cliente: nunca se guardan en el navegador (localStorage ni sessionStorage),
 * porque cualquier script de la página puede leerlos. Las vistas que los muestran los piden al
 * backend en cada carga.
 */
export const CLAVES_SALUD: ReadonlySet<string> = new Set([
  'alergias',
  'tieneAlergias',
  'tratamientos',
  'tratamientosQuimicos',
  'perfilCapilar',
  'padecimientos',
  'condiciones',
  'embarazo',
  'medicamentos',
  'notasMedicas',
  'notasCliente',
]);

/** Devuelve una copia sin las claves de salud, en cualquier nivel. No muta el original. */
export function quitarDatosSalud<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((v) => quitarDatosSalud(v)) as T;
  }
  if (!valor || typeof valor !== 'object') return valor;
  const limpio: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (CLAVES_SALUD.has(clave)) continue;
    limpio[clave] = quitarDatosSalud(v);
  }
  return limpio as T;
}

/**
 * Claves propias de la app que guardan JSON (incluidas las de versiones anteriores).
 * Las de terceros no se tocan. `user` aparte: se vuelve a pasar por la lista permitida.
 */
const CLAVES_JSON_PROPIAS = [
  'miru-cart',
  'carrito',
  'base-datos-historial-exportaciones',
  'base-datos-historial-backups',
  'base-datos-ultima-exportacion',
] as const;

function sanearUsuario(storage: Storage): void {
  const raw = storage.getItem('user');
  if (raw == null) return;
  let limpio: string;
  try {
    limpio = JSON.stringify(normalizarUsuarioAlmacenado(JSON.parse(raw)));
  } catch {
    storage.removeItem('user');
    return;
  }
  if (limpio !== raw) storage.setItem('user', limpio);
}

function sanearClaveJson(storage: Storage, clave: string): void {
  const raw = storage.getItem(clave);
  if (raw == null) return;
  let limpio: string;
  try {
    limpio = JSON.stringify(quitarDatosSalud(JSON.parse(raw)));
  } catch {
    return; // No es JSON: no puede llevar un objeto de perfil.
  }
  if (limpio !== raw) storage.setItem(clave, limpio);
}

/**
 * Al cargar la app quita los datos de salud que hayan dejado versiones anteriores en el navegador:
 * `user` vuelve a la lista permitida (si está corrupto se borra) y las demás claves propias con
 * JSON pierden las claves de salud. Nunca lanza (Safari privado o almacenamiento bloqueado).
 */
export function sanearAlmacenamientoNavegador(): void {
  if (typeof window === 'undefined') return;
  const almacenes: Array<() => Storage> = [() => localStorage, () => sessionStorage];
  for (const obtener of almacenes) {
    try {
      const storage = obtener();
      sanearUsuario(storage);
      for (const clave of CLAVES_JSON_PROPIAS) sanearClaveJson(storage, clave);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}
