// Admin > Textos del sitio: lógica (búsqueda, validación, vista previa) y pintado (vitest sin DOM: renderToStaticMarkup).
import { createElement, type FunctionComponent, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TextoAdmin } from '../../../services/textosSitio';

vi.mock('../../../components/layouts/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => children }));

const { filtrarTextos, errorTexto, vistaPreviaTexto, agregarVariable, contarPersonalizados } = await import('./textosSitioAdmin');
const { ListaTextos, FilaTexto, TextosCargando, TextosSinPermiso } = await import('./ListaTextos');
const { default: EditorTexto } = await import('./EditorTexto');
const { CambioTextoVista } = await import('./HistorialTexto');
const { default: TextosSitioPage } = await import('./page');

const pintar = (tipo: unknown, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(tipo as FunctionComponent<Record<string, unknown>>, props));
const nada = () => undefined;

const REGLA = { nombre: 'plazoAnticipoHoras', descripcion: 'Horas para pagar el anticipo en línea', ejemplo: '2', origen: 'regla' as const };
const texto = (cambio: Partial<TextoAdmin> = {}): TextoAdmin => ({
  clave: 'anticipos.pendiente',
  pagina: 'Anticipos',
  descripcion: 'Detalle de la cita con anticipo por pagar en línea.',
  tipo: 'texto',
  max: 300,
  valor: 'Págalo {formasPago}. Si no se paga en {plazoAnticipo}, el horario se libera.',
  porDefecto: 'Págalo {formasPago}. Si no se paga en {plazoAnticipo}, el horario se libera.',
  personalizado: false,
  variables: [
    { nombre: 'formasPago', descripcion: 'Formas de pagar el anticipo', ejemplo: 'en línea o en el salón', origen: 'contexto' },
    { nombre: 'plazoAnticipo', descripcion: 'Plazo del anticipo', ejemplo: '2 horas', origen: 'contexto' },
    REGLA,
  ],
  actualizadoEn: null,
  actualizadoPor: null,
  ...cambio,
});
const LISTA: TextoAdmin[] = [
  texto(),
  texto({ clave: 'pedidos.lista.vacia', pagina: 'Mis pedidos', descripcion: 'Lista de pedidos vacía.', valor: 'Aún no compras', porDefecto: 'No tienes pedidos realizados', max: 80, variables: [REGLA] }),
  texto({ clave: 'correos.activacion.asunto', pagina: 'Correos', descripcion: 'Código de activación de la cuenta.', tipo: 'correo-asunto', valor: 'Código de activación - {nombreSalon}', porDefecto: 'Código de activación - {nombreSalon}', max: 120, variables: [] }),
];

describe('Búsqueda y filtro por página', () => {
  it('busca sin acentos en la descripción y en el texto, y filtra por página', () => {
    expect(filtrarTextos(LISTA, 'activacion').map((t) => t.clave)).toEqual(['correos.activacion.asunto']);
    expect(filtrarTextos(LISTA, 'HORARIO libera').map((t) => t.clave)).toEqual(['anticipos.pendiente']);
    expect(filtrarTextos(LISTA, '', 'Mis pedidos').map((t) => t.clave)).toEqual(['pedidos.lista.vacia']);
    expect(filtrarTextos(LISTA, 'activación', 'Mis pedidos')).toEqual([]);
    expect(contarPersonalizados(LISTA)).toBe(1);
  });
});

describe('Validación en vivo (la misma del backend)', () => {
  it.each([
    ['', 'Escribe el texto'],
    ['x'.repeat(301), 'como máximo 300'],
    ['Págalo <b>ya</b>', 'sin etiquetas HTML'],
    ['Págalo {formasPago', 'llaves'],
    ['Págalo en {inventada}', '{inventada}'],
  ])('"%s" da un error en español', (valor, error) => {
    expect(errorTexto(texto(), valor)).toContain(error);
  });
  it('acepta variables de contexto y de reglas', () => {
    expect(errorTexto(texto(), 'Págalo {formasPago} en {plazoAnticipoHoras} horas.')).toBeNull();
  });
  it('un asunto va en una sola línea', () => {
    expect(errorTexto(LISTA[2], 'Hola\nmundo')).toContain('una sola línea');
  });
  it('vista previa con ejemplos y reglas de hoy; agregar variable', () => {
    expect(vistaPreviaTexto(texto(), texto().valor)).toBe('Págalo en línea o en el salón. Si no se paga en 2 horas, el horario se libera.');
    expect(vistaPreviaTexto(LISTA[2], LISTA[2].valor, 'Salón Ejemplo')).toBe('Código de activación - Salón Ejemplo');
    expect(agregarVariable('Hola', 'pedido')).toBe('Hola {pedido}');
    expect(agregarVariable('', 'pedido')).toBe('{pedido}');
  });
});

describe('Pintado', () => {
  it('lista con buscador, filtro por página y cada texto con su página y descripción', () => {
    const html = pintar(ListaTextos, { catalogo: { paginas: ['Anticipos', 'Mis pedidos', 'Correos'], data: LISTA }, onGuardado: nada });
    expect(html).toMatch(/<label for="textos-buscar"/);
    expect(html).toMatch(/<select id="textos-pagina"/);
    expect(html).toContain('Todas las páginas');
    expect(html).toContain('3 de 3 textos. 1 cambiado desde esta pantalla.');
    expect(html).toContain('Lista de pedidos vacía.');
    expect(html).toContain('Cambiado');
    expect(html).toContain('aria-expanded="false"');
  });

  it('el editor: campo con contador, variables, vista previa, restaurar y su historial', () => {
    const html = pintar(EditorTexto, { texto: LISTA[1], onGuardado: nada });
    expect(html).toContain('14/80');
    expect(html).toContain('Vista previa');
    expect(html).toContain('Restaurar texto original');
    expect(html).toContain('Historial de cambios');
    expect(html).toContain('{plazoAnticipoHoras}');
    expect(html).toContain('No tienes pedidos realizados');
    expect(html).toMatch(/<input[^>]*aria-describedby="[^"]*contador/);
  });

  it('un texto original no deja restaurar; los de correo usan un campo de una línea en el asunto', () => {
    const html = pintar(EditorTexto, { texto: LISTA[2], onGuardado: nada, nombreSalon: 'Salón Ejemplo' });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>)[\s\S])*Restaurar texto original/);
    expect(html).toContain('Código de activación - Salón Ejemplo');
    expect(html).toContain('Es el texto original.');
  });

  it('fila abierta muestra el editor', () => {
    const html = pintar(FilaTexto, { texto: LISTA[0], abierto: true, onAlternar: nada, onGuardado: nada });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Guardar');
  });

  it('historial: antes, ahora, quién y si fue restaurar', () => {
    const html = pintar(CambioTextoVista, {
      cambio: { id: 1, clave: 'x', valorAnterior: 'Uno', valorNuevo: 'Dos', restaurado: true, creadoEn: '2026-10-16T16:00:00.000Z', actualizadoPor: 'Dueña' },
    });
    expect(html).toContain('por Dueña');
    expect(html).toContain('Texto original restaurado');
    expect(html).toContain('Uno');
    expect(html).toContain('Dos');
  });

  it('estados de carga y sin permiso; la página arranca cargando dentro de AdminLayout', () => {
    expect(pintar(TextosCargando)).toContain('aria-busy="true"');
    expect(pintar(TextosSinPermiso)).toContain('No tienes permiso para ver los textos del sitio.');
    const html = pintar(TextosSitioPage);
    expect(html).toContain('Textos del sitio');
    expect(html).toContain('Cargando los textos del sitio');
  });

  it('solo colores del sistema (tokens), sin hexadecimales', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const f of readdirSync(__dirname).filter((n) => n.endsWith('.tsx'))) {
      expect(readFileSync(join(__dirname, f), 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
