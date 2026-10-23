#!/usr/bin/env node
// Sunucu fonksiyonlarının kullandığı uygulama kodunu (src/) supabase/functions/_shared/app/ altına kopyalar.
// Supabase dağıtımı yalnızca supabase/functions klasörünü paketler; bu yüzden fonksiyonlar src/'yi doğrudan
// içe aktaramaz. Kopyalar açık .ts uzantılı göreli içe aktarmalarla yazılır (Deno uyumlu).
// Kullanım: node scripts/sync-function-shared.mjs   (src/ içinde bu dosyalar değişince yeniden çalıştırın)
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const src = join(root, 'src');
const out = join(root, 'supabase/functions/_shared/app');
const entries = ['features/earthquakes/repository.ts', 'features/earthquakes/sync.ts', 'features/earthquakes/rows.ts', 'features/earthquakes/format.core.ts', 'features/trust/tckn.ts', 'utils/geo.ts'];

const resolveFile = (p) => [p, `${p}.ts`, `${p}.tsx`, join(p, 'index.ts')].find((f) => existsSync(f) && !f.endsWith('/'));
const seen = new Set();
rmSync(out, { recursive: true, force: true });

function copy(file) {
  if (seen.has(file)) return;
  seen.add(file);
  let code = readFileSync(file, 'utf8');
  code = code.replace(/(from\s+|import\s*\(\s*)'([^']+)'/g, (m, kw, spec) => {
    let target;
    if (spec.startsWith('@/')) target = resolveFile(join(src, spec.slice(2)));
    else if (spec.startsWith('.')) target = resolveFile(resolve(dirname(file), spec));
    else return m;
    if (!target) throw new Error(`Çözülemedi: ${spec} (${relative(root, file)})`);
    copy(target);
    let rel = relative(dirname(file), target).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${kw}'${rel}'`;
  });
  const dest = join(out, relative(src, file));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/${relative(src, file)} (scripts/sync-function-shared.mjs)\n${code}`);
}
entries.forEach((e) => copy(join(src, e)));
console.log(`${seen.size} dosya kopyalandı → ${relative(root, out)}`);
