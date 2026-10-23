import { visibleLabels } from '../offline/base';

describe('harita şehir etiketleri', () => {
  it('Türkiye görünümünde Kocaeli ile Sakarya birlikte çizilmez (üst üste biner)', () => {
    for (const z of [4.8, 5.9, 6.5]) {
      const names = visibleLabels(z).map((l) => l.name);
      expect(names.includes('Kocaeli') && names.includes('Sakarya')).toBe(false);
    }
  });
  it('büyük şehirler korunur', () => {
    const z6 = visibleLabels(5.9).map((l) => l.name);
    expect(z6).toEqual(expect.arrayContaining(['İstanbul', 'Ankara', 'İzmir']));
  });
  it('yakınlaştırınca daha çok il görünür', () => {
    expect(visibleLabels(8).length).toBeGreaterThan(visibleLabels(5).length);
  });
});
