/** Descarga un archivo generado en el navegador (JSON, CSV) sin abrir otra pestaña. */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // Se libera después del clic para que Safari alcance a iniciar la descarga
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
