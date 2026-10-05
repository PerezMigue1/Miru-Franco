import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Los colores viven en la paleta (styles/globals.css, sistema.css y cliente.css) y el código usa sus
 * variables. Esta prueba recorre src y falla si encuentra un color hexadecimal, rgb() o rgba() escrito a
 * mano fuera de la paleta y de la lista corta de excepciones justificadas, con el archivo y la línea.
 */
const RAIZ_SRC = join(__dirname, '..', '..');
const EXTENSIONES = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'];

/** Archivos de la paleta: aquí se definen los colores. */
const PALETA = ['app/styles/globals.css', 'app/styles/sistema.css', 'app/styles/cliente.css'];

/**
 * Excepciones justificadas: cada archivo solo puede usar exactamente estos valores.
 * Se dibujan fuera del CSS (PDF, diagramas, animación) o son colores de otra marca que no cambian con el tema.
 */
const PERMITIDOS: Record<string, { motivo: string; valores: string[] }> = {
  'app/components/auth/LogoGoogle.tsx': {
    motivo: 'colores oficiales del logo de Google',
    valores: ['#4285f4', '#34a853', '#fbbc05', '#ea4335'],
  },
  'app/utils/exportReportes.ts': {
    motivo: 'PDF con jsPDF: no puede leer variables CSS (colores de marca en RGB)',
    valores: ['#710014', '#9f6d1f'],
  },
  'app/utils/mermaidRender.ts': {
    motivo: 'tema de los diagramas Mermaid: se renderizan a SVG fuera del CSS de la app',
    valores: ['#eee', '#333', '#999', '#666', '#ddd', '#fff'],
  },
  'app/components/home/HeroFluidos.tsx': {
    motivo: 'hero animado: colores de las figuras de la escena',
    valores: ['#710014', '#9f6d1f', '#d9728f', '#dcc8b6', '#f6efe6'],
  },
  'app/components/home/StickersSalon.tsx': {
    motivo: 'hero animado: contorno de las figuras de la escena',
    valores: ['#f6efe6'],
  },
  'app/utils/fluidosHero.ts': {
    motivo: 'hero animado: color de cada fluido de producto en la animación',
    valores: ['#7a1a1f', '#d99a4e', '#5b3fd6', '#d9728f'],
  },
  'app/components/ui/Button.tsx': {
    motivo: 'blanco y negro de referencia dentro de color-mix() para aclarar u oscurecer el hover',
    valores: ['#fff', '#000'],
  },
  'app/utils/serviceImagePlaceholder.ts': {
    motivo: 'imagen de relleno en data URI (SVG): no hereda las variables CSS de la página',
    valores: ['#e5e7eb', '#9ca3af'],
  },
};

// Hex de 3, 4, 6 u 8 dígitos (no parte de una palabra ni de un id como "#123abc-x") y rgb()/rgba().
const PATRON = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\brgba?\s*\(/g;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === 'node_modules' ? [] : archivos(ruta);
    return EXTENSIONES.some((e) => nombre.endsWith(e)) && !/\.test\.[jt]sx?$/.test(nombre) ? [ruta] : [];
  });
}

describe('Colores escritos a mano', () => {
  it('fuera de la paleta solo quedan los colores justificados (archivo y línea)', () => {
    const hallazgos: string[] = [];
    for (const ruta of archivos(RAIZ_SRC)) {
      const rel = relative(RAIZ_SRC, ruta).split(sep).join('/');
      if (PALETA.includes(rel)) continue;
      const permitido = PERMITIDOS[rel];
      readFileSync(ruta, 'utf8').split(/\r?\n/).forEach((linea, i) => {
        for (const m of linea.matchAll(PATRON)) {
          const valor = m[0].toLowerCase();
          if (permitido?.valores.includes(valor)) continue;
          hallazgos.push(`${rel}:${i + 1}  ${m[0]}  →  ${linea.trim().slice(0, 110)}`);
        }
      });
    }
    expect(hallazgos, `Usa los tokens de styles/globals.css (var(--...)) en lugar de colores fijos:\n${hallazgos.join('\n')}`).toEqual([]);
  });

  it('cada excepción sigue existiendo y usa sus colores (la lista no se queda vieja)', () => {
    for (const [rel, { valores }] of Object.entries(PERMITIDOS)) {
      const contenido = readFileSync(join(RAIZ_SRC, rel), 'utf8').toLowerCase();
      for (const v of valores) expect(contenido.includes(v), `${rel} ya no usa ${v}: quítalo de PERMITIDOS`).toBe(true);
    }
  });
});

