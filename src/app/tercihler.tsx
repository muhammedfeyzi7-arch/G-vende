import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { GroupTitle, Page, RowGroup, Stepper, ToggleRow } from '@/components/ds';
import { SOURCES } from '@/features/earthquakes/repository';
import { SourceHealthCard } from '@/features/home/tabs';
import { MAP_STYLE_OPTIONS } from '@/features/map/mapStyle';
import { useApp } from '@/providers/AppProvider';
import { env } from '@/services/env';
import { colors, radius, spacing } from '@/theme';
import type { QuakeSourceId } from '@/types/earthquake';

function Choice({
  label,
  description,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={({ pressed }) => [styles.choice, selected && styles.choiceOn, disabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.primary : colors.textSecondary}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontSize: 16 }}>
          {label}
        </AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
    </Pressable>
  );
}

/** Tema, dil, harita görünümü ve deprem verisi tercihleri. */
export default function Preferences() {
  const { settings, updateSettings, quakes } = useApp();
  const toggleSource = (id: QuakeSourceId) => {
    const next = settings.enabledSources.includes(id) ? settings.enabledSources.filter((s) => s !== id) : [...settings.enabledSources, id];
    if (next.length === 0) return Alert.alert('En az bir kaynak açık olmalı');
    updateSettings({ enabledSources: next });
  };
  const notYet = (what: string) => Alert.alert(`${what} bu sürümde yok`, 'Bu seçenek henüz uygulanmadı; seçilemez.');

  return (
    <Page>
      <GroupTitle>Harita görünümü</GroupTitle>
      <View style={{ gap: spacing.sm }}>
        {MAP_STYLE_OPTIONS.map((o) => (
          <Choice
            key={o.id}
            label={o.label}
            description={o.description}
            selected={settings.mapStyle === o.id}
            onPress={() => updateSettings({ mapStyle: o.id })}
          />
        ))}
      </View>
      <AppText variant="caption">Seçilen görünüm yüklenemezse harita otomatik olarak koyu görünüme döner.</AppText>

      <GroupTitle>Tema</GroupTitle>
      <View style={{ gap: spacing.sm }}>
        <Choice label="Koyu" description="Gece ve elektrik kesintisinde göz yormaz, pil tasarrufu sağlar" selected onPress={() => {}} />
        <Choice label="Açık" description="Bu sürümde yok" selected={false} disabled onPress={() => notYet('Açık tema')} />
        <Choice label="Sistemle aynı" description="Bu sürümde yok" selected={false} disabled onPress={() => notYet('Sistem teması')} />
      </View>

      <GroupTitle>Dil</GroupTitle>
      <View style={{ gap: spacing.sm }}>
        <Choice label="Türkçe" selected onPress={() => {}} />
      </View>
      <AppText variant="caption">Şu an yalnızca Türkçe desteklenmektedir.</AppText>

      <GroupTitle>Deprem verisi</GroupTitle>
      <RowGroup>
        <Stepper
          first
          label="Listede en küçük büyüklük"
          value={settings.minListMagnitude}
          step={0.5}
          min={1.5}
          max={5}
          format={(v) => v.toFixed(1).replace('.', ',')}
          onChange={(v) => updateSettings({ minListMagnitude: v })}
        />
        {env.quakeSources.map((id) => (
          <ToggleRow
            key={id}
            title={SOURCES[id].label}
            subtitle={SOURCES[id].attribution}
            value={settings.enabledSources.includes(id)}
            onChange={() => toggleSource(id)}
          />
        ))}
      </RowGroup>
      <SourceHealthCard snapshot={quakes.snapshot} />
    </Page>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 56,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
});
