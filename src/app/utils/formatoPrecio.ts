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
