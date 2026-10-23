import type { StyleProp, TextStyle } from 'react-native';
import { AppText } from '@/components/ui';
import type { LiveStatus } from '@/providers/AppProvider';
import { colors } from '@/theme';
import { relativeTimeTr } from '@/utils/time';
import type { QuakeSnapshot } from '../repository';
import { SOURCES } from '../repository';

/** "Kaynak · son senkron · canlı" satırı. Eski veri açıkça eski olarak gösterilir. */
export function syncStatusText(snapshot: QuakeSnapshot | null, live: LiveStatus): { text: string; warn: boolean } {
  if (!snapshot) return { text: 'Deprem verisi yükleniyor…', warn: false };
  const sources = snapshot.health.filter((h) => h.ok).map((h) => SOURCES[h.source].label);
  const when = snapshot.lastSuccessAt ? relativeTimeTr(snapshot.lastSuccessAt) : 'hiç';
  if (snapshot.stale)
    return {
      text: `Veriler güncel değil · son başarılı senkron ${when}. Gösterilen depremler eski olabilir.`,
      warn: true,
    };
  const via = snapshot.via === 'direct' ? 'kaynaklardan doğrudan' : live === 'connected' ? 'canlı bağlantı açık' : 'canlı bağlantı yok';
  return { text: `Kaynak: ${sources.join(', ') || '—'} · Son senkron ${when} · ${via}`, warn: false };
}

export function SyncStatusLine({
  snapshot,
  live,
  style,
}: {
  snapshot: QuakeSnapshot | null;
  live: LiveStatus;
  style?: StyleProp<TextStyle>;
}) {
  const { text, warn } = syncStatusText(snapshot, live);
  return (
    <AppText variant="caption" color={warn ? colors.warning : undefined} style={style}>
      {live === 'connected' && !warn ? '● ' : ''}
      {text}
    </AppText>
  );
}
