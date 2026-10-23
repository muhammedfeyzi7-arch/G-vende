import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { AppText, Button, StateMessage } from '@/components/ui';
import { Page } from '@/components/ds';
import { SAMPLE_INTERVAL_MS, downsample, initialVibration, levelOf, rms, step, type VibrationState } from '@/features/sensors/vibration';
import { haptic } from '@/services/haptics';
import { colors, radius, spacing, themedStyles } from '@/theme';

const LEVEL_COLOR = () => ({ still: colors.safe, light: colors.caution, moderate: colors.warning, strong: colors.danger });
const CHART_H = 140;
const SCALE_G = 0.3; // grafiğin üst sınırı

/**
 * Sarsıntı ölçer: telefonun ivmeölçeriyle canlı titreşim. Yalnızca ekran açıkken çalışır;
 * hiçbir veri kaydedilmez veya gönderilmez. Deprem büyüklüğü ya da erken uyarı değildir.
 */
export default function VibrationMeter() {
  useKeepAwake();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [running, setRunning] = useState(true);
  const [state, setState] = useState<VibrationState>(initialVibration);
  const [width, setWidth] = useState(0);
  const lastLevel = useRef<string>('still');

  useEffect(() => {
    if (Platform.OS === 'web') return setAvailable(false);
    Accelerometer.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    if (!available || !running) return;
    let sub: { remove: () => void } | null = null;
    try {
      Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
      sub = Accelerometer.addListener((a) => setState((s) => step(s, a)));
    } catch {
      setAvailable(false);
    }
    return () => sub?.remove();
  }, [available, running]);

  const now = rms(state.samples);
  const level = levelOf(now);
  const color = LEVEL_COLOR()[level.key];

  useEffect(() => {
    if (level.key === 'strong' && lastLevel.current !== 'strong') haptic.warn();
    lastLevel.current = level.key;
  }, [level.key]);

  if (available === false)
    return (
      <StateMessage
        icon="pulse-outline"
        title="İvmeölçer bulunamadı"
        message="Bu cihazda hareket sensörü kullanılamıyor."
        actionLabel="Geri dön"
        onAction={() => router.back()}
      />
    );

  const points = downsample(state.samples, 100);
  const chart =
    width > 0 && points.length > 1
      ? points
          .map((v, i) => {
            const x = (i / 99) * width;
            const y = CHART_H - Math.min(1, v / SCALE_G) * (CHART_H - 6) - 3;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : '';

  return (
    <Page>
      <View style={[styles.gauge, { borderColor: color + '66' }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <AppText variant="label" color={color} style={{ fontWeight: '700' }}>
          {running ? level.label : 'Duraklatıldı'}
        </AppText>
        <AppText variant="display" style={{ fontSize: 52, lineHeight: 58, fontVariant: ['tabular-nums'] }}>
          {now.toFixed(3)}
          <AppText variant="title" color={colors.textSecondary}>
            {' '}
            g
          </AppText>
        </AppText>
        <AppText variant="caption">Anlık titreşim · en yüksek {state.peak.toFixed(3)} g</AppText>
      </View>

      <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Svg width="100%" height={CHART_H}>
          {[0.05, 0.2].map((g) => {
            const y = CHART_H - (g / SCALE_G) * (CHART_H - 6) - 3;
            return <Line key={g} x1={0} x2={width} y1={y} y2={y} stroke={colors.border} strokeDasharray="4 4" />;
          })}
          {chart ? <Polyline points={chart} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" /> : null}
        </Svg>
        <AppText variant="caption" style={styles.chartLabel}>
          Son 10 saniye
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon={running ? 'pause' : 'play'}
          label={running ? 'Duraklat' : 'Devam'}
          onPress={() => setRunning((r) => !r)}
        />
        <Button style={{ flex: 1 }} variant="secondary" icon="refresh" label="Sıfırla" onPress={() => setState(initialVibration())} />
      </View>
      <Button
        icon="pulse"
        label="Sarsıntı hissettim — bildir"
        onPress={() => router.push({ pathname: '/rapor/yeni', params: { kategori: 'shake' } })}
      />

      <View style={styles.note}>
        <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
        <AppText variant="caption" style={{ flex: 1 }}>
          En doğru sonuç için telefonu düz bir zemine bırakın; elde tutarken yürüme ve el hareketi de görünür. Bu ölçüm deprem büyüklüğü
          veya erken uyarı değildir. Resmî ölçümler AFAD ve Kandilli istasyonlarıyla yapılır. Veriler kaydedilmez, gönderilmez.
        </AppText>
      </View>
    </Page>
  );
}

const styles = themedStyles(() => ({
  gauge: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    backgroundColor: colors.surface,
    boxShadow: colors.shadowSoft,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chart: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingTop: spacing.sm,
  },
  chartLabel: { position: 'absolute', left: spacing.sm, top: 4 },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
}));
