const TR_TZ = 'Europe/Istanbul';

export function relativeTimeTr(date: Date | string | number, now: Date = new Date()): string {
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return 'Bilinmiyor';
  const diffSec = Math.round((now.getTime() - t) / 1000);
  if (diffSec < 0) return 'Az önce';
  if (diffSec < 60) return 'Az önce';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return formatDateTr(date);
}

export function formatTimeTr(date: Date | string | number): string {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TR_TZ }).format(new Date(date));
}

export function formatDateTr(date: Date | string | number): string {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TR_TZ }).format(new Date(date));
}

export function formatDateTimeTr(date: Date | string | number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TR_TZ,
  }).format(new Date(date));
}
