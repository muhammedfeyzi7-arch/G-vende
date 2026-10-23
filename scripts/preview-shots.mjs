/**
 * Web önizlemesinin ekran görüntüleri (gerçek ağ: Supabase, harita karoları). İnternet erişimi olan
 * ortamda (GitHub Actions) çalıştırılır; örnek/sahte veri eklenmez.
 *   node scripts/preview-shots.mjs <dist klasörü> <çıktı klasörü>
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const [dist = 'dist', out = 'shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(dist, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = existsSync(f + '.html') ? f + '.html' : join(dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(8099);

const SHOTS = [
  { route: '/harita', name: 'harita-koyu', theme: 'dark', w: 393, h: 852 },
  { route: '/harita', name: 'harita-acik', theme: 'light', w: 393, h: 852 },
  { route: '/harita', name: 'harita-kucuk', theme: 'dark', w: 320, h: 640 },
];
const browser = await chromium.launch();
const errors = [];
for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.grantPermissions(['geolocation']);
  // İzmir Konak (resmî İzmir BB toplanma alanı verisinin bulunduğu bölge)
  await ctx.setGeolocation({ latitude: 38.4189, longitude: 27.1287 });
  await ctx.addInitScript((theme) => localStorage.setItem('guvende:v1:settings', JSON.stringify({ onboardingSeen: true, theme })), s.theme);
  const page = await ctx.newPage();
  const tiles = { ok: 0, fail: 0 };
  page.on('response', (r) => {
    if (/openfreemap|eox\.at/.test(r.url())) r.ok() ? tiles.ok++ : tiles.fail++;
  });
  page.on('requestfailed', (r) => {
    if (/openfreemap|eox\.at/.test(r.url())) tiles.fail++;
  });
  page.on('pageerror', (e) => errors.push(`${s.name}: ${e.message.split('\n')[0]}`));
  await page.goto(`http://localhost:8099${s.route}`, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(12000);
  await page.screenshot({ path: join(out, `${s.name}.png`) });
  console.log(`${s.name}: harita karoları başarılı=${tiles.ok} başarısız=${tiles.fail}`);
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'Sayfa hatası yok');
await browser.close();
server.close();
