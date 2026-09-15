import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const ICONS_DIR = "public/icons";
await mkdir(ICONS_DIR, { recursive: true });

const PURPLE = "#5B3FA6";

function markSvg({ size, padding, background }) {
  const ringStroke = size * 0.09;
  const inner = size - padding * 2;
  const r1x = padding;
  const r1y = padding + inner * 0.18;
  const r1w = inner * 0.62;
  const r1h = inner * 0.44;
  const r2x = padding + inner * 0.28;
  const r2y = padding + inner * 0.24;
  const r2w = inner * 0.62;
  const r2h = inner * 0.44;
  const radius = Math.min(r1w, r1h) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${background}"/>` : ""}
    <rect x="${r1x}" y="${r1y}" width="${r1w}" height="${r1h}" rx="${radius}" fill="none" stroke="#FFFFFF" stroke-width="${ringStroke}"/>
    <rect x="${r2x}" y="${r2y}" width="${r2w}" height="${r2h}" rx="${radius}" fill="none" stroke="#F27866" stroke-width="${ringStroke}"/>
  </svg>`;
}

async function renderPng(svg, size, outPath) {
  const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(outPath, buffer);
  console.log(`wrote ${outPath}`);
}

// Ícone padrão (com fundo, para instalação/PWA)
await renderPng(markSvg({ size: 512, padding: 512 * 0.16, background: PURPLE }), 512, `${ICONS_DIR}/icon-512.png`);
await renderPng(markSvg({ size: 192, padding: 192 * 0.16, background: PURPLE }), 192, `${ICONS_DIR}/icon-192.png`);

// Ícone maskable (mais respiro nas bordas, para recorte adaptativo do Android)
await renderPng(
  markSvg({ size: 512, padding: 512 * 0.28, background: PURPLE }),
  512,
  `${ICONS_DIR}/icon-maskable-512.png`
);

// Apple touch icon (sem transparência, cantos quadrados — o iOS aplica a máscara)
await renderPng(markSvg({ size: 180, padding: 180 * 0.18, background: PURPLE }), 180, `${ICONS_DIR}/icon-180.png`);

// Favicon simples
await renderPng(markSvg({ size: 32, padding: 32 * 0.14, background: PURPLE }), 32, `${ICONS_DIR}/favicon-32.png`);

// SVG vetorial (com fundo) para navegadores modernos
await writeFile(`${ICONS_DIR}/icon.svg`, markSvg({ size: 64, padding: 64 * 0.16, background: PURPLE }));

console.log("Ícones gerados em public/icons/");
