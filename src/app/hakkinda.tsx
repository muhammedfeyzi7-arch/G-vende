import Constants from 'expo-constants';
import { Linking, Platform, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup } from '@/components/ds';
import { SOURCES } from '@/features/earthquakes/repository';
import { colors, spacing } from '@/theme';

export default function About() {
  const version = Constants.expoConfig?.version ?? '—';
  return (
    <Page>
      <View style={{ alignItems: 'center', gap: 4, paddingVertical: spacing.lg }}>
        <AppText variant="display" style={{ letterSpacing: 1 }}>
          GÜVENDE
        </AppText>
        <AppText variant="label">Afet Anında Yanınızda</AppText>
        <AppText variant="caption">
          Sürüm {version} · {Platform.OS === 'ios' ? 'iOS' : 'Android'} {String(Platform.Version)}
        </AppText>
      </View>
      <Card style={{ gap: spacing.xs, borderColor: colors.dangerBorder }}>
        <AppText variant="label" color={colors.text}>
          Önemli
        </AppText>
        <AppText variant="caption">
          GÜVENDE resmî kurumların yerini tutmaz ve erken uyarı sistemi değildir. Acil durumlarda 112’yi arayın; resmî açıklamaları AFAD ve
          yerel yönetimlerden takip edin.
        </AppText>
      </Card>
      <GroupTitle>Veri kaynakları</GroupTitle>
      <RowGroup>
        {Object.values(SOURCES).map((s, i) => (
          <ListRow
            key={s.id}
            first={i === 0}
            icon="pulse-outline"
            title={s.label}
            subtitle={s.attribution}
            onPress={() => Linking.openURL(s.homepage)}
          />
        ))}
      </RowGroup>
      <GroupTitle>Harita ve lisanslar</GroupTitle>
      <RowGroup>
        <ListRow
          first
          icon="map-outline"
          title="OpenStreetMap"
          subtitle="© OpenStreetMap katkıcıları (ODbL)"
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        />
        <ListRow
          icon="layers-outline"
          title="OpenFreeMap / OpenMapTiles"
          subtitle="Vektör harita karoları"
          onPress={() => Linking.openURL('https://openfreemap.org')}
        />
        <ListRow
          icon="planet-outline"
          title="Sentinel-2 cloudless (EOX)"
          subtitle="Uydu görünümü · CC BY 4.0"
          onPress={() => Linking.openURL('https://s2maps.eu')}
        />
        <ListRow
          icon="navigate-outline"
          title="MapLibre"
          subtitle="Harita motoru (BSD)"
          onPress={() => Linking.openURL('https://maplibre.org')}
        />
      </RowGroup>
    </Page>
  );
}
