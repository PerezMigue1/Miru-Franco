import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/cloudinary', async (original) => ({ ...(await original<typeof import('../../utils/cloudinary')>()) }));

const { EditorImagenesPresentacionCloudinary } = await import('./EditorImagenesPresentacionCloudinary');
const { URL_IMAGEN } = await import('../../(screens)/admin/configuracion-sitio/validacionConfiguracion');

/**
 * Cada formulario que guarda una imagen sube la foto directamente con la subida segura (firma del servidor por imagen,
 * public_id generado por el servidor en la carpeta de su uso) y ya no tiene campos para pegar una URL a mano. La
 * pantalla "Subir imágenes" de Operaciones ya no existe.
 */
const RAIZ_APP = join(__dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(RAIZ_APP, ruta), 'utf8');

const FORMULARIOS: Array<[string, string, RegExp]> = [
  ['servicios (nuevo)', '(screens)/admin/servicios/nuevo/page.tsx', /<EditorImagenesPresentacionCloudinary[^>]*uso="servicios"[^>]*pedirTipo|<EditorImagenesPresentacionCloudinary[^>]*pedirTipo[^>]*uso="servicios"/],
  ['servicios (editar)', '(screens)/admin/servicios/[id]/page.tsx', /<EditorImagenesPresentacionCloudinary[^>]*uso="servicios"/],
  ['productos (nuevo)', '(screens)/admin/productos/nuevo/page.tsx', /<EditorImagenesPresentacionCloudinary[^>]*uso="productos"/],
  ['productos y presentaciones (editar)', '(screens)/admin/productos/[id]/page.tsx', /<EditorImagenesPresentacionCloudinary[^>]*uso="productos"/],
  ['contenido del sitio (Configuración)', '(screens)/admin/configuracion-sitio/ImagenCloudinary.tsx', /subirImagenSegura\(file, 'sitio'/],
  ['promociones', 'components/contenido/SeccionesContenido.tsx', /<CampoImagen[^>]*uso="promociones"/],
  ['equipo', 'components/contenido/SeccionesContenido.tsx', /<CampoImagen[^>]*uso="equipo"/],
  ['foto de otra persona (Usuarios y Clientes)', 'components/admin/FotoUsuarioUploader.tsx', /subirImagenSegura\(file, 'usuarios'\)/],
];

describe('Formularios que suben la foto directamente (subida segura)', () => {
  it.each(FORMULARIOS)('%s: sube con su uso', (_nombre, ruta, patron) => {
    expect(leer(ruta)).toMatch(patron);
  });

  it.each([...new Set(FORMULARIOS.map((f) => f[1]))])('%s: sin campo para pegar una URL de imagen', (ruta) => {
    const fuente = leer(ruta);
    expect(fuente).not.toMatch(/type="url"|tipo="url"|placeholder="https:\/\/res\.cloudinary|Pega la URL|pega estas URL/i);
    expect(fuente).not.toMatch(/subirImagenesCloudinary|subirFotoUsuarioCloudinary|pedirFirmaSubida\('galeria'/);
  });

  it('el botón de subida y el editor usan la subida segura y muestran la vista previa de lo recién subido', () => {
    expect(leer('components/admin/SubirImagenesCloudinaryButton.tsx')).toMatch(/subirImagenesSeguras\(/);
    expect(leer('components/admin/EditorImagenesPresentacionCloudinary.tsx')).toMatch(/vistaPreviaDe\(/);
    const contenido = leer('components/contenido/SeccionesContenido.tsx');
    expect(contenido).toMatch(/subirImagenSegura\(archivo, uso\)/);
    expect(contenido).toMatch(/vistaPreviaDe\(valor\)/);
  });

  it('el editor muestra las imágenes guardadas, permite quitar y ofrece "Subir foto"', () => {
    const url = 'https://res.cloudinary.com/nube/image/upload/v1/servicios/a.jpg';
    const html = renderToStaticMarkup(createElement(EditorImagenesPresentacionCloudinary, { uso: 'servicios', urls: [url], onChange: () => {} }));
    expect(html).toContain(`src="${url}"`);
    expect(html).toMatch(/aria-label="Quitar imagen 1"/);
    expect(html).toMatch(/Subir foto/);
  });

  it('Configuración del sitio acepta la imagen que ya estaba o una subida propia de sitio/, no otra carpeta', () => {
    expect(URL_IMAGEN.test('sitio/panel_' + 'a'.repeat(32))).toBe(true);
    expect(URL_IMAGEN.test('sitio/ilustrativas/panel_' + 'b'.repeat(32))).toBe(true);
    expect(URL_IMAGEN.test('servicios/panel_' + 'a'.repeat(32))).toBe(false);
    expect(URL_IMAGEN.test('https://res.cloudinary.com/nube/image/upload/v1/a.jpg')).toBe(true);
  });
});

describe('La pantalla "Subir imágenes" ya no existe', () => {
  it('sin ruta, sin opción en el menú de Operaciones y sin miga', () => {
    expect(existsSync(join(RAIZ_APP, '(screens)/(privada)/operacion/subir-imagenes/page.tsx'))).toBe(false);
    expect(leer('components/layouts/OperacionLayout.tsx')).not.toMatch(/subir-imagenes|Subir imágenes/);
    expect(leer('utils/breadcrumbs.ts')).not.toContain('subir-imagenes');
  });

  it('ningún archivo de la web menciona "pega estas URLs" ni enlaza a /operacion/subir-imagenes', () => {
    const encontrados: string[] = [];
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.(tsx?|css)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre)) {
          const texto = readFileSync(ruta, 'utf8');
          if (/pega estas URL|operacion\/subir-imagenes/i.test(texto)) encontrados.push(ruta);
        }
      }
    };
    recorrer(RAIZ_APP);
    expect(encontrados).toEqual([]);
  });
});
