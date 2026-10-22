import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText, IconButton } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { FELT_LEVELS } from '../reports/categories';
import type { MapLayers } from './QuakeMap';

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
      <IconButton icon="layers-outline" label="Harita katmanları" onPress={onLayers} active={layersOpen} />
      <IconButton icon="navigate-outline" label="Konumuma git" onPress={onLocate} />
      {onFullscreen ? (
        <IconButton
          icon={fullscreenIcon}
          label={fullscreenIcon === 'scan-outline' ? 'Tam ekran harita' : 'Tam ekrandan çık'}
          onPress={onFullscreen}
        />
      ) : null}
    </View>
  );
}

const LAYER_LABELS: { key: keyof MapLayers; label: string }[] = [
  { key: 'quakes', label: 'Depremler' },
  { key: 'rings', label: 'Mesafe halkaları' },
  { key: 'reports', label: 'Kullanıcı bildirimleri' },
  { key: 'assembly', label: 'Toplanma alanları' },
];

export function LayerPanel({ layers, onChange }: { layers: MapLayers; onChange: (l: MapLayers) => void }) {
  return (
    <View style={styles.layerPanel}>
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
        Halkalar merkez üssüne 25 / 50 / 100 km uzaklığı gösterir; ölçülmüş sarsıntı alanı değildir.
      </AppText>
    </View>
  );
}

export function MapLegend() {
  return (
    <View
      style={styles.legend}
      accessible
      accessibilityLabel="Lejant: kullanıcıların bildirdiği hissedilen sarsıntı. Çok güçlü kırmızı, güçlü turuncu, orta sarı, hafif gri."
    >
      <AppText variant="caption" color={colors.textSecondary}>
        Bildirilen hissedilme
      </AppText>
      <View style={styles.legendRow}>
        {FELT_LEVELS.map((l) => (
          <View key={l.value} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: l.color }]} />
            <AppText variant="caption" color={colors.text}>
              {l.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export function NearbyAssemblyButton({ onPress, count }: { onPress: () => void; count: number | null }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Yakınımdaki toplanma alanları"
      style={({ pressed }) => [styles.assemblyBtn, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.assemblyIcon}>
        <Ionicons name="people" size={18} color={colors.safe} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText variant="label" color={colors.text} numberOfLines={2}>
          Yakınımdaki toplanma alanları
        </AppText>
        {count != null ? <AppText variant="caption">{count > 0 ? `${count} resmî alan` : 'Resmî veri yok'}</AppText> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', right: spacing.md, top: spacing.md, gap: spacing.sm },
  layerPanel: {
    position: 'absolute',
    right: 70,
    top: spacing.md,
    width: 230,
    backgroundColor: 'rgba(7,21,34,0.97)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: 2,
  },
  layerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  legend: {
    flexShrink: 1,
    backgroundColor: 'rgba(3,11,20,0.82)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 4,
    alignSelf: 'flex-start',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  assemblyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(7,21,34,0.94)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    flexShrink: 1,
    maxWidth: '50%',
    minHeight: 48,
  },
  assemblyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
