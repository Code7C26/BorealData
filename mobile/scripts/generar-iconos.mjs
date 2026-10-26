/**
 * Genera los íconos de la app móvil desde el isotipo "Umbral"
 * (`apps/public/logoAletheia-mark.svg`).
 *
 *   node scripts/generar-iconos.mjs
 *
 * Se corre a mano, solo cuando cambia la marca — por eso las piezas resultantes
 * están commiteadas y esto no es un paso del build.
 *
 * Rasteriza con el `sharp` que ya está instalado en `apps/node_modules`: es una
 * dependencia que Next arrastra igual, y sumarla a `mobile/` sería instalar un
 * binario nativo de 10 MB para una tarea que se hace una vez por semestre.
 */
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');
const SALIDA = resolve(AQUI, '..', 'assets', 'images');

const require = createRequire(resolve(RAIZ, 'apps', 'package.json'));
/** @type {import('sharp')} */
const sharp = require('sharp');

// Los mismos hex que `src/theme/tokens.ts` y que `apps/app/global.css`.
const NOCHE = '#0B100F';
const AURORA_500 = '#7A5AF8';
const AURORA_700 = '#4C2FB8';
const LUZ = '#F2E8D5';

/** Las dos figuras del isotipo, en el viewBox 0 0 64 64 original. */
function marca(disco, velo) {
  return `
    <path d="M12.51 22 A24 24 0 1 0 51.49 22 Z" fill="${disco}"/>
    <rect x="8" y="6" width="48" height="8" rx="4" fill="${velo}"/>
  `;
}

/**
 * Mete la marca en un lienzo cuadrado de `size`, ocupando `escala` de su ancho.
 * El isotipo no es simétrico en vertical (el velo deja aire arriba), así que se
 * centra por la caja real de tinta: y de 6 a 60 dentro del viewBox.
 */
function lienzo({ size, escala, fondo, disco, velo, glow = false }) {
  const lado = size * escala;
  const x = (size - lado) / 2;
  const alto = (60 - 6) / 64;
  const y = (size - lado * alto) / 2 - (lado * 6) / 64;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="aurora" cx="50%" cy="38%" r="62%">
      <stop offset="0%" stop-color="${AURORA_700}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="${AURORA_700}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${NOCHE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${fondo ? `<rect width="${size}" height="${size}" fill="${fondo}"/>` : ''}
  ${glow ? `<rect width="${size}" height="${size}" fill="url(#aurora)"/>` : ''}
  <svg x="${x}" y="${y}" width="${lado}" height="${lado}" viewBox="0 0 64 64">
    ${marca(disco, velo)}
  </svg>
</svg>`);
}

const piezas = [
  // Ícono principal (iOS y fallback): a sangre, con el glow de aurora detrás.
  { nombre: 'icon.png', size: 1024, escala: 0.6, fondo: NOCHE, glow: true, disco: AURORA_500, velo: LUZ },
  // Adaptativo de Android: la capa de adelante va transparente y más chica,
  // porque el launcher recorta hasta un tercio del lienzo según su forma.
  { nombre: 'android-icon-foreground.png', size: 432, escala: 0.46, fondo: null, disco: AURORA_500, velo: LUZ },
  { nombre: 'android-icon-background.png', size: 432, escala: 0, fondo: NOCHE, glow: true, disco: 'none', velo: 'none' },
  // Monocromo (temas dinámicos de Android 13+): una silueta, el sistema la tiñe.
  { nombre: 'android-icon-monochrome.png', size: 432, escala: 0.46, fondo: null, disco: '#FFFFFF', velo: '#FFFFFF' },
  // Splash: el plugin la escala a `imageWidth`, va transparente.
  { nombre: 'splash-icon.png', size: 512, escala: 0.82, fondo: null, disco: AURORA_500, velo: LUZ },
  { nombre: 'favicon.png', size: 64, escala: 0.82, fondo: null, disco: AURORA_500, velo: LUZ },
];

await mkdir(SALIDA, { recursive: true });

for (const pieza of piezas) {
  await sharp(lienzo(pieza), { density: 384 })
    .png({ compressionLevel: 9 })
    .toFile(resolve(SALIDA, pieza.nombre));
  console.log(`${pieza.nombre} ${pieza.size}x${pieza.size}`);
}
