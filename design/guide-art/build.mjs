/**
 * Rehber illüstrasyonlarını raster dosyaya çevirir (Chromium ile):
 *   node design/guide-art/build.mjs [çıktı klasörü=assets/guide/art]
 * Opak sahneler 768×768 JPEG (kalite 86), saydam olanlar PNG.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCENES, wideCrop } from './scenes.mjs';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node22/lib/node_modules/playwright');
}

const out = process.argv[2] ?? 'assets/guide/art';
// Konu görselleri artık fotoğraf (design/guide-art/photos.py); burada yalnızca çizim kalanlar üretilir.
const DRAWN = new Set(['logo', 'quake-card']);
for (const k of Object.keys(SCENES)) if (!DRAWN.has(k)) delete SCENES[k];
// Liste satırları için yatay kesitler ("-wide"), 720×360 JPEG.
for (const [name, sc] of Object.entries({ ...SCENES })) {
  if (sc.wide) SCENES[`${name}-wide`] = { svg: wideCrop(sc.svg, sc.wide), size: [sc.wide[2], sc.wide[3]], scale: 720 / sc.wide[2] };
}
mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
for (const [name, s] of Object.entries(SCENES)) {
  const [w, h] = s.size ?? [400, 400];
  const scale = s.scale ?? (s.size ? 3 : 768 / 400);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${s.svg.replace('<svg ', '<svg style="display:block" ')}</body></html>`,
  );
  const el = await page.$('svg');
  await el.evaluate(
    (n, [w, h, k]) => {
      n.setAttribute('width', w * k);
      n.setAttribute('height', h * k);
    },
    [w, h, scale],
  );
  await page.setViewportSize({ width: Math.round(w * scale), height: Math.round(h * scale) });
  const file = join(out, `${name}.${s.transparent ? 'png' : 'jpg'}`);
  await el.screenshot(s.transparent ? { path: file, omitBackground: true } : { path: file, type: 'jpeg', quality: 86 });
  console.log(file);
}
await browser.close();
