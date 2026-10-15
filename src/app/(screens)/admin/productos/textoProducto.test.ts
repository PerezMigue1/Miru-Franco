import { describe, expect, it } from 'vitest';
import { textoDesdeArregloPostgres } from './textoProducto';

/**
 * B6: Ingredientes, Modo de uso y Resultado llegan a veces como literal de arreglo de Postgres
 * ('{"Aplicar sobre…"}') y el formulario los mostraba con llaves y comillas. Se normaliza al cargar a
 * texto plano (el formato que ya espera el backend: un String), un elemento por línea.
 */
describe('textoDesdeArregloPostgres', () => {
  it('un elemento entre comillas queda como texto plano', () => {
    expect(textoDesdeArregloPostgres('{"Aplicar sobre el cabello húmedo, dejar actuar 5 minutos."}')).toBe(
      'Aplicar sobre el cabello húmedo, dejar actuar 5 minutos.',
    );
  });

  it('varios elementos van uno por línea, con comas dentro de las comillas', () => {
    expect(textoDesdeArregloPostgres('{"Agua","Aceite de argán, orgánico","Glicerina"}')).toBe('Agua\nAceite de argán, orgánico\nGlicerina');
  });

  it('elementos sin comillas, comillas escapadas y NULL', () => {
    expect(textoDesdeArregloPostgres('{Agua,Glicerina}')).toBe('Agua\nGlicerina');
    expect(textoDesdeArregloPostgres('{"Brillo \\"espejo\\"",NULL}')).toBe('Brillo "espejo"');
  });

  it('el texto normal no se toca', () => {
    expect(textoDesdeArregloPostgres('Agua, glicerina y aceite de argán')).toBe('Agua, glicerina y aceite de argán');
    expect(textoDesdeArregloPostgres('Línea 1\nLínea 2')).toBe('Línea 1\nLínea 2');
  });

  it('vacío, nulo o arreglo vacío dan texto vacío', () => {
    expect(textoDesdeArregloPostgres(undefined)).toBe('');
    expect(textoDesdeArregloPostgres(null)).toBe('');
    expect(textoDesdeArregloPostgres('{}')).toBe('');
  });
});
