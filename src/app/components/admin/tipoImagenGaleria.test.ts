import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/client', () => ({ apiClient: { post: vi.fn() } }));
vi.mock('../../services/config', () => ({ getBackendBaseUrl: () => 'https://api.ejemplo.test' }));

const { OPCIONES_TIPO_IMAGEN, MENSAJE_FALTA_TIPO_IMAGEN, errorTipoImagen } = await import('./tipoImagenGaleria');
const { default: ElegirTipoImagen } = await import('./ElegirTipoImagen');
const { SubirImagenesCloudinaryButton } = await import('./SubirImagenesCloudinaryButton');

const RAIZ = join(__dirname, '..', '..', '..', '..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');
const radios = (html: string) => html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];

/**
 * Las imágenes que llegan a la galería se marcan al subirlas: foto real de un trabajo del salón o imagen
 * ilustrativa (va a galeria/ilustrativas y nunca se presenta como trabajo real).
 */
describe('Tipo de imagen al subir a la galería', () => {
  it('las dos opciones, con el texto acordado', () => {
    expect(OPCIONES_TIPO_IMAGEN.map((o) => [o.valor, o.texto])).toEqual([
      ['real', 'Foto real de un trabajo del salón'],
      ['ilustrativa', 'Imagen ilustrativa'],
    ]);
  });

  it('es obligatorio: sin elegir no se puede subir y el mensaje lo dice', () => {
    expect(errorTipoImagen(null)).toBe(MENSAJE_FALTA_TIPO_IMAGEN);
    expect(MENSAJE_FALTA_TIPO_IMAGEN).toBe('Elige si es una foto real de un trabajo del salón o una imagen ilustrativa.');
    expect(errorTipoImagen('real')).toBeNull();
    expect(errorTipoImagen('ilustrativa')).toBeNull();
  });

  it('el selector no trae ninguna opción marcada, es obligatorio y cada opción mide 44 px', () => {
    const html = renderToStaticMarkup(createElement(ElegirTipoImagen, { valor: null, onCambiar: () => {} }));
    const lista = radios(html);
    expect(lista).toHaveLength(2);
    for (const r of lista) {
      expect(r).not.toMatch(/checked/);
      expect(r).toMatch(/required/);
    }
    expect(html).toContain('<fieldset');
    expect(html).toContain('<legend');
    expect(html).toContain('Foto real de un trabajo del salón');
    expect(html).toContain('Imagen ilustrativa');
    expect(html.match(/<label[^>]*min-h-11/g)).toHaveLength(2);
  });

  it('marca la opción elegida', () => {
    const html = renderToStaticMarkup(createElement(ElegirTipoImagen, { valor: 'ilustrativa', onCambiar: () => {} }));
    const [real, ilustrativa] = radios(html);
    expect(real).not.toMatch(/checked/);
    expect(ilustrativa).toMatch(/checked/);
  });

  it('con pedirTipo, el botón de subir muestra el selector y no deja elegir archivos hasta escoger', () => {
    const html = renderToStaticMarkup(createElement(SubirImagenesCloudinaryButton, { onUrlsAdded: () => {}, pedirTipo: true }));
    expect(radios(html)).toHaveLength(2);
    const archivo = html.match(/<input[^>]*type="file"[^>]*>/)![0];
    expect(archivo).toMatch(/\sdisabled=""/);
  });

  it('sin pedirTipo (productos), el botón sube como siempre, sin selector', () => {
    const html = renderToStaticMarkup(createElement(SubirImagenesCloudinaryButton, { onUrlsAdded: () => {} }));
    expect(radios(html)).toHaveLength(0);
    expect(html.match(/<input[^>]*type="file"[^>]*>/)![0]).not.toMatch(/\sdisabled=""/);
  });

  it('el botón manda el tipo elegido a la subida y revisa que se haya elegido', () => {
    const boton = leer('src/app/components/admin/SubirImagenesCloudinaryButton.tsx');
    expect(boton).toMatch(/subirImagenesCloudinary\(list, pedirTipo \? tipo \?\? undefined : undefined\)/);
    expect(boton).toMatch(/if \(pedirTipo\) \{\s*const falta = errorTipoImagen\(tipo\);/);
  });

  it('los formularios de servicio (nuevo y editar) piden el tipo', () => {
    for (const ruta of ['src/app/(screens)/admin/servicios/nuevo/page.tsx', 'src/app/(screens)/admin/servicios/[id]/page.tsx']) {
      expect(leer(ruta), ruta).toMatch(/<EditorImagenesPresentacionCloudinary[^>]*pedirTipo/);
    }
    expect(leer('src/app/components/admin/EditorImagenesPresentacionCloudinary.tsx')).toMatch(/pedirTipo=\{pedirTipo\}/);
  });

  it('operación, subir imágenes: pide el tipo antes de subir y lo manda', () => {
    const pagina = leer('src/app/(screens)/(privada)/operacion/subir-imagenes/page.tsx');
    expect(pagina).toContain('<ElegirTipoImagen');
    expect(pagina).toMatch(/const falta = errorTipoImagen\(tipo\);/);
    expect(pagina).toMatch(/subirImagenesCloudinary\(files, tipo\)/);
    expect(pagina).toMatch(/disabled=\{subiendo \|\| !tipo\}/);
  });

  it('operación, subir imágenes: alineada a la izquierda con la miga, como el resto del panel (sin mx-auto)', () => {
    const pagina = leer('src/app/(screens)/(privada)/operacion/subir-imagenes/page.tsx');
    expect(pagina).toContain('<div className="max-w-2xl py-4">');
    expect(pagina).not.toContain('mx-auto');
  });
});

describe('El tipo de imagen no se recuerda entre lotes', () => {
  it('el botón del panel vuelve a pedir el tipo después de subir un lote', () => {
    const boton = leer('src/app/components/admin/SubirImagenesCloudinaryButton.tsx');
    expect(boton).toMatch(/onUrlsAdded\(urls\);\s*\/\/[^\n]*\n\s*setTipo\(null\);/);
  });

  it('la pantalla de operación también vuelve a pedirlo después de cada lote', () => {
    const pagina = leer('src/app/(screens)/(privada)/operacion/subir-imagenes/page.tsx');
    expect(pagina).toMatch(/setUrls\(resultado\);\s*\/\/[^\n]*\n\s*setTipo\(null\);/);
  });
});
