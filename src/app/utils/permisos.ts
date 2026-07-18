'use client';

import { useCallback, useEffect, useState } from 'react';
import { MIRU_USER_STORAGE_UPDATED } from './userStorageSync';

/**
 * Fuente única de permisos del frontend: lee `permisos: string[]` del usuario guardado en
 * `localStorage.user` (poblado desde `GET /auth/me`, ver `services/perfil.ts`). Reemplaza
 * las comprobaciones `if (rol === 'x' || rol === 'y')` dispersas por listas de roles
 * hardcodeadas — sidebars y guards de página deben usar `tienePermiso(clave)`, no el rol.
 *
 * No es un store nuevo: sigue viviendo en `localStorage.user`, igual que el resto de la
 * sesión (rol, nombre, foto). Solo se agrega el helper de lectura.
 */

/** Extrae `permisos` de un objeto usuario almacenado. `'*'` (admin) se conserva tal cual. */
export function getPermisosFromUser(
  user: Record<string, unknown> | null | undefined,
): string[] {
  if (!user || typeof user !== 'object') return [];
  const permisos = user.permisos;
  if (!Array.isArray(permisos)) return [];
  return permisos.filter((p): p is string => typeof p === 'string');
}

/** True si `permisos` incluye la clave exacta, o el wildcard `'*'` (admin, pasa todo). */
export function evaluarPermiso(permisos: string[], clave: string | undefined | null): boolean {
  if (!clave) return true;
  if (permisos.includes('*')) return true;
  return permisos.includes(clave);
}

function leerPermisosDeLocalStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return [];
    return getPermisosFromUser(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return [];
  }
}

/**
 * Hook de permisos: expone `tienePermiso(clave)` reactivo a cambios de sesión
 * (evento `MIRU_USER_STORAGE_UPDATED`, ya emitido por los layouts al refrescar el perfil,
 * y el evento nativo `storage` para cambios entre pestañas).
 */
export function usePermisos(): {
  permisos: string[];
  tienePermiso: (clave: string | undefined | null) => boolean;
} {
  const [permisos, setPermisos] = useState<string[]>(() => leerPermisosDeLocalStorage());

  useEffect(() => {
    const refrescar = () => setPermisos(leerPermisosDeLocalStorage());
    refrescar();
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, refrescar);
    window.addEventListener('storage', refrescar);
    return () => {
      window.removeEventListener(MIRU_USER_STORAGE_UPDATED, refrescar);
      window.removeEventListener('storage', refrescar);
    };
  }, []);

  const tienePermiso = useCallback(
    (clave: string | undefined | null) => evaluarPermiso(permisos, clave),
    [permisos],
  );

  return { permisos, tienePermiso };
}
