import { floorFromHeight, floorLabel, heightDiffM } from '../floor';
import { SAVER_CYCLE_MS, SOS_MS, torchDuty } from '../plan';

describe('Enkaz Altı Modu zamanlaması', () => {
  it('SOS deseni ~10 sn, pil korumada 30 sn döngüye sığar', () => {
    expect(SOS_MS).toBeGreaterThan(8000);
    expect(SOS_MS).toBeLessThan(SAVER_CYCLE_MS);
  });
  it('pil koruma ışığı sürekliye göre çok daha az yakar', () => {
    expect(torchDuty('saver')).toBeLessThan(torchDuty('continuous') / 2);
    expect(torchDuty('saver')).toBeLessThan(0.25);
  });
});

describe('barometreyle kat', () => {
  it('basınç farkından yükseklik (deniz seviyesinde ~0,12 hPa/m)', () => {
    expect(heightDiffM(1013.25, 1011.8)).toBeCloseTo(12, 0);
    expect(heightDiffM(1013.25, 1013.25)).toBe(0);
  });
  it('yükseklikten kat; küçük gürültü zemin sayılır, bodrum eksi', () => {
    expect(floorFromHeight(12.2)).toBe(4);
    expect(floorFromHeight(0.6)).toBe(0);
    expect(floorFromHeight(-3.1)).toBe(-1);
  });
  it('kat etiketi', () => {
    expect(floorLabel('4')).toBe('4. kat');
    expect(floorLabel('0')).toBe('zemin kat');
    expect(floorLabel('-1')).toBe('bodrum (-1)');
    expect(floorLabel('çatı katı')).toBe('çatı katı');
    expect(floorLabel(' ')).toBeNull();
  });
});
