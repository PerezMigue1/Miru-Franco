/**
 * Enlaces directos a una sección del perfil (p. ej. el aviso de respuesta ARCO abre
 * /cliente/mi-perfil#privacidad-solicitudes): qué sección abrir y a qué bloque bajar.
 */
export function seccionDesdeHash(hash: string): { seccion: 'privacidad'; ancla: string | null } | null {
  const id = hash.replace(/^#/, '');
  if (id === 'privacidad') return { seccion: 'privacidad', ancla: null };
  if (/^privacidad-[a-z-]+$/.test(id)) return { seccion: 'privacidad', ancla: id };
  return null;
}
