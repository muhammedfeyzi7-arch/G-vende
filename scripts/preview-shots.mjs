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
  { route: '/ailem', name: 'ailem-koyu', theme: 'dark', w: 393, h: 852 },
  { route: '/ailem', name: 'ailem-koyu-2', theme: 'dark', w: 393, h: 852, scroll: 700 },
  { route: '/ailem', name: 'ailem-acik', theme: 'light', w: 393, h: 852 },
  // Yalnızca görüntü testi: tarayıcı deposuna tek bir "Test Kişi" yazılır (uygulamaya veri eklenmez).
  { route: '/ailem', name: 'ailem-test-kisi', theme: 'dark', w: 393, h: 852, seedContact: true },
  { route: '/ailem', name: 'ailem-kucuk', theme: 'dark', w: 320, h: 640 },
  { route: '/ayarlar', name: 'ayarlar-koyu', theme: 'dark', w: 393, h: 852 },
  { route: '/ayarlar', name: 'ayarlar-koyu-2', theme: 'dark', w: 393, h: 852, scroll: 760 },
  { route: '/ayarlar', name: 'ayarlar-acik', theme: 'light', w: 393, h: 852 },
  { route: '/ayarlar', name: 'ayarlar-kucuk', theme: 'dark', w: 320, h: 640 },
  { route: '/acil', name: 'acil-koyu', theme: 'dark', w: 393, h: 852 },
  { route: '/acil', name: 'acil-koyu-2', theme: 'dark', w: 393, h: 852, scroll: 700 },
  { route: '/acil', name: 'acil-acik', theme: 'light', w: 393, h: 852 },
  { route: '/acil', name: 'acil-kucuk', theme: 'dark', w: 320, h: 640 },
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
  await ctx.addInitScript(
    ([theme, seed]) => {
      localStorage.setItem('guvende:v1:settings', JSON.stringify({ onboardingSeen: true, theme }));
      if (seed) localStorage.setItem('guvende:v1:local-contacts', JSON.stringify([{ id: 't1', name: 'Test Kişi', phone: '+905000000000', relation: 'Test Kişi', status: null }]));
    },
    [s.theme, !!s.seedContact],
  );
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
  await page.waitForTimeout(s.route === '/harita' ? 12000 : 6000);
  if (s.scroll) {
    await page.evaluate((y) => {
      const el = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible').sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (el) el.scrollTop = y;
    }, s.scroll);
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: join(out, `${s.name}.png`) });
  console.log(`${s.name}: harita karoları başarılı=${tiles.ok} başarısız=${tiles.fail}`);
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'Sayfa hatası yok');
await browser.close();
server.close();
