import type { NewReportInput } from '@/types/report';

export const MAX_DESCRIPTION = 500;
export const MAX_PHOTOS = 3;

// Kişisel veri sızıntısını azaltmak için telefon numarası / TC kimlik benzeri dizileri uyar.
const PHONE = /(?:\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/;
const TCKN = /\b[1-9]\d{10}\b/;

export type ValidationResult = { ok: true; warnings: string[] } | { ok: false; error: string };

export function validateReport(input: NewReportInput): ValidationResult {
  const desc = input.description.trim();
  if (desc.length > MAX_DESCRIPTION) return { ok: false, error: `Açıklama en fazla ${MAX_DESCRIPTION} karakter olabilir.` };
  if (input.photos.length > MAX_PHOTOS) return { ok: false, error: `En fazla ${MAX_PHOTOS} fotoğraf eklenebilir.` };
  if (input.category !== 'shake' && input.feltIntensity != null) return { ok: false, error: 'Şiddet yalnızca sarsıntı bildiriminde seçilebilir.' };
  if (input.category === 'other' && !desc) return { ok: false, error: '"Diğer" bildirimi için kısa bir açıklama yazın.' };
  if (input.location && (Math.abs(input.location.latitude) > 90 || Math.abs(input.location.longitude) > 180))
    return { ok: false, error: 'Konum geçersiz.' };
  const warnings: string[] = [];
  if (PHONE.test(desc) || TCKN.test(desc))
    warnings.push('Açıklamanızda telefon veya kimlik numarası olabilir. Bu bilgi herkese açık görünecek.');
  return { ok: true, warnings };
}
