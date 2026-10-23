import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { FELT_LEVELS } from '../reports/categories';
import type { MapLayers } from './QuakeMap';

function ControlButton({ icon, label, onPress, active }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.ctrl, active && { borderColor: colors.primary }, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon as never} size={20} color={active ? colors.primary : colors.text} />
      <AppText variant="caption" color={colors.text} style={{ fontSize: 9 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function MapControls({
  onLayers,
  onLocate,
  onFullscreen,
  layersOpen,
  fullscreenIcon = 'scan-outline',
}: {
  onLayers: () => void;
  onLocate: () => void;
  onFullscreen?: () => void;
  layersOpen: boolean;
  fullscreenIcon?: 'scan-outline' | 'contract-outline';
}) {
  return (
    <View style={styles.controls}>
      <ControlButton icon="layers" label="Katmanlar" onPress={onLayers} active={layersOpen} />
      <ControlButton icon="navigate-outline" label="Konumum" onPress={onLocate} />
      {onFullscreen ? <ControlButton icon={fullscreenIcon} label="Tam Ekran" onPress={onFullscreen} /> : null}
    </View>
  );
}

const LAYER_LABELS: { key: keyof MapLayers; label: string }[] = [
  { key: 'quakes', label: 'Depremler' },
  { key: 'rings', label: 'Mesafe halkaları' },
  { key: 'reports', label: 'Kullanıcı bildirimleri' },
  { key: 'assembly', label: 'Toplanma alanları' },
  { key: 'family', label: 'Aile konumları (izinli)' },
];

export type MapFilters = { hours: number; minMag: number };
const PERIODS = [
  { key: 6, label: '6 sa' },
  { key: 24, label: '24 sa' },
  { key: 72, label: '3 gün' },
  { key: 168, label: '7 gün' },
];
const MAGS = [0, 3, 4, 5];

function MiniChip({ label, active, onPress, a11y }: { label: string; active: boolean; onPress: () => void; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={a11y}
      style={[styles.miniChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <AppText variant="caption" color={active ? '#fff' : colors.text} style={{ fontSize: 10.5 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function LayerPanel({
  layers,
  onChange,
  filters,
  onFilters,
}: {
  layers: MapLayers;
  onChange: (l: MapLayers) => void;
  filters?: MapFilters;
  onFilters?: (f: MapFilters) => void;
}) {
  return (
    <View style={styles.layerPanel}>
      {filters && onFilters ? (
        <View style={{ gap: 6, marginBottom: 6 }}>
          <AppText variant="caption">Zaman</AppText>
          <View style={styles.chipRow}>
            {PERIODS.map((p) => (
              <MiniChip
                key={p.key}
                label={p.label}
                active={filters.hours === p.key}
                onPress={() => onFilters({ ...filters, hours: p.key })}
                a11y={`Son ${p.label} depremleri`}
              />
            ))}
          </View>
          <AppText variant="caption">Büyüklük</AppText>
          <View style={styles.chipRow}>
            {MAGS.map((m) => (
              <MiniChip
                key={m}
                label={m ? `M${m}+` : 'Tümü'}
                active={filters.minMag === m}
                onPress={() => onFilters({ ...filters, minMag: m })}
                a11y={m ? `Büyüklük ${m} ve üzeri` : 'Tüm büyüklükler'}
              />
            ))}
          </View>
        </View>
      ) : null}
      {LAYER_LABELS.map(({ key, label }) => (
        <View key={key} style={styles.layerRow}>
          <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
            {label}
          </AppText>
          <Switch
            value={layers[key]}
            onValueChange={(v) => onChange({ ...layers, [key]: v })}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            accessibilityLabel={`${label} katmanı`}
          />
        </View>
      ))}
      <AppText variant="caption" style={{ marginTop: 4 }}>
        Halkalar merkez üssüne 25 / 50 / 75 km uzaklığı gösterir; renkler görseldir, ölçülmüş sarsıntı alanı değildir.
      </AppText>
    </View>
  );
}

export function MapLegend() {
  return (
    <View
      style={styles.legend}
      accessible
      accessibilityLabel="Lejant: kullanıcıların bildirdiği hissedilen sarsıntı. Çok güçlü kırmızı, güçlü turuncu, orta sarı, hafif gri. Halkalar merkez üssüne 25, 50 ve 75 kilometre uzaklıktır; ölçülmüş sarsıntı alanı değildir."
    >
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ fontSize: 10 }}>
        Sarsıntı hissedilen bölgeler
      </AppText>
      <View style={styles.legendRow}>
        {FELT_LEVELS.map((l) => (
          <View key={l.value} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: l.color }]} />
            <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ fontSize: 10 }}>
              {l.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export function NearbyAssemblyButton({ onPress, count, mine }: { onPress: () => void; count: number | null; mine?: string | null }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        'Yakınımdaki toplanma alanları',
        mine ? `Alanınız: ${mine}` : count != null ? (count > 0 ? `${count} resmî alan` : 'Resmî veri yok') : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.assemblyBtn, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.assemblyIcon}>
        <Ionicons name="people" size={18} color={colors.safe} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText variant="label" color={colors.text} numberOfLines={2}>
          Yakınımdaki toplanma alanları
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  controls: { position: 'absolute', right: spacing.sm, top: spacing.sm, gap: spacing.xs + 2 },
  ctrl: {
    width: 62,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.mapPanel,
    borderWidth: 1,
    borderColor: colors.mapPanelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
  },
  layerPanel: {
    position: 'absolute',
    right: 92,
    top: spacing.md,
    width: 230,
    backgroundColor: colors.mapPanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
  },
  layerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  legend: {
    flexShrink: 1,
    backgroundColor: colors.mapPanel,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 4,
    alignSelf: 'flex-start',
  },
  legendRow: { flexDirection: 'row', columnGap: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  assemblyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.mapPanel,
    boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    flexShrink: 1,
    maxWidth: '45%',
    minHeight: 48,
  },
  assemblyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    boxShadow: '0 0 12px rgba(20,217,154,0.55)',
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
