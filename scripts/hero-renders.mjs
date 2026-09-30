// Convierte los renders del hero (public/hero/*.png, fondo transparente) a AVIF/WebP con alfa.
// Recorta el margen transparente (mismo encuadre en todos) y genera tamaños para móvil/escritorio.
// Uso: node scripts/hero-renders.mjs   (sharp viene con Next; no es dependencia nueva)
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const ORIGEN = 'public/hero';
const DESTINO = 'public/hero/web';
mkdirSync(DESTINO, { recursive: true });

const FRASCO = { left: 135, top: 77, width: 630, height: 2046 };
const GIRO = { left: 89, top: 51, width: 422, height: 1364 };

for (const nombre of ['goji', 'argan', 'platino', 'hialuronico']) {
  for (const ancho of [240, 420]) {
    const base = sharp(`${ORIGEN}/${nombre}.png`).extract(FRASCO).resize({ width: ancho });
    await base.clone().avif({ quality: 55, effort: 6 }).toFile(`${DESTINO}/${nombre}-${ancho}.avif`);
    await base.clone().webp({ quality: 78, alphaQuality: 90, effort: 6 }).toFile(`${DESTINO}/${nombre}-${ancho}.webp`);
  }
}

for (let i = 0; i < 24; i++) {
  const n = String(i).padStart(2, '0');
  const base = sharp(`${ORIGEN}/goji_giro/goji_giro_${n}.png`).extract(GIRO);
  await base.clone().resize({ width: 360 }).webp({ quality: 76, alphaQuality: 90, effort: 6 }).toFile(`${DESTINO}/giro-${n}.webp`);
}
console.log('listo');
