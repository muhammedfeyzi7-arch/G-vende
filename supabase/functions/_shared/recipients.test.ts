import { assertEquals } from 'jsr:@std/assert@1';
import { readTickets, selectRecipients, sendExpoPush, type ExpoMessage, type Pref } from './recipients.ts';

const now = new Date('2026-10-22T19:00:00Z');
const base: Pref = { user_id: 'u', quakes_enabled: true, official_enabled: true, min_magnitude: 4, region_lat: 40.69, region_lon: 30.4, region_radius_km: 150, min_interval_minutes: 10 };
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
Deno.test('M5+ uzak deprem yalnızca resmî duyurular açıkken', () => {
  const far = { magnitude: 5.4, latitude: 38.5, longitude: 43.4 };
  assertEquals(selectRecipients(far, [base], new Map(), now), ['u']);
  assertEquals(selectRecipients(far, [{ ...base, official_enabled: false }], new Map(), now), []);
});
Deno.test('kapalı tercih veya bilinmeyen büyüklük', () => {
  assertEquals(selectRecipients(duzce, [{ ...base, quakes_enabled: false }], new Map(), now), []);
  assertEquals(selectRecipients({ ...duzce, magnitude: null }, [base], new Map(), now), []);
});

const msgs: ExpoMessage[] = [
  { to: 'ExponentPushToken[a]', title: 't', body: 'b' },
  { to: 'ExponentPushToken[b]', title: 't', body: 'b' },
  { to: 'ExponentPushToken[c]', title: 't', body: 'b' },
];
Deno.test('Expo yanıtı: kabul, geçersiz belirteç ve hata ayrılır', () => {
  const r = readTickets(msgs, {
    data: [
      { status: 'ok', id: '1' },
      { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', message: 'rate', details: { error: 'MessageRateExceeded' } },
    ],
  });
  assertEquals(r, { accepted: 1, invalidTokens: ['ExponentPushToken[b]'], errors: 2 });
});
Deno.test('Expo yanıtı bozuksa hiçbir mesaj kabul edilmiş sayılmaz', () => {
  assertEquals(readTickets(msgs, { nope: true }), { accepted: 0, invalidTokens: [], errors: 3 });
});
Deno.test('Expo erişilemezse hata sayılır, istisna fırlatılmaz', async () => {
  const failing = (() => Promise.reject(new TypeError('network'))) as unknown as typeof fetch;
  const r = await sendExpoPush(msgs, undefined, failing);
  assertEquals(r, { accepted: 0, invalidTokens: [], errors: 3 });
});
Deno.test('Expo 100 mesajlık parçalar halinde gönderilir', async () => {
  const many = Array.from({ length: 150 }, (_, i) => ({ to: `T${i}`, title: 't', body: 'b' }));
  let calls = 0;
  const ok = ((_: string, init: RequestInit) => {
    calls++;
    const n = JSON.parse(String(init.body)).length;
    return Promise.resolve(new Response(JSON.stringify({ data: Array.from({ length: n }, () => ({ status: 'ok' })) })));
  }) as unknown as typeof fetch;
  const r = await sendExpoPush(many, undefined, ok);
  assertEquals(calls, 2);
  assertEquals(r.accepted, 150);
});