/**
 * Clases de Tailwind con color fijo: las de la paleta por defecto (text-gray-500, bg-white, border-slate-200,
 * bg-black/45…) y las arbitrarias con un color literal (bg-[#...], text-[rgb(...)], border-[color:#...]), con
 * cualquier variante delante (dark:, hover:, md:dark:hover:…). Las clases de los tokens de la paleta
 * (text-blanco, bg-negro/45, text-marfil, bg-[var(--hover)]…) no tienen nombres de la paleta de Tailwind y pasan.
 */
const COLORES_TAILWIND = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILIDADES_DE_COLOR = 'text|bg|border(?:-[xytrblse])?|ring(?:-offset)?|outline|divide|placeholder|fill|stroke|from|via|to|shadow|inset-shadow|inset-ring|decoration|accent|caret';
const VARIANTES = '(?:[a-z0-9-]+:)*!?';
const CLASE_PALETA_TAILWIND = new RegExp(
  `(?<![\\w-])${VARIANTES}(?:${UTILIDADES_DE_COLOR})-(?:(?:${COLORES_TAILWIND})-(?:50|[1-9]00|950)|white|black)(?:\\/(?:\\d{1,3}|\\[[^\\]\\s]+\\]))?(?![\\w-])`,
  'g',
);
const CLASE_COLOR_ARBITRARIO = new RegExp(
  `(?<![\\w-])${VARIANTES}(?:${UTILIDADES_DE_COLOR})-\\[(?:color:)?(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\\([^\\]]*\\))\\]`,
  'g',
);
const EXTENSIONES_TAILWIND = ['.ts', '.tsx', '.css'];

function clasesDeColorFijo(texto: string): string[] {
  return [...texto.matchAll(CLASE_PALETA_TAILWIND), ...texto.matchAll(CLASE_COLOR_ARBITRARIO)].map((m) => m[0]);
}

describe('Clases de Tailwind con color fijo', () => {
  it('el detector encuentra la paleta de Tailwind y los colores arbitrarios, con sus variantes', () => {
    for (const clase of [
      'text-gray-500', 'bg-white', 'bg-black', 'bg-black/45', 'border-slate-200', 'border-t-red-500', 'ring-white/25',
      'dark:text-zinc-400', 'hover:bg-red-600/50', 'group-hover:bg-black/0', 'md:dark:hover:fill-emerald-700',
      'from-sky-500', 'divide-gray-100', 'placeholder-neutral-400', 'shadow-black/[0.15]', '!text-white',
      'bg-[#F2F1ED]', 'text-[#fff]', 'text-[rgb(10,20,30)]', 'bg-[rgba(0,0,0,0.5)]', 'border-[color:#abc]', 'dark:bg-[hsl(0,0%,10%)]',
    ]) {
      expect(clasesDeColorFijo(`<div className="p-2 ${clase} rounded" />`), clase).toEqual([clase]);
    }
  });

  it('las clases de los tokens de la paleta y las que no son de color pasan', () => {
    for (const clase of [
      'text-blanco', 'bg-negro/45', 'text-marfil', 'bg-marfil', 'ring-blanco/25', 'bg-negro/0',
      'text-menu-texto-principal', 'bg-fondos-suaves', 'bg-[var(--hover)]', 'border-[var(--borde-visible)]',
      'text-[var(--danger-texto)]', 'bg-transparent', 'text-current', 'text-center', 'bg-gradient-to-r', 'mf-bg-white', 'text-sm',
    ]) {
      expect(clasesDeColorFijo(`<div className="p-2 ${clase} rounded" />`), clase).toEqual([]);
    }
  });

  it('ningún archivo .ts, .tsx o .css de src usa clases de color fijo (archivo y línea)', () => {
    const hallazgos: string[] = [];
    for (const ruta of archivos(RAIZ_SRC)) {
      if (!EXTENSIONES_TAILWIND.some((e) => ruta.endsWith(e))) continue;
      const rel = relative(RAIZ_SRC, ruta).split(sep).join('/');
      readFileSync(ruta, 'utf8').split(/\r?\n/).forEach((linea, i) => {
        for (const clase of clasesDeColorFijo(linea)) hallazgos.push(`${rel}:${i + 1}  ${clase}  →  ${linea.trim().slice(0, 110)}`);
      });
    }
    expect(
      hallazgos,
      `Usa las clases de los tokens (text-blanco, bg-negro/45, text-marfil, bg-[var(--...)]) en lugar de colores fijos de Tailwind:\n${hallazgos.join('\n')}`,
    ).toEqual([]);
  });
});
