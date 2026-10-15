// Recalcula el hash de cada documento del registro src/app/utils/documentosLegales.ts e imprime su slug, su
// versión, el hash calculado y si coincide con el registrado.
//
// Regla del hash: SHA-256 (hex, UTF-8) del texto visible de la página ya pintada con React
// (renderToStaticMarkup de src/app<ruta sin ancla>/page.tsx, sin el Header ni el Footer), sin etiquetas, con las
// entidades decodificadas y con los espacios y saltos de línea colapsados en uno solo. Así el hash cubre también
// el texto que la página toma de otros módulos (plazos de PLAZOS_TERMINOS, horario del salón, teléfonos de
// Profeco) y no cambia si solo cambian clases o etiquetas. Anticipos comparte la página de reembolsos.
//
// Quien pinta las páginas y calcula el hash es la prueba "Hash del texto publicado" de
// src/app/components/legal/paginasLegales.test.ts. Este script la corre con el vitest del proyecto (sin
// dependencias nuevas) y le pide que escriba los hashes en un archivo temporal. Lo mismo, a mano:
//   HASH_DOCUMENTOS_LEGALES_SALIDA=hashes.json npx vitest run src/app/components/legal/paginasLegales.test.ts -t "Hash del texto publicado"
//
// Al cambiar el texto de una página legal: sube su versión en el registro, corre este script, copia el hash
// nuevo al registro y siembra esa versión en el backend (versiones_documentos_legales es de solo inserción:
// va como fila nueva en una migración nueva).
// Uso: node scripts/hash-documentos-legales.mjs            (hashes)
//      node scripts/hash-documentos-legales.mjs --texto    (además, el texto exacto al que se le sacó cada hash)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const VITEST = join(RAIZ, 'node_modules', 'vitest', 'vitest.mjs');
const PRUEBA = 'src/app/components/legal/paginasLegales.test.ts';
const NOMBRE_PRUEBA = 'Hash del texto publicado';

if (!existsSync(VITEST)) {
  console.error('No se encontró vitest en node_modules: corre npm install en la raíz de la web.');
  process.exit(1);
}

const carpeta = mkdtempSync(join(tmpdir(), 'hash-documentos-legales-'));
const salida = join(carpeta, 'hashes.json');
let documentos;
try {
  const corrida = spawnSync(process.execPath, [VITEST, 'run', PRUEBA, '-t', NOMBRE_PRUEBA], {
    cwd: RAIZ,
    env: { ...process.env, HASH_DOCUMENTOS_LEGALES_SALIDA: salida },
    encoding: 'utf8',
  });
  if (!existsSync(salida)) {
    console.error(corrida.stdout, corrida.stderr);
    console.error('La prueba no escribió los hashes: revisa el error de vitest de arriba.');
    process.exit(1);
  }
  documentos = JSON.parse(readFileSync(salida, 'utf8'));
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}

const conTexto = process.argv.includes('--texto');
let distintos = 0;
for (const doc of documentos) {
  const estado = doc.registrado === doc.hash ? 'registro: coincide' : doc.registrado ? 'registro: DISTINTO' : 'registro: sin hash';
  if (doc.registrado !== doc.hash) distintos++;
  console.log(`${doc.slug.padEnd(17)} ${doc.version.padEnd(5)} ${doc.hash}  ${estado}`);
  if (conTexto) console.log(`\n${doc.texto}\n`);
}
if (distintos > 0) console.log(`\n${distintos} documento(s) sin el hash actual en src/app/utils/documentosLegales.ts`);
