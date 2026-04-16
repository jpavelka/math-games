import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

const svg = readFileSync('static/icon.svg', 'utf8');

const sizes = [
  { name: 'icon-192.png',     size: 192 },
  { name: 'icon-512.png',     size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  });
  const png = resvg.render();
  const buf = png.asPng();
  writeFileSync(`static/${name}`, buf);
  console.log(`generated static/${name} (${size}x${size})`);
}
