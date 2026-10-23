// NVİ KPSPublic "TCKimlikNoDogrula" SOAP servisi: T.C. kimlik no + ad + soyad + doğum yılı
// eşleşmesini doğrular (true/false). Ücretsizdir; kişinin numaranın sahibi olduğunu KANITLAMAZ,
// yalnızca bilgilerin birbiriyle tutarlı olduğunu gösterir.
export const NVI_URL = 'https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx';
const NS = 'http://tckimlik.nvi.gov.tr/WS';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildNviEnvelope(p: { tckn: string; firstName: string; lastName: string; birthYear: number }): string {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    `<TCKimlikNoDogrula xmlns="${NS}">` +
    `<TCKimlikNo>${esc(p.tckn)}</TCKimlikNo><Ad>${esc(p.firstName)}</Ad><Soyad>${esc(p.lastName)}</Soyad>` +
    `<DogumYili>${p.birthYear}</DogumYili>` +
    '</TCKimlikNoDogrula></soap:Body></soap:Envelope>'
  );
}

/** Yanıttaki sonucu okur; beklenmeyen yanıtta null döner (doğrulandı sayılmaz). */
export function parseNviResult(xml: string): boolean | null {
  const m = /<TCKimlikNoDogrulaResult>\s*(true|false)\s*<\/TCKimlikNoDogrulaResult>/i.exec(xml);
  return m ? m[1]!.toLowerCase() === 'true' : null;
}

export async function callNvi(
  p: { tckn: string; firstName: string; lastName: string; birthYear: number },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean | null> {
  const res = await fetchImpl(NVI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${NS}/TCKimlikNoDogrula"` },
    body: buildNviEnvelope(p),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return parseNviResult(await res.text());
}

/** Kimlik numarası yerine saklanan anahtarlı özet (HMAC-SHA256). Anahtar yalnızca sunucuda. */
export async function identityHash(tckn: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`tckn:${tckn}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}
