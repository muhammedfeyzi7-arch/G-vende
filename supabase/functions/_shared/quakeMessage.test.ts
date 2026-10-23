import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { quakePushContent, trTime } from './quakeMessage.ts';

const reading = {
  source: 'afad' as const,
  sourceEventId: '1',
  magnitude: 4.8,
  magnitudeType: 'ML',
  latitude: 40.77,
  longitude: 30.99,
  depthKm: 10,
  occurredAt: '2026-10-23T11:05:00.000Z',
  sourceUpdatedAt: null,
  fetchedAt: '2026-10-23T11:07:00.000Z',
  place: 'Gölyaka (Düzce)',
  url: null,
  reviewStatus: 'unknown' as const,
};

Deno.test('olay saati Türkiye saatine çevrilir', () => {
  assertStringIncludes(trTime('2026-10-23T11:05:00.000Z'), '14:05');
});
Deno.test('bildirim kaynak, büyüklük ve saati içerir; erken uyarı olmadığını söyler', () => {
  const c = quakePushContent({ id: 'afad:1', primary: reading, readings: [reading, { ...reading, source: 'kandilli' }] });
  assertEquals(c.title, 'Deprem kaydedildi: M4,8 (ML) · Düzce · Gölyaka');
  assertStringIncludes(c.body, '14:05 TSİ');
  assertStringIncludes(c.body, 'kaynak: AFAD, Kandilli');
  assertStringIncludes(c.body, 'erken uyarı değildir');
});
