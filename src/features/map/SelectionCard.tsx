import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { colors, hitSlop, radius, spacing, themedStyles } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { UserReport } from '@/types/report';
import { distanceKm, formatDistance, type LatLng } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';
import { openDirections, openInMaps } from '../assembly-points/api';
import { formatDepth, formatMagnitude, placeTitle, sourceLabel } from '../earthquakes/format';
import { CATEGORY_META, reportHeadline } from '../reports/categories';
import type { MapSelection } from './QuakeMap';

export function SelectionCard({
  selection,
  events,
  reports,
  assembly,
  user,
  onClose,
}: {
  selection: MapSelection;
  events: EarthquakeEvent[];
  reports: UserReport[];
  assembly: AssemblyPoint[];
  user: LatLng | null;
  onClose: () => void;
}) {
  let body: React.ReactNode = null;
  if (selection.kind === 'quake') {
    const e = events.find((x) => x.id === selection.id);
    if (!e) return null;
    body = (
      <>
        <AppText variant="heading">
          M {formatMagnitude(e.primary.magnitude)} · {placeTitle(e)}
        </AppText>
        <AppText variant="label">
          {relativeTimeTr(e.primary.occurredAt)} · Derinlik {formatDepth(e.primary.depthKm)} · {sourceLabel(e.primary)}
          {user ? ` · ${formatDistance(distanceKm(user, e.primary))}` : ''}
        </AppText>
        <Button
          label="Deprem detayı"
          icon="information-circle-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: e.id } })}
        />
      </>
    );
  } else if (selection.kind === 'report') {
    const r = reports.find((x) => x.id === selection.id);
    if (!r) return null;
    body = (
      <>
        <AppText variant="label" color={CATEGORY_META[r.category].color}>
          {CATEGORY_META[r.category].label} · {r.areaLabel ?? 'Bölge belirtilmemiş'} · {relativeTimeTr(r.createdAt)}
        </AppText>
        <AppText variant="heading">{reportHeadline(r.category, r.feltIntensity)}</AppText>
        {r.description ? (
          <AppText variant="label" numberOfLines={2}>
            {r.description}
          </AppText>
        ) : null}
        {!r.isSample ? (
          <Button label="Bildirimi aç" variant="secondary" onPress={() => router.push({ pathname: '/rapor/[id]', params: { id: r.id } })} />
        ) : null}
      </>
    );
  } else {
    const p = assembly.find((x) => x.id === selection.id);
    if (!p) return null;
    body = (
      <>
        <AppText variant="label" color={colors.safe}>
          {p.isUserSaved ? 'Size atanan alan (kendi kaydınız)' : 'Resmî toplanma alanı'}
          {user ? ` · ${formatDistance(distanceKm(user, p))}` : ''}
        </AppText>
        <AppText variant="heading">{p.name}</AppText>
        {p.address ? (
          <AppText variant="label" numberOfLines={2}>
            {p.address}
          </AppText>
        ) : null}
        <AppText variant="caption">Kaynak: {p.sourceName}</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button style={{ flex: 1 }} label="Yol tarifi" icon="walk-outline" onPress={() => openDirections(p)} />
          <Button style={{ flex: 1 }} label="Haritalar’da aç" icon="open-outline" variant="secondary" onPress={() => openInMaps(p)} />
        </View>
        <AppText variant="caption">Afet sonrası yollar kapanmış olabilir; rota güvenliği garanti edilmez.</AppText>
      </>
    );
  }
  return (
    <View style={styles.card} accessibilityViewIsModal>
      <Pressable onPress={onClose} hitSlop={hitSlop} style={styles.close} accessibilityRole="button" accessibilityLabel="Kapat">
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </Pressable>
      <View style={{ gap: 6, paddingRight: 28 }}>{body}</View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.mapPanel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  close: { position: 'absolute', right: spacing.sm, top: spacing.sm, zIndex: 1, padding: 4 },
}));
