/** Validación del formulario de producto nuevo antes de llamar al API. Devuelve el mensaje o null. */
export function validarProductoNuevo(campos: {
  nombre: string;
  descripcion: string;
  categoria: string;
  marca: string;
  precio: string;
}): string | null {
  if (!campos.nombre.trim() || !campos.descripcion.trim() || !campos.categoria.trim()) {
    return 'Nombre, descripción y categoría son obligatorios.';
  }
  // El backend exige marca al crear (y su mensaje llega en inglés).
  if (!campos.marca.trim()) return 'Elige una marca.';
  const precio = Number(String(campos.precio).trim());
  if (!String(campos.precio).trim() || !Number.isFinite(precio) || precio <= 0) {
    return 'El precio debe ser mayor que 0.';
  }
  return null;
}
