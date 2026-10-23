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

describe('konum noktası', () => {
  it('kullanıcının noktasının altındaki şehir adı çizilmez', () => {
    const duzce = { latitude: 40.8438, longitude: 31.1565 };
    expect(visibleLabels(6.5).map((l) => l.name)).toContain('Düzce');
    expect(visibleLabels(6.5, [duzce]).map((l) => l.name)).not.toContain('Düzce');
  });
});

describe('fay hatları', () => {
  it('çizgiler GeoJSON LineString olarak çizilir', () => {
    const { faultsToGeoJSON } = require('../faults');
    const fc = faultsToGeoJSON([{ id: 1, slip: 'Dextral', coords: [[30, 40.7], [31, 40.8]] }]);
    expect(fc.features[0].geometry).toEqual({ type: 'LineString', coordinates: [[30, 40.7], [31, 40.8]] });
    expect(fc.features[0].properties).toEqual({ kind: 'fault', slip: 'Dextral' });
  });
});
