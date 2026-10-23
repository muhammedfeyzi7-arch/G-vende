// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/features/trust/tckn.ts (scripts/sync-function-shared.mjs)
/**
 * T.C. kimlik numarası biçim kontrolü (11 hane, ilk hane 0 değil, 10. ve 11. hane sağlama).
 * Yalnızca yazım hatalarını yakalar; numaranın gerçek bir kişiye ait olduğunu göstermez.
 * İstemci ve sunucu (verify-identity) aynı kodu kullanır.
 */
export function isValidTckn(raw: string): boolean {
  if (!/^[1-9]\d{10}$/.test(raw)) return false;
  const d = raw.split('').map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

/** NVİ servisinin beklediği biçim: Türkçe büyük harf, fazla boşluklar tek boşluk. */
export function normalizeNamePart(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
}

export function isValidBirthYear(y: number, now = new Date()): boolean {
  return Number.isInteger(y) && y >= 1900 && y <= now.getFullYear() - 13;
}
