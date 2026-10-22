#!/usr/bin/env node
/**
 * Resmî toplanma alanı verisini (GeoJSON Point FeatureCollection) Supabase'e aktarır.
 *
 * Yalnızca doğrulanabilir resmî kaynaklardan (ör. belediye açık veri portalı, AFAD)
 * indirilen dosyalarla kullanın. Kaynakta olmayan alan üretilmez; eksik/geçersiz
 * koordinatlı kayıtlar atlanır ve raporlanır.
 *
 * Kullanım (varsayılan: kuru çalıştırma, veritabanına yazmaz):
 *   node scripts/import-assembly-points.mjs veri.geojson \
 *     --source-name "İBB Açık Veri Portalı — Afet Toplanma Alanları" \
 *     --source-url "https://data.ibb.gov.tr/..." \
 *     --published 2026-01-15 \
 *     --name-field ADI --id-field ID --district-field ILCE --province "İstanbul" \
 *     [--commit]
 *
 * --commit için ortam değişkenleri: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (servis anahtarı yalnızca bu yönetici betiğinde kullanılır; uygulamaya asla eklenmez).
 */
import { readFileSync } from 'node:fs';

const TR = { minLat: 35.5, maxLat: 42.5, minLon: 25.5, maxLon: 45.0 };

function parseArgs(argv) {
  const out = { file: null, commit: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--commit') out.commit = true;
    else if (a.startsWith('--')) out[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
    else out.file = a;
  }
  return out;
}

export function mapFeatures(geojson, opt) {
  const ok = [];
  const skipped = [];
  for (const [i, f] of (geojson.features ?? []).entries()) {
    const p = f.properties ?? {};
    const [lon, lat] = f.geometry?.type === 'Point' ? f.geometry.coordinates : [];
    const name = String(p[opt.nameField] ?? '').trim();
    const reason = !name
      ? 'isim yok'
      : typeof lat !== 'number' || typeof lon !== 'number'
        ? 'koordinat yok'
        : lat < TR.minLat || lat > TR.maxLat || lon < TR.minLon || lon > TR.maxLon
          ? 'Türkiye dışında / eksen ters olabilir'
          : null;
    if (reason) {
      skipped.push({ index: i, reason });
      continue;
    }
    ok.push({
      name,
      address: opt.addressField ? (p[opt.addressField] ?? null) : null,
      province: opt.province ?? (opt.provinceField ? p[opt.provinceField] : null) ?? null,
      district: opt.districtField ? (p[opt.districtField] ?? null) : null,
      neighborhood: opt.neighborhoodField ? (p[opt.neighborhoodField] ?? null) : null,
      latitude: lat,
      longitude: lon,
      capacity: opt.capacityField && Number.isFinite(Number(p[opt.capacityField])) ? Number(p[opt.capacityField]) : null,
      source_name: opt.sourceName,
      source_url: opt.sourceUrl,
      source_record_id: opt.idField ? String(p[opt.idField]) : `${opt.sourceName}#${i}`,
      source_published_at: opt.published ?? null,
    });
  }
  return { ok, skipped };
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  if (!opt.file || !opt.sourceName || !opt.sourceUrl || !opt.nameField) {
    console.error('Gerekli: <dosya> --source-name --source-url --name-field');
    process.exit(1);
  }
  const { ok, skipped } = mapFeatures(JSON.parse(readFileSync(opt.file, 'utf8')), opt);
  console.log(`Geçerli: ${ok.length}, atlanan: ${skipped.length}`);
  for (const s of skipped.slice(0, 20)) console.log(`  - #${s.index}: ${s.reason}`);
  if (!opt.commit) {
    console.log('Kuru çalıştırma: veritabanına yazılmadı. Yazmak için --commit ekleyin.');
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (let i = 0; i < ok.length; i += 500) {
    const { error } = await sb.from('assembly_points').upsert(ok.slice(i, i + 500), { onConflict: 'source_name,source_record_id' });
    if (error) throw error;
  }
  console.log(`${ok.length} kayıt aktarıldı.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => (console.error(e), process.exit(1)));
