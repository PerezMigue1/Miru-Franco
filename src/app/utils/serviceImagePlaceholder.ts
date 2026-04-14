/** Miniatura local si no hay imagen o falla la carga (evita hosts externos bloqueados). */
export const IMG_SERVICIO_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect fill="#e5e7eb" width="48" height="48" rx="6"/><path fill="#9ca3af" d="M16 32l6-8 4 5 6-10 6 13H16z"/><circle fill="#9ca3af" cx="20" cy="18" r="3"/></svg>'
  );
