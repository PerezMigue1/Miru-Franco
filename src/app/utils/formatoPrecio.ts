/**
 * Formato de precio para mostrar en pantallas de cliente: "$1,200". El catálogo llega a veces
 * como "1200" y a veces como "$1,200"; esto solo unifica la presentación, no toca el valor.
 */
export function formatearPrecioMXN(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const texto = String(valor).trim();
  const numero = Number(texto.replace(/[$,\s]/g, ''));
  if (!Number.isFinite(numero)) return texto;
  return `$${numero.toLocaleString('es-MX', {
    minimumFractionDigits: numero % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Precio listo para mostrar, o null si no hay precio real (vacío, no numérico o 0): así la tienda
 * no anuncia "$0" y la pantalla decide qué texto poner en su lugar.
 */
export function precioParaMostrar(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).trim().replace(/[$,\s]/g, ''));
  return Number.isFinite(numero) && numero > 0 ? formatearPrecioMXN(numero) : null;
}
