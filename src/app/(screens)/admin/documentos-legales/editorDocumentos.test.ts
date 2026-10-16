import { describe, expect, it } from 'vitest';
import {
  aplicarFormato,
  compararVersiones,
  siguienteVersion,
  validarPublicacion,
  variablesDesconocidasEnTexto,
} from './editorDocumentos';

/** Lógica sin interfaz de Admin > Documentos legales (vitest sin DOM). */
describe('Versiones', () => {
  it('propone la siguiente versión menor (X.Y + 0.1) o 1.0 si no hay', () => {
    expect(siguienteVersion('2.0')).toBe('2.1');
    expect(siguienteVersion('1.9')).toBe('1.10');
    expect(siguienteVersion(null)).toBe('1.0');
  });

  it('compara mayor y menor como números', () => {
    expect(compararVersiones('2.10', '2.9')).toBeGreaterThan(0);
    expect(compararVersiones('3.0', '2.10')).toBeGreaterThan(0);
    expect(compararVersiones('2.0', '2.0')).toBe(0);
  });
});

describe('validarPublicacion: lo mismo que revisa el backend, con el error junto a cada campo', () => {
  const contexto = { versionMayor: '2.0', ultimaVigencia: '2026-10-14', hoy: '2026-10-16' };
  const bien = { version: '2.1', vigenteDesde: '2026-10-16', motivo: 'Se aclara el plazo de pago.' };

  it('sin errores con versión mayor, fecha de hoy o futura y motivo', () => {
    expect(validarPublicacion(bien, contexto)).toEqual({});
    expect(validarPublicacion({ ...bien, vigenteDesde: '2026-12-01', version: '3.0' }, contexto)).toEqual({});
  });

  it('versión con forma X.Y y mayor que la publicada', () => {
    expect(validarPublicacion({ ...bien, version: '2' }, contexto).version).toMatch(/X\.Y/);
    expect(validarPublicacion({ ...bien, version: '2.0' }, contexto).version).toMatch(/mayor que la 2\.0/);
    expect(validarPublicacion({ ...bien, version: '1.5' }, contexto).version).toMatch(/mayor/);
  });

  it('fecha válida, hoy o futura y no anterior a la última versión', () => {
    expect(validarPublicacion({ ...bien, vigenteDesde: '' }, contexto).vigenteDesde).toMatch(/fecha/);
    expect(validarPublicacion({ ...bien, vigenteDesde: '2026-10-15' }, contexto).vigenteDesde).toMatch(/hoy/);
    expect(validarPublicacion({ ...bien, vigenteDesde: '2026-10-20' }, { ...contexto, ultimaVigencia: '2026-11-01' }).vigenteDesde).toMatch(/anterior/);
  });

  it('el motivo es obligatorio (al menos 10 caracteres)', () => {
    expect(validarPublicacion({ ...bien, motivo: '   ' }, contexto).motivo).toMatch(/motivo/);
    expect(validarPublicacion({ ...bien, motivo: 'corto' }, contexto).motivo).toMatch(/10/);
  });
});

describe('Barra de formato del editor', () => {
  it('negritas envuelve lo seleccionado; sin selección deja un texto de ejemplo seleccionado', () => {
    expect(aplicarFormato('Hola mundo', 5, 10, 'negritas')).toEqual({ texto: 'Hola **mundo**', inicio: 7, fin: 12 });
    const r = aplicarFormato('Hola ', 5, 5, 'negritas');
    expect(r.texto).toBe('Hola **texto en negritas**');
    expect(r.texto.slice(r.inicio, r.fin)).toBe('texto en negritas');
  });

  it('lista y lista numerada ponen la marca al inicio de cada línea seleccionada', () => {
    expect(aplicarFormato('uno\ndos', 0, 7, 'lista').texto).toBe('- uno\n- dos');
    expect(aplicarFormato('uno\ndos', 0, 7, 'numerada').texto).toBe('1. uno\n2. dos');
  });

  it('sección y subtítulo van en su propio bloque, separados por líneas en blanco', () => {
    const r = aplicarFormato('Párrafo.', 8, 8, 'seccion');
    expect(r.texto).toBe('Párrafo.\n\n## Título de la sección');
    expect(r.texto.slice(r.inicio, r.fin)).toBe('Título de la sección');
    expect(aplicarFormato('', 0, 0, 'subtitulo').texto).toBe('### Subtítulo');
  });

  it('enlace usa lo seleccionado como texto y deja seleccionada la dirección', () => {
    const r = aplicarFormato('Lee la política', 7, 15, 'enlace');
    expect(r.texto).toBe('Lee la [política](/ruta-del-sitio)');
    expect(r.texto.slice(r.inicio, r.fin)).toBe('/ruta-del-sitio');
  });

  it('variable inserta {nombre} donde está el cursor', () => {
    expect(aplicarFormato('Tienes  días.', 7, 7, 'variable', 'diasGarantia')).toEqual({
      texto: 'Tienes {diasGarantia} días.',
      inicio: 21,
      fin: 21,
    });
  });
});

describe('Variables en el texto', () => {
  it('avisa de las variables que no están en la lista', () => {
    expect(variablesDesconocidasEnTexto('Plazo {diasGarantia} y {diasInventados} y {diasInventados}', ['diasGarantia'])).toEqual(['diasInventados']);
    expect(variablesDesconocidasEnTexto('Sin variables {#ancla}', ['diasGarantia'])).toEqual([]);
  });
});
