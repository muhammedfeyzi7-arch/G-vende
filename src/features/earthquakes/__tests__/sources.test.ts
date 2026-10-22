import { readFileSync } from 'fs';
import { join } from 'path';
import { afadDate, parseAfad } from '../sources/afad';
import { decodeWindows1254, parseKandilli } from '../sources/kandilli';
import { parseUsgs } from '../sources/usgs';
import { SourceError } from '../sources/types';

const fx = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const FETCHED = '2026-10-22T19:00:00.000Z';

describe('AFAD ayrıştırıcı', () => {
  const rows = parseAfad(fx('afad.json'), FETCHED);

  it('geçerli kayıtları okur, geçersiz koordinatlıları atlar', () => {
    expect(rows.map((r) => r.sourceEventId)).toEqual(['700001', '700002', '700003']);
  });

  it('tarihi UTC olarak yorumlar ve alanları korur', () => {
    const r = rows[0]!;
    expect(r.occurredAt).toBe('2026-10-22T18:52:10.000Z');
    expect(r.magnitude).toBe(4.8);
    expect(r.magnitudeType).toBe('ML');
    expect(r.depthKm).toBe(10);
    expect(r.place).toBe('Gölyaka (Düzce)');
    expect(r.reviewStatus).toBe('reviewed');
    expect(r.sourceUpdatedAt).toBe('2026-10-22T18:58:00.000Z');
  });

  it('eksik büyüklük/derinliği uydurmaz', () => {
    const r = rows[2]!;
    expect(r.magnitude).toBeNull();
    expect(r.magnitudeType).toBeNull();
    expect(r.depthKm).toBeNull();
  });

  it('boş liste yanıtını kabul eder', () => {
    expect(parseAfad('[]', FETCHED)).toEqual([]);
  });

  it('bozuk yanıtta SourceError fırlatır', () => {
    expect(() => parseAfad('<html>', FETCHED)).toThrow(SourceError);
    expect(() => parseAfad('{"a":1}', FETCHED)).toThrow(SourceError);
  });

  it('filtre tarihini UTC biçimler', () => {
    expect(afadDate(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05');
  });
});

describe('Kandilli ayrıştırıcı', () => {
  const rows = parseKandilli(fx('kandilli.txt'), FETCHED);

  it('satırları okur, çöp satırları atlar', () => {
    expect(rows).toHaveLength(3);
  });

  it('Türkiye saatini UTC’ye çevirir', () => {
    expect(rows[0]!.occurredAt).toBe('2026-10-22T18:52:12.000Z');
  });

  it('Mw > ML > MD önceliğiyle büyüklüğü seçer, olmayanı uydurmaz', () => {
    expect([rows[0]!.magnitudeType, rows[0]!.magnitude]).toEqual(['Mw', 4.6]);
    expect([rows[1]!.magnitudeType, rows[1]!.magnitude]).toEqual(['ML', 2.0]);
    expect([rows[2]!.magnitudeType, rows[2]!.magnitude]).toEqual(['MD', 1.6]);
  });

  it('çözüm niteliğini ve revizyon zamanını okur', () => {
    expect(rows[0]!.reviewStatus).toBe('reviewed');
    expect(rows[0]!.sourceUpdatedAt).toBe('2026-10-22T18:59:30.000Z');
    expect(rows[0]!.place).toBe('GOLYAKA (DUZCE)');
    expect(rows[1]!.reviewStatus).toBe('automatic');
  });

  it('Windows-1254 Türkçe karakterleri çözer', () => {
    // "İlksel ŞĞÜÇÖ ışğ"
    const bytes = new Uint8Array([0xdd, 0x6c, 0x6b, 0x73, 0x65, 0x6c, 0x20, 0xde, 0xd0, 0xdc, 0xc7, 0xd6, 0x20, 0xfd, 0xfe, 0xf0]);
    expect(decodeWindows1254(bytes)).toBe('İlksel ŞĞÜÇÖ ışğ');
  });
});

describe('USGS ayrıştırıcı', () => {
  const rows = parseUsgs(fx('usgs.json'), FETCHED);
  it('GeoJSON özelliklerini eşler', () => {
    expect(rows[0]).toMatchObject({
      sourceEventId: 'us7000abcd',
      magnitude: 4.9,
      magnitudeType: 'mb',
      latitude: 40.79,
      longitude: 31.01,
      depthKm: 10,
      reviewStatus: 'reviewed',
      occurredAt: '2026-10-22T18:52:12.000Z',
    });
  });
  it('eksik derinlik ve büyüklüğü null bırakır', () => {
    expect(rows[1]!.magnitude).toBeNull();
    expect(rows[1]!.depthKm).toBeNull();
  });
});
