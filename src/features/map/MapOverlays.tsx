import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
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
      <Ionicons name={icon as never} size={24} color={active ? colors.primary : colors.text} />
      <AppText variant="caption" color={colors.text} style={{ fontSize: 10.5 }}>
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
      accessibilityLabel="Lejant: kullanıcıların bildirdiği hissedilen sarsıntı. Çok güçlü kırmızı, güçlü turuncu, orta sarı, hafif gri."
    >
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ fontSize: 11.5 }}>
        Sarsıntı hissedilen bölgeler
      </AppText>
      <View style={styles.legendRow}>
        {FELT_LEVELS.map((l) => (
          <View key={l.value} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: l.color }]} />
            <AppText variant="caption" color={colors.text} style={{ fontSize: 11 }}>
              {l.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" style={{ fontSize: 10 }}>
        Halkalar: 25/50/75 km uzaklık, ölçüm değil
      </AppText>
    </View>
  );
}

export function NearbyAssemblyButton({ onPress, count, mine }: { onPress: () => void; count: number | null; mine?: string | null }) {
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
        {mine ? (
          <AppText variant="caption" color={colors.safe} numberOfLines={1}>
            Alanınız: {mine}
          </AppText>
        ) : count != null ? (
          <AppText variant="caption">{count > 0 ? `${count} resmî alan` : 'Resmî veri yok'}</AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', right: spacing.sm, top: spacing.sm, gap: spacing.xs + 2 },
  ctrl: {
    width: 76,
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: 'rgba(8,20,33,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(60,90,120,0.45)',
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
    backgroundColor: 'rgba(3,11,20,0.7)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 4,
    alignSelf: 'flex-start',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  assemblyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(5,15,25,0.9)',
    boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    boxShadow: '0 0 12px rgba(20,217,154,0.55)',
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
