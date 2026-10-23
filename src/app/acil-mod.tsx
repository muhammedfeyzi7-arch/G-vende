import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { openDirections } from '@/features/assembly-points/api';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { useApp } from '@/providers/AppProvider';
import { darkPalette, ForceDark, radius, spacing, themedStyles } from '@/theme';

const WHISTLE = require('../../assets/sounds/whistle.wav');

function Big({
  icon,
  label,
  sub,
  color,
  onPress,
  active,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  color: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[label, sub].filter(Boolean).join('. ')}
      style={({ pressed }) => [
        styles.big,
        { borderColor: color, backgroundColor: active ? color : color + '22' },
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon}
      <AppText variant="title" color={active ? '#111' : '#fff'} style={{ fontSize: 17.5, textAlign: 'center' }}>
        {label}
      </AppText>
      {sub ? (
        <AppText variant="label" color={active ? '#222' : darkPalette.textSecondary} style={{ textAlign: 'center' }}>
          {sub}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/**
 * Acil Durum Modu: afet anında tek dokunuşla en önemli işlemler. Ekran kapanmaz,
 * düğmeler büyüktür; internet gerektirmez.
 */
export default function EmergencyMode() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { settings, userCoords } = useApp();
  const fam = useFamilyActions();
  const nearby = useNearbyAssembly(userCoords);
  const player = useAudioPlayer(WHISTLE);
  const [whistle, setWhistle] = useState(false);
  const info = settings.emergencyInfo;
  const hasInfo = Object.values(info).some((v) => v.trim());

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    return () => player.pause();
  }, [player]);

  const toggleWhistle = () => {
    if (whistle) player.pause();
    else {
      player.loop = true;
      player.volume = 1;
      player.seekTo(0);
      player.play();
    }
    setWhistle(!whistle);
  };

  return (
    <ForceDark.Provider value>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="display" style={{ flex: 1, fontSize: 24.5 }}>
              Acil Durum Modu
            </AppText>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Acil Durum Modundan çık"
              style={styles.close}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
          <Pressable
            onPress={() => Linking.openURL('tel:112')}
            accessibilityRole="button"
            accessibilityLabel="112’yi ara"
            style={styles.call}
          >
            <Ionicons name="call" size={40} color="#fff" />
            <AppText variant="display" style={{ fontSize: 35 }}>
              112’yi Ara
            </AppText>
          </Pressable>
          <View style={styles.grid}>
            <Big
              icon={<Ionicons name="shield-checkmark" size={40} color={darkPalette.safe} />}
              label="Güvendeyim"
              sub="Ailene SMS"
              color={darkPalette.safe}
              onPress={() => fam.sendStatus('safe')}
            />
            <Big
              icon={<Ionicons name="alert-circle" size={40} color={darkPalette.danger} />}
              label="Yardım lazım"
              sub="Ailene SMS"
              color={darkPalette.danger}
              onPress={fam.confirmHelp}
            />
            <Big
              icon={<MaterialCommunityIcons name="whistle" size={40} color={whistle ? '#111' : darkPalette.caution} />}
              label={whistle ? 'Düdüğü durdur' : 'Düdük'}
              sub="Yerini duyur"
              color={darkPalette.caution}
              active={whistle}
              onPress={toggleWhistle}
            />
            <Big
              icon={<Ionicons name="flashlight" size={40} color="#fff" />}
              label="SOS ışığı"
              sub="Ekranı fener yap"
              color="#ffffff"
              onPress={() => router.push('/isik')}
            />
            <Big
              icon={<Ionicons name="walk" size={40} color={darkPalette.primary} />}
              label="Toplanma alanı"
              sub={nearby.myPoint?.name ?? nearby.official[0]?.name ?? 'Belirlenmedi'}
              color={darkPalette.primary}
              onPress={() => {
                const p = nearby.myPoint ?? nearby.official[0];
                if (p) openDirections(p);
                else router.push('/toplanma/sec');
              }}
            />
            <Big
              icon={<Ionicons name="location" size={40} color={darkPalette.safe} />}
              label="Konumumu paylaş"
              sub="SMS veya uygulama"
              color={darkPalette.safe}
              onPress={fam.shareLocation}
            />
          </View>
          <Pressable onPress={() => router.push('/saglik-bilgilerim')} style={styles.info} accessibilityRole="button">
            <AppText variant="heading">Sağlık bilgilerim</AppText>
            {hasInfo ? (
              <>
                {info.bloodType ? <AppText variant="body">Kan grubu: {info.bloodType}</AppText> : null}
                {info.conditions ? <AppText variant="body">Hastalık / alerji: {info.conditions}</AppText> : null}
                {info.medications ? <AppText variant="body">İlaçlar: {info.medications}</AppText> : null}
                {info.contacts ? <AppText variant="body">Acil kişiler: {info.contacts}</AppText> : null}
              </>
            ) : (
              <AppText variant="label">
                Kurtarma ekiplerine göstermek için kan grubu ve ilaç bilgilerinizi ekleyin (yalnızca bu cihazda).
              </AppText>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </ForceDark.Provider>
  );
}

const styles = themedStyles(() => ({
  close: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: darkPalette.danger,
    borderRadius: radius.xl,
    minHeight: 104,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  big: {
    width: '48.5%',
    flexGrow: 1,
    minHeight: 150,
    borderRadius: radius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.md,
  },
  info: { backgroundColor: '#111', borderRadius: radius.lg, padding: spacing.lg, gap: 4, borderWidth: 1, borderColor: '#333' },
}));
