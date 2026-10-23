import { ART_IDS } from '../Art';
import {
  CATEGORIES,
  CHECKED_AT,
  EMERGENCY_NUMBER,
  PUBLISHED_TOPICS,
  QUICK_LINKS,
  REVIEW_ITEMS,
  SOURCES,
  TOPICS,
  isStale,
  shown,
  topicById,
  topicSources,
} from '../content';
import { prepChecklist, prepProgress } from '../prep';

describe('acil durum rehberi içeriği', () => {
  it('gösterilen her madde en az bir kaynağa dayanır; kaynaklar tanımlı ve https', () => {
    for (const t of PUBLISHED_TOPICS)
      for (const i of [...shown(t.doList), ...shown(t.why), ...shown(t.dontList)]) {
        expect(i.src.length).toBeGreaterThan(0);
        i.src.forEach((s) => expect(SOURCES[s]).toBeDefined());
      }
    for (const s of Object.values(SOURCES)) {
      if (s.url) expect(s.url).toMatch(/^https:\/\//);
      expect(s.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('her konuda ne yapmalı + neden + kaynak var; görsel tanımlı', () => {
    for (const t of PUBLISHED_TOPICS) {
      expect(shown(t.doList).length).toBeGreaterThan(0);
      expect(shown(t.why).length).toBeGreaterThan(0);
      expect(topicSources(t).length).toBeGreaterThan(0);
      expect(ART_IDS).toContain(t.art);
    }
  });
  it('kaynakla doğrulanamayan/çelişkili maddeler gösterilmez ama inceleme listesinde', () => {
    expect(REVIEW_ITEMS.length).toBeGreaterThan(0);
    for (const r of REVIEW_ITEMS) expect(r.note ?? '').not.toBe('');
    const all = PUBLISHED_TOPICS.flatMap((t) => [...shown(t.doList), ...shown(t.dontList)].map((i) => i.t)).join(' ');
    expect(all).not.toMatch(/hayat üçgeni/i);
  });
  it('ana sayfa kısayolları ve kategoriler var olan konulara gider; istenen 7 başlık mevcut', () => {
    expect(QUICK_LINKS.map((q) => q.label)).toEqual([
      'Deprem anında ne yapmalıyım?',
      'Deprem sonrasında ne yapmalıyım?',
      'Enkaz altında kaldım',
      'Dışarıdaysam',
      'Araçtaysam',
      'Aileme nasıl ulaşırım?',
      'Acil durum çantam hazır mı?',
    ]);
    for (const q of QUICK_LINKS) if (q.target.kind === 'topic') expect(topicById(q.target.id)).not.toBeNull();
    for (const c of CATEGORIES) expect(PUBLISHED_TOPICS.some((t) => t.cat === c.id)).toBe(true);
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });
  it('acil numara 112; enkaz konusu uygulamadaki Enkaz Altı Moduna bağlanır', () => {
    expect(EMERGENCY_NUMBER).toBe('112');
    expect(topicById('trapped')?.link?.href).toBe('/enkaz');
  });
  it('enkaz konusu kesin süre/olasılık vaadi veya enkaz kaldırma önerisi içermez', () => {
    const t = topicById('trapped')!;
    const text = [...shown(t.doList), ...shown(t.why)].map((i) => i.t).join(' ');
    expect(text).not.toMatch(/\d+\s*(saat|gün)|%\s*\d|garanti|kesin(likle)? kurtar/i);
    expect(text).not.toMatch(/enkazı kaldır|kendiniz çıkar/i);
  });
  it('aile: yanıt vermemek tehlike işareti sayılmaz', () => {
    const t = topicById('family')!;
    expect(shown(t.dontList).map((i) => i.t).join(' ')).toMatch(/tek başına “tehlikede” işareti olarak yorumlamayın/);
  });
  it('doğrulama tarihi bir yıldan eskiyse uyarı verir', () => {
    expect(isStale(Date.parse(CHECKED_AT) + 10 * 86400_000)).toBe(false);
    expect(isStale(Date.parse(CHECKED_AT) + 400 * 86400_000)).toBe(true);
  });
  it('hazırlık listesi: ilerleme yüzdesi', () => {
    const keys = prepChecklist().flatMap((g) => g.items.map((i) => i.key));
    expect(keys.length).toBeGreaterThan(8);
    expect(new Set(keys).size).toBe(keys.length);
    expect(prepProgress([]).percent).toBe(0);
    expect(prepProgress(keys).percent).toBe(100);
    expect(prepProgress(keys.slice(0, 1)).done).toBe(1);
  });
});

describe('uygulama içi bağlantılar', () => {
  it('Acil Durum sekmesindeki Çök-Kapan-Tutun adımları var olan konulara gider', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../../app/(tabs)/acil.tsx'), 'utf8') as string;
    const ids = [...src.matchAll(/'\/rehber\/\[id\]', params: \{ id: n === 4 \? '([^']+)' : '([^']+)'/g)].flatMap((m) => [m[1], m[2]]);
    expect(ids.length).toBe(2);
    for (const id of ids) expect(topicById(id!)).not.toBeNull();
  });
});
