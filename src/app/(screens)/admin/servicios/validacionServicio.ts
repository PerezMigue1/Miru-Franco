/** Validación del formulario de servicio antes de llamar al API. Devuelve el mensaje o null. */
export function validarServicio(campos: { nombre: string; categoria: string; duracion: string; precio: string }): string | null {
  if (!campos.nombre.trim() || !campos.categoria || !campos.duracion) {
    return 'Rellena los campos obligatorios (nombre, categoría y duración).';
  }
  const texto = String(campos.precio).trim();
  const precio = Number(texto);
  if (!texto || !Number.isFinite(precio) || precio <= 0) return 'El precio debe ser mayor que 0.';
  return null;
}
