/**
 * Ingredientes, Modo de uso y Resultado del producto: algunos registros guardan un literal de arreglo
 * de Postgres ('{"Aplicar sobre…","…"}') en el campo de texto. El formulario lo mostraba con llaves y
 * comillas. Al cargar se pasa a texto plano, un elemento por línea; es el formato que ya espera el
 * backend (un String), así que guardar el texto normalizado no cambia el tipo del campo.
 * El texto que no es un arreglo se devuelve tal cual.
 */
export function textoDesdeArregloPostgres(valor?: string | null): string {
  const texto = String(valor ?? '').trim();
  const arreglo = texto.match(/^\{([\s\S]*)\}$/);
  if (!arreglo) return texto;
  const cuerpo = arreglo[1];
  const elementos: string[] = [];
  let i = 0;
  while (i < cuerpo.length) {
    while (i < cuerpo.length && /\s/.test(cuerpo[i])) i++;
    if (i >= cuerpo.length) break;
    let elemento = '';
    if (cuerpo[i] === '"') {
      i++;
      while (i < cuerpo.length && cuerpo[i] !== '"') {
        if (cuerpo[i] === '\\' && i + 1 < cuerpo.length) i++;
        elemento += cuerpo[i];
        i++;
      }
      i++;
      while (i < cuerpo.length && cuerpo[i] !== ',') i++;
    } else {
      while (i < cuerpo.length && cuerpo[i] !== ',') elemento += cuerpo[i++];
      elemento = elemento.trim();
      if (elemento.toUpperCase() === 'NULL') elemento = '';
    }
    i++;
    if (elemento.trim()) elementos.push(elemento.trim());
  }
  return elementos.join('\n');
}
