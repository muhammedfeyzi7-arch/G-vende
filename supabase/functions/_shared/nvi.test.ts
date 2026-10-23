import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import { isValidBirthYear, isValidTckn, normalizeNamePart } from '@/features/trust/tckn';
import { buildNviEnvelope, callNvi, identityHash, parseNviResult } from './nvi.ts';

Deno.test('TCKN sağlama algoritması', () => {
  assertEquals(isValidTckn('10000000146'), true); // NVİ örnek test numarası
  assertEquals(isValidTckn('10000000147'), false);
  assertEquals(isValidTckn('00000000146'), false);
  assertEquals(isValidTckn('1000000014'), false);
});

Deno.test('ad ve doğum yılı normalleştirme', () => {
  assertEquals(normalizeNamePart('  ayşe   ılgın '), 'AYŞE ILGIN');
  assertEquals(normalizeNamePart('çiğdem'), 'ÇİĞDEM');
  assertEquals(isValidBirthYear(1985, new Date('2026-10-23')), true);
  assertEquals(isValidBirthYear(2020, new Date('2026-10-23')), false);
});

Deno.test('SOAP zarfı ve XML kaçışı', () => {
  const x = buildNviEnvelope({ tckn: '10000000146', firstName: 'A<B', lastName: 'C&D', birthYear: 1990 });
  assertEquals(x.includes('<Ad>A&lt;B</Ad>'), true);
  assertEquals(x.includes('<Soyad>C&amp;D</Soyad>'), true);
  assertEquals(x.includes('<DogumYili>1990</DogumYili>'), true);
});

Deno.test('yanıt ayrıştırma', () => {
  assertEquals(parseNviResult('<x><TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult></x>'), true);
  assertEquals(parseNviResult('<x><TCKimlikNoDogrulaResult>false</TCKimlikNoDogrulaResult></x>'), false);
  assertEquals(parseNviResult('<html>hata</html>'), null);
});

Deno.test('servis hatasında doğrulanmış sayılmaz', async () => {
  const fake = (() => Promise.resolve(new Response('err', { status: 500 }))) as typeof fetch;
  assertEquals(await callNvi({ tckn: '10000000146', firstName: 'A', lastName: 'B', birthYear: 1990 }, fake), null);
});

Deno.test('kimlik özeti anahtara bağlı ve sabit', async () => {
  const a = await identityHash('10000000146', 'x'.repeat(32));
  assertEquals(a, await identityHash('10000000146', 'x'.repeat(32)));
  assertNotEquals(a, await identityHash('10000000146', 'y'.repeat(32)));
  assertEquals(a.length, 64);
});
