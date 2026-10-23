import { WINDOW, downsample, initialVibration, levelOf, rms, step } from './vibration';

describe('vibration', () => {
  it('telefon dururken yerçekimini çıkarır ve sıfıra yakın ölçer', () => {
    let s = initialVibration();
    for (let i = 0; i < 100; i++) s = step(s, { x: 0, y: 0, z: -1 });
    expect(rms(s.samples)).toBeLessThan(1e-9);
    expect(levelOf(rms(s.samples)).key).toBe('still');
  });

  it('titreşimi ölçer, tepe değeri tutar ve pencereyi sınırlar', () => {
    let s = initialVibration();
    for (let i = 0; i < 400; i++) s = step(s, { x: i % 2 ? 0.1 : -0.1, y: 0, z: -1 });
    expect(s.samples).toHaveLength(WINDOW);
    expect(rms(s.samples)).toBeGreaterThan(0.08);
    expect(s.peak).toBeGreaterThanOrEqual(rms(s.samples));
    expect(levelOf(rms(s.samples)).key).toBe('moderate');
  });

  it('düzeyleri sınıflandırır', () => {
    expect(levelOf(0.02).key).toBe('light');
    expect(levelOf(0.5).key).toBe('strong');
  });

  it('grafik için tepe değerleri koruyarak indirger', () => {
    const d = downsample([0, 0, 5, 0, 0, 0, 1, 0], 4);
    expect(d).toEqual([0, 5, 0, 1]);
    expect(downsample([1, 2], 10)).toEqual([1, 2]);
  });
});
