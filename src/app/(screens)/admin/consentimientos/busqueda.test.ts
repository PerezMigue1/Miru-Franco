import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avisoSinCsv, CONSULTA_INICIAL, csvDisponible, etiquetaCsv, personaDeResultados, reducirConsulta } from './busqueda';

const persona = (id: string, nombre = 'Ana') => ({ id, nombre, email: `${id}@correo.com`, rol: 'cliente' });
const deAna = { usuarioId: 'u-1', usuario: persona('u-1') };

describe('Consentimientos del panel: a quién corresponde la exportación', () => {
  it('si todas las filas de una búsqueda de una sola página son de la misma persona, se exporta la de ella', () => {
    expect(personaDeResultados([deAna, deAna], { q: 'ana', totalPages: 1 })).toEqual(persona('u-1'));
  });

  it('con más páginas solo se asume la persona si se buscó por su id exacto', () => {
    expect(personaDeResultados([deAna, deAna], { q: 'ana', totalPages: 3 })).toBeNull();
    expect(personaDeResultados([deAna, deAna], { q: ' u-1 ', totalPages: 3 })).toEqual(persona('u-1'));
  });

  it('con varias personas, filas de visitantes o sin resultados no hay una sola persona', () => {
    const otra = { usuarioId: 'u-2', usuario: persona('u-2') };
    const visitante = { usuarioId: null, usuario: null };
    expect(personaDeResultados([deAna, otra], { q: '', totalPages: 1 })).toBeNull();
    expect(personaDeResultados([deAna, visitante], { q: '', totalPages: 1 })).toBeNull();
    expect(personaDeResultados([], { q: 'u-1', totalPages: 1 })).toBeNull();
  });
});

describe('Consentimientos del panel: cuándo hay CSV', () => {
  it('se habilita para una sola persona o para todas (sin búsqueda), nunca para una búsqueda de varias', () => {
    expect(csvDisponible(persona('u-1'), 'ana')).toBe(true);
    expect(csvDisponible(null, '')).toBe(true);
    expect(csvDisponible(null, 'ana')).toBe(false);
  });

  it('si no hay CSV, el aviso dice por qué según lo que hay en la tabla', () => {
    const otra = { usuarioId: 'u-2', visitanteId: null, usuario: persona('u-2') };
    const ana = { ...deAna, visitanteId: null };
    const visitante = { usuarioId: null, visitanteId: 'v-77', usuario: null };
    expect(avisoSinCsv([ana, otra])).toBe('La búsqueda incluye a varias personas: para el CSV de una sola, elige su nombre en la tabla.');
    expect(avisoSinCsv([ana, visitante])).toBe('La búsqueda incluye a varias personas: para el CSV de una sola, elige su nombre en la tabla.');
    // Un solo visitante sin cuenta: el backend solo exporta CSV por cuenta (usuarioId)
    expect(avisoSinCsv([visitante, visitante])).toBe(
      'Estos registros son de un visitante sin cuenta: el CSV por persona solo existe para cuentas. Para este visitante, descarga la constancia en PDF.',
    );
    // Una sola cuenta en la vista, pero con más páginas de una búsqueda parcial
    expect(avisoSinCsv([ana, ana])).toBe('Puede haber más personas en otras páginas: para el CSV de esta persona, elige su nombre en la tabla.');
    expect(avisoSinCsv([])).toBeNull();
  });
});

describe('Consentimientos del panel: la búsqueda siempre vuelve a consultar', () => {
  it('repetir la misma búsqueda (o tocar a la persona ya filtrada) cambia la consulta, así no se queda en "Consultando…"', () => {
    const primera = reducirConsulta(CONSULTA_INICIAL, { tipo: 'buscar', texto: ' u-1 ' });
    expect(primera).toMatchObject({ q: 'u-1', pagina: 1 });
    const repetida = reducirConsulta(primera, { tipo: 'buscar', texto: 'u-1' });
    expect(repetida).toMatchObject({ q: 'u-1', pagina: 1 });
    expect(repetida).not.toEqual(primera);
    expect(repetida.intento).toBe(primera.intento + 1);
  });

  it('buscar vuelve a la página 1; cambiar de página y recargar conservan la búsqueda', () => {
    const enPagina3 = reducirConsulta({ q: 'ana', pagina: 1, intento: 0 }, { tipo: 'pagina', pagina: 3 });
    expect(enPagina3).toEqual({ q: 'ana', pagina: 3, intento: 1 });
    expect(reducirConsulta(enPagina3, { tipo: 'buscar', texto: 'beto' })).toEqual({ q: 'beto', pagina: 1, intento: 2 });
    expect(reducirConsulta(enPagina3, { tipo: 'recargar' })).toEqual({ q: 'ana', pagina: 3, intento: 2 });
    expect(reducirConsulta(enPagina3, { tipo: 'pagina', pagina: 0 }).pagina).toBe(1);
  });
});

describe('Consentimientos del panel: pantalla', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('la consulta vive en el reductor y el efecto depende de ella', () => {
    expect(pagina).toContain('const [consulta, despachar] = useReducer(reducirConsulta, CONSULTA_INICIAL);');
    expect(pagina).toMatch(/\}, \[consulta\]\);/);
    expect(pagina).toContain("despachar({ tipo: 'buscar', texto: valor });");
  });

  it('el CSV se habilita con csvDisponible, lleva el id de la persona y el aviso explica cuando no se puede', () => {
    expect(pagina).toContain('const csvHabilitado = csvDisponible(persona, q);');
    expect(pagina).toMatch(/disabled=\{!csvHabilitado \|\|/);
    expect(pagina).toContain('await descargarConsentimientosCsv(persona?.id);');
    expect(pagina).toContain('const aviso = csvHabilitado ? null : avisoSinCsv(filas);');
    // Sin resultados no hay nota (la tabla ya dice que no hay consentimientos para esa búsqueda)
    expect(pagina).toMatch(/\{aviso && total > 0 && !cargando && \(/);
  });

  it('con una búsqueda activa y sin persona elegida el botón no dice "CSV de todas"', () => {
    expect(etiquetaCsv(persona('u-1'), 'ana')).toBe('CSV de esta persona');
    expect(etiquetaCsv(null, '')).toBe('CSV de todas');
    expect(etiquetaCsv(null, 'ana')).toBe('Elige una persona para el CSV');
    expect(pagina).toContain("{exportando === 'csv' ? 'Descargando…' : etiquetaCsv(persona, q)}");
  });

  it('no repite con un aviso fijo la señal de desplazamiento que ya da Table (salía aunque la tabla cupiera)', () => {
    expect(pagina).not.toContain('La tabla tiene más columnas a la derecha');
  });

  it('la constancia en PDF junta todas las páginas de la búsqueda, no solo la visible', () => {
    expect(pagina).toContain('todosLosConsentimientosAdmin(q),');
  });

  it('el buscador admite hasta 100 caracteres, como el backend', () => {
    expect(pagina).toMatch(/<Input\s+label="Buscar persona"[^/]*maxLength=\{100\}/);
  });

  it('"Reintentar" mide 44 px como el resto de los botones (tamaño md)', () => {
    const reintentar = pagina.match(/<Button[^>]*onClick=\{recargar\}[^>]*>\s*Reintentar/)?.[0];
    expect(reintentar).toBeDefined();
    expect(reintentar).not.toContain('size="sm"');
  });
});
