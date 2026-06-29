// Genera los iconos PNG de la PWA sin depender de fuentes del sistema.
// Marca: anillo dorado (champán) sobre fondo oscuro — el mismo motivo que
// el anillo de progreso de la app. Ejecuta: npm run icons
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public");

const BG = "#0d0d0e";
const TRACK = "#1e1e20";
const GOLD1 = "#e7c074";
const GOLD2 = "#d8a84e";

function svg(size, { ringScale = 0.62, rounded = false } = {}) {
  const cx = size / 2;
  const r = (size * ringScale) / 2;
  const stroke = size * 0.075;
  const c = 2 * Math.PI * r;
  const arc = c * 0.74; // 74% de vuelta
  const dotR = stroke * 0.62;
  // punto al inicio del arco (arriba), tras rotar -90 el inicio está arriba
  const dotX = cx;
  const dotY = cx - r;
  const radius = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD1}"/>
      <stop offset="1" stop-color="${GOLD2}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${TRACK}" stroke-width="${stroke}"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="url(#g)" stroke-width="${stroke}"
    stroke-linecap="round" stroke-dasharray="${arc} ${c}"
    transform="rotate(-90 ${cx} ${cx})"/>
  <circle cx="${dotX}" cy="${dotY}" r="${dotR}" fill="${GOLD1}"/>
</svg>`;
}

async function gen(name, size, opts) {
  await sharp(Buffer.from(svg(size, opts))).png().toFile(join(out, name));
  console.log("✓", name);
}

await gen("icon-192.png", 192, { ringScale: 0.64 });
await gen("icon-512.png", 512, { ringScale: 0.64 });
// maskable: anillo más pequeño dentro de la safe zone (80%)
await gen("icon-maskable-512.png", 512, { ringScale: 0.5 });
await gen("apple-touch-icon.png", 180, { ringScale: 0.64, rounded: false });
console.log("Iconos generados en /public");
