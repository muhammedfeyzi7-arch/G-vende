/**
 * Telefonun ters coğrafi kodlama sonucunu (expo-location reverseGeocodeAsync) 112 operatörüne
 * okunacak Türkçe açık adrese çevirir: "Cumhuriyet Mah., Atatürk Cad. No: 12 · Merkez / Düzce 81010".
 * Alan adları iOS ve Android'de farklı doldurulabildiği için tekrarlar ayıklanır.
 */
export interface GeoAddress {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
}

export interface TrAddress {
  /** Mahalle, sokak/cadde ve kapı numarası */
  line1: string | null;
  /** İlçe / İl ve posta kodu */
  line2: string | null;
  /** Tek satır (kopyalama ve SMS için) */
  full: string | null;
}

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
const same = (a: string, b: string) => a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR');
const hasNumber = (s: string) => /\d/.test(s);

function neighborhood(d: string): string {
  if (!d) return '';
  return /mah(alle(si)?)?\.?$/i.test(d) || /mahallesi/i.test(d) ? d : `${d} Mah.`;
}

export function formatTrAddress(a: GeoAddress | null | undefined): TrAddress {
  if (!a) return { line1: null, line2: null, full: null };
  const street = clean(a.street);
  const num = clean(a.streetNumber);
  const name = clean(a.name);
  const district = clean(a.district);

  // Sokak + numara; sokak yoksa "name" (çoğu zaman "Sokak No" ya da bina adı) kullanılır.
  let streetPart = street ? (num ? `${street} No: ${num}` : street) : '';
  if (!streetPart && name && !same(name, district)) streetPart = name;
  if (street && name && !hasNumber(street) && !same(name, street) && !name.includes(street) && !same(name, district) && !num)
    streetPart = `${street}, ${name}`;

  const line1Parts = [neighborhood(district), streetPart].filter(Boolean);
  // İlçe: Android'de subregion, iOS'ta çoğu zaman city. İl: region.
  const il = clean(a.region);
  const ilce = [clean(a.subregion), clean(a.city)].find((x) => x && !same(x, il) && !same(x, district)) ?? '';
  const line2Core = [ilce, il].filter(Boolean).join(' / ');
  const line2 = [line2Core, clean(a.postalCode)].filter(Boolean).join(' ');

  const line1 = line1Parts.join(', ') || null;
  const l2 = line2 || null;
  return { line1, line2: l2, full: [line1, l2].filter(Boolean).join(', ') || null };
}
