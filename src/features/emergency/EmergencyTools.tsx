import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

const WHISTLE = require('../../../assets/sounds/whistle.wav');

/** Enkaz altında veya karanlıkta yer bildirmek için çevrimdışı araçlar. */
export function EmergencyTools() {
  const player = useAudioPlayer(WHISTLE);
  const [whistling, setWhistling] = useState(false);

  useEffect(() => {
    // Sessiz modda da çalsın; ekran kilitlense de sürsün.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);

  const toggleWhistle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (whistling) {
      player.pause();
      setWhistling(false);
    } else {
      player.loop = true;
      player.volume = 1;
      player.seekTo(0);
      player.play();
      setWhistling(true);
    }
  };

  return (
    <View style={styles.row}>
      <Tool
        active={whistling}
        onPress={toggleWhistle}
        label={whistling ? 'Düdüğü durdur' : 'Düdük'}
        sub="Yüksek sesli sinyal"
        icon={<MaterialCommunityIcons name="whistle" size={30} color={whistling ? '#1A1200' : colors.caution} />}
        tint={colors.caution}
      />
      <Tool
        onPress={() => router.push('/isik')}
        label="SOS ışığı"
        sub="Ekranı fener yap"
        icon={<Ionicons name="flashlight" size={28} color={colors.text} />}
        tint={colors.text}
      />
    </View>
  );
}

function Tool({
  label,
  sub,
  icon,
  onPress,
  active,
  tint,
}: {
  label: string;
  sub: string;
  icon: ReactNode;
  onPress: () => void;
  active?: boolean;
  tint: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.tool, active && { backgroundColor: tint, borderColor: tint }, pressed && { opacity: 0.85 }]}
    >
      {icon}
      <AppText variant="heading" color={active ? '#1A1200' : colors.text} style={{ fontSize: 16 }}>
        {label}
      </AppText>
      <AppText variant="caption" color={active ? '#3A2A00' : colors.textMuted}>
        {sub}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tool: {
    flex: 1,
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: spacing.sm,
  },
});
