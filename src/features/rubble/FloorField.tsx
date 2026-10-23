import { Barometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { readJson, removeKey, writeJson } from '@/services/storage';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { floorFromHeight, floorLabel, heightDiffM, loadFloor, MAX_MEASURE_GAP_MS, saveFloor } from './floor';

const REF_KEY = 'floor-baro-ref';
type Ref = { hPa: number; at: string };

/** Barometreden ~2 sn ortalama basınç (hPa); sensör yoksa null. */
async function readPressure(ms = 2000): Promise<number | null> {
  if (!(await Barometer.isAvailableAsync().catch(() => false))) return null;
  return new Promise((resolve) => {
    const values: number[] = [];
    Barometer.setUpdateInterval(100);
    const sub = Barometer.addListener((d) => values.push(d.pressure));
    setTimeout(() => {
      sub.remove();
      resolve(values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    }, ms);
  });
}

/**
 * Bulunduğunuz kat: yardım/enkaz SMS'lerine ve 112'ye okunacak adrese eklenir. Elle girilir;
 * barometresi olan telefonlarda iki adımlı GÖRELİ ölçüm yardımcı olur (zeminde sıfırla → katında ölç).
 */
export function FloorField() {
  const [floor, setFloor] = useState('');
  const [hasBaro, setHasBaro] = useState(false);
  const [ref, setRef] = useState<Ref | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ h: number; floor: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadFloor().then((f) => f && setFloor(f.floor));
    readJson<Ref>(REF_KEY).then((r) => r && Date.now() - Date.parse(r.at) < MAX_MEASURE_GAP_MS && setRef(r));
    Barometer.isAvailableAsync()
      .then(setHasBaro)
      .catch(() => setHasBaro(false));
  }, []);

  const resetAtGround = async () => {
    setBusy(true);
    setResult(null);
    setMsg(null);
    const hPa = await readPressure();
    setBusy(false);
    if (hPa == null) return setMsg('Basınç sensörü okunamadı.');
    const r = { hPa, at: new Date().toISOString() };
    setRef(r);
    writeJson(REF_KEY, r);
    setMsg('Zemin kaydedildi. Şimdi katınıza çıkın ve “Katımdayım”a basın (30 dakika içinde).');
  };

  const measure = async () => {
    if (!ref) return;
    if (Date.now() - Date.parse(ref.at) > MAX_MEASURE_GAP_MS) {
      setRef(null);
      removeKey(REF_KEY);
      return setMsg('Ölçümler arası 30 dakikayı geçti; hava basıncı değişmiş olabilir. Zeminde yeniden başlayın.');
    }
    setBusy(true);
    const hPa = await readPressure();
    setBusy(false);
    if (hPa == null) return setMsg('Basınç sensörü okunamadı.');
    const h = heightDiffM(ref.hPa, hPa);
    setResult({ h, floor: floorFromHeight(h) });
    setMsg(null);
  };

  const update = (t: string) => {
    setFloor(t);
    saveFloor(t);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppText variant="label" color={colors.text} style={{ fontWeight: '600' }}>
          Bulunduğum kat
        </AppText>
        <TextInput
          value={floor}
          onChangeText={update}
          placeholder="ör. 4, zemin, -1"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Bulunduğum kat"
          maxLength={20}
        />
      </View>
      <AppText variant="caption">
        Yardım ve “enkaz altındayım” mesajlarına eklenir{floorLabel(floor) ? `: ${floorLabel(floor)}` : ''}. Evde/işte kaldığınız katı
        önceden girin.
      </AppText>

      {hasBaro ? (
        <View style={styles.baro}>
          <AppText variant="label" color={colors.text}>
            Barometreyle ölç (yardımcı)
          </AppText>
          <AppText variant="caption">
            Telefonunuzun basınç sensörü yükseklik farkını ölçer: binanın giriş katında “Zemin kattayım”a, sonra katınızda “Katımdayım”a
            basın. Kat yüksekliği 3 m varsayılır; sonuç yaklaşıktır.
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} size="sm" variant="secondary" label="Zemin kattayım" onPress={resetAtGround} loading={busy && !ref} />
            <Button style={{ flex: 1 }} size="sm" label="Katımdayım" onPress={measure} disabled={!ref} loading={busy && !!ref} />
          </View>
          {msg ? <AppText variant="caption">{msg}</AppText> : null}
          {result ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
                ≈ {result.h.toFixed(1)} m yukarı · {floorLabel(String(result.floor))}
              </AppText>
              <Button
                size="sm"
                label="Kaydet"
                onPress={() => {
                  setFloor(String(result.floor));
                  saveFloor(String(result.floor), true);
                  setResult(null);
                  setMsg('Kat kaydedildi.');
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
    color: colors.text,
  },
  baro: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
}));
