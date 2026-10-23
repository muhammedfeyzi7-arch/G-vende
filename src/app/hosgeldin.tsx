import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '@/components/ui';
import { IconTile, accent } from '@/components/ds';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useApp } from '@/providers/AppProvider';
import { colors, hitSlop, radius, spacing, themedStyles } from '@/theme';

const FEATURES = [
  { icon: 'pulse', color: accent.red, title: 'Resmî deprem kayıtları', text: 'AFAD, Kandilli, EMSC ve USGS verisi tek ekranda; size uzaklığıyla.' },
  { icon: 'people', color: accent.blue, title: 'Ailem güvende mi?', text: 'Tek dokunuşla “Güvendeyim” gönderin, ailenize durum sorun.' },
  { icon: 'medkit', color: accent.green, title: 'Acil durum araçları', text: '112, hazır SMS, düdük, fener, toplanma alanı — internetsiz de.' },
  { icon: 'shield-checkmark', color: accent.purple, title: 'Şeffaf bilgi katmanı', text: 'Kimliği doğrulanmış kişilerden, yerinde ve canlı fotoğraflı bildirimler; topluluk desteği resmî doğrulama sayılmaz.' },
];

function PermRow({
  icon,
  color,
  title,
  text,
  done,
  onPress,
}: {
  icon: string;
  color: string;
  title: string;
  text: string;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.perm}>
      <IconTile icon={icon} color={color} size={44} solid />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" style={{ fontSize: 15 }}>
          {title}
        </AppText>
        <AppText variant="caption">{text}</AppText>
      </View>
      {done ? (
        <View style={styles.done} accessibilityLabel={`${title}: verildi`}>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </View>
      ) : (
        <Button label="İzin ver" size="sm" onPress={onPress} />
      )}
    </View>
  );
}

/** İlk açılış: uygulamanın ne yaptığı (ve ne yapmadığı), izinler ve aile kurulumu. Her adım atlanabilir. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { location, requestLocation, updateSettings } = useApp();
  const notif = useNotificationPermission();
  const [step, setStep] = useState(0);

  const finish = (to: '/' | '/aile/ekle' | '/toplanma/sec' = '/') => {
    updateSettings({ onboardingSeen: true });
    router.replace('/');
    if (to !== '/') setTimeout(() => router.push(to), 0);
  };

  const pages = [
    <View key="0" style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl }}>
        <View style={styles.logo}>
          <LinearGradient colors={['#FF4D5E', '#B5142A']} style={StyleSheet.absoluteFill} />
          <Ionicons name="pulse" size={46} color="#fff" />
        </View>
        <AppText variant="display" style={{ fontSize: 32, letterSpacing: 1 }}>
          GÜVENDE
        </AppText>
        <AppText variant="label" style={{ textAlign: 'center' }}>
          Afet anında ve sonrasında yanınızda.
        </AppText>
      </View>
      {FEATURES.map((f) => (
        <View key={f.title} style={styles.feature}>
          <IconTile icon={f.icon} color={f.color} size={42} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 14 }}>
              {f.title}
            </AppText>
            <AppText variant="caption">{f.text}</AppText>
          </View>
        </View>
      ))}
      <View style={styles.note}>
        <Ionicons name="information-circle" size={18} color={colors.warning} />
        <AppText variant="caption" color={colors.text} style={{ flex: 1 }}>
          GÜVENDE bir erken uyarı sistemi değildir. Deprem bilgileri kaynaklar yayımladıktan sonra gelir.
        </AppText>
      </View>
    </View>,

    <View key="1" style={{ gap: spacing.md }}>
      <AppText variant="display" style={{ fontSize: 26, marginTop: spacing.xl }}>
        İzinler
      </AppText>
      <AppText variant="label">
        İzinleri yalnızca ilgili özelliği kullandığınızda kullanırız. İstediğiniz zaman Ayarlar’dan değiştirebilirsiniz.
      </AppText>
      <PermRow
        icon="location"
        color={accent.blue}
        title="Konum"
        text="Size uzaklık, yakın toplanma alanları ve “Güvendeyim” mesajındaki konum için. Arka planda konum toplanmaz."
        done={location.status === 'granted'}
        onPress={() => requestLocation()}
      />
      <PermRow
        icon="notifications"
        color={accent.orange}
        title="Bildirimler"
        text="Yakınınızdaki deprem kayıtları ve ailenizden gelen durumlar için."
        done={notif.status === 'granted'}
        onPress={async () => {
          if (await notif.request()) updateSettings({ localAlerts: true });
        }}
      />
      {location.status === 'denied' ? (
        <AppText variant="caption">Konum izni vermezseniz ilinizi elle seçebilirsiniz (Ayarlar → Konum).</AppText>
      ) : null}
    </View>,

    <View key="2" style={{ gap: spacing.md }}>
      <AppText variant="display" style={{ fontSize: 26, marginTop: spacing.xl }}>
        Hazırlığınızı yapın
      </AppText>
      <AppText variant="label">Deprem anında vakit kaybetmemek için şimdi iki dakikanızı ayırın.</AppText>
      <Pressable onPress={() => finish('/aile/ekle')} accessibilityRole="button" style={styles.feature}>
        <IconTile icon="person-add" color={accent.blue} size={44} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" style={{ fontSize: 15 }}>
            Ailenizi ekleyin
          </AppText>
          <AppText variant="caption">“Güvendeyim” ve “İyi misin?” mesajları tek dokunuşla onlara gider.</AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
      <Pressable onPress={() => finish('/toplanma/sec')} accessibilityRole="button" style={styles.feature}>
        <IconTile icon="flag" color={accent.green} size={44} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" style={{ fontSize: 15 }}>
            Toplanma alanınızı işaretleyin
          </AppText>
          <AppText variant="caption">e-Devlet’te size atanan alanı kaydedin; internetsiz yol tarifi alın.</AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>,
  ];

  const last = step === pages.length - 1;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.top}>
        <View style={styles.dots} accessibilityLabel={`Adım ${step + 1} / ${pages.length}`}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        <Pressable onPress={() => finish()} accessibilityRole="button" hitSlop={hitSlop}>
          <AppText variant="label" color={colors.textSecondary}>
            Atla
          </AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>{pages[step]}</ScrollView>
      <View style={styles.footer}>
        {step > 0 ? <Button style={{ flex: 1 }} label="Geri" variant="secondary" onPress={() => setStep((s) => s - 1)} /> : null}
        <Button
          style={{ flex: 2 }}
          label={last ? 'Başla' : 'Devam'}
          icon={last ? 'checkmark' : 'arrow-forward'}
          onPress={() => (last ? finish() : setStep((s) => s + 1))}
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, minHeight: 40 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotOn: { width: 24, backgroundColor: colors.primary },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px rgba(255,53,72,0.45)',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  perm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  done: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.safe, alignItems: 'center', justifyContent: 'center' },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warning + '1A',
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
}));
