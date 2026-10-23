import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, StateMessage } from '@/components/ui';
import { IconTile, Page } from '@/components/ds';
import { GUIDES } from '@/features/emergency/content';
import { DCH_STEPS } from '@/features/emergency/DropCoverHold';
import { Linking } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export default function GuideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return <StateMessage icon="book-outline" title="Rehber bulunamadı" />;
  return (
    <Page>
      <Stack.Screen options={{ title: g.title }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile icon={g.icon} color={g.color} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">{g.title}</AppText>
          <AppText variant="label">{g.summary}</AppText>
        </View>
      </View>
      {g.id === 'during' ? (
        <View style={styles.dch}>
          {DCH_STEPS.slice(0, 3).map(({ n, title, Icon }) => (
            <View key={n} style={{ alignItems: 'center', flex: 1 }}>
              <Icon size={90} />
              <AppText variant="heading" style={{ fontWeight: '800' }}>
                {title}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {g.steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={[styles.num, { backgroundColor: g.color }]}>
            <AppText variant="label" color="#fff" style={{ fontWeight: '800' }}>
              {i + 1}
            </AppText>
          </View>
          <AppText variant="body" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            {s}
          </AppText>
        </View>
      ))}
      <Button label="112’yi ara" icon="call" variant="danger" onPress={() => Linking.openURL('tel:112')} />
      <AppText variant="caption">Metin AFAD ve Kızılay’ın kamuya açık önerilerinden özetlenmiştir; eğitim yerine geçmez.</AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  dch: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.xl, paddingVertical: spacing.md },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
