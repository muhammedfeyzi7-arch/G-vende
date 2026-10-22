import { assertEquals } from 'jsr:@std/assert@1';
import { selectRecipients, type Pref } from './recipients';

const now = new Date('2026-10-22T19:00:00Z');
const base: Pref = { user_id: 'u', quakes_enabled: true, min_magnitude: 4, region_lat: 40.69, region_lon: 30.4, region_radius_km: 150, min_interval_minutes: 10 };
const duzce = { magnitude: 4.8, latitude: 40.77, longitude: 30.99 };

Deno.test('bölge içindeki ve eşiği geçen olay için seçer', () => {
  assertEquals(selectRecipients(duzce, [base], new Map(), now), ['u']);
});
Deno.test('eşiğin altındaki olay için seçmez', () => {
  assertEquals(selectRecipients({ ...duzce, magnitude: 3.9 }, [base], new Map(), now), []);
});
Deno.test('bölge dışı olay için seçmez', () => {
  assertEquals(selectRecipients({ ...duzce, latitude: 38.5, longitude: 43.4 }, [base], new Map(), now), []);
});
Deno.test('bölge tanımsızsa yalnızca M5+', () => {
  const p = { ...base, region_lat: null, region_lon: null };
  assertEquals(selectRecipients(duzce, [p], new Map(), now), []);
  assertEquals(selectRecipients({ ...duzce, magnitude: 5.2 }, [p], new Map(), now), ['u']);
});
Deno.test('en kısa aralık dolmadan tekrar göndermez', () => {
  const recent = new Map([['u', '2026-10-22T18:55:00Z']]);
  const old = new Map([['u', '2026-10-22T18:40:00Z']]);
  assertEquals(selectRecipients(duzce, [base], recent, now), []);
  assertEquals(selectRecipients(duzce, [base], old, now), ['u']);
});
Deno.test('kapalı tercih veya bilinmeyen büyüklük', () => {
  assertEquals(selectRecipients(duzce, [{ ...base, quakes_enabled: false }], new Map(), now), []);
  assertEquals(selectRecipients({ ...duzce, magnitude: null }, [base], new Map(), now), []);
});
