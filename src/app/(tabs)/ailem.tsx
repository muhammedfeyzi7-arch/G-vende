import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button, Card, Pill, StateMessage } from '@/components/ui';
import { openDirections } from '@/features/assembly-points/api';
import {
  acceptInvite,
  checkin,
  createGroup,
  createInvite,
  inviteLink,
  leaveGroup,
  setMeetingPoint,
  setShareLocation,
  type CheckinStatus,
  type FamilyGroup,
} from '@/features/family/api';
import { LocalFamilyCard } from '@/features/family/LocalFamilyCard';
import { useFamily } from '@/features/family/useFamily';
import { useApp } from '@/providers/AppProvider';
import { friendlyError } from '@/services/supabase';
import { colors, radius, spacing } from '@/theme';
import { coarsen } from '@/utils/geo';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { state, reload } = useFamily();
  const { userCoords, location, online } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await fn();
      if (success) Alert.alert('Tamam', success);
      await reload();
    } catch (e) {
      Alert.alert('İşlem yapılamadı', friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const sendStatus = (groups: FamilyGroup[], me: string, status: CheckinStatus) => {
    const sharesAny = groups.some((g) => g.members.find((m) => m.userId === me)?.shareLocation);
    const go = (note: string | null) =>
      run(
        status,
        () =>
          checkin(
            groups.map((g) => g.id),
            status,
            note,
            sharesAny && location.status === 'granted' && userCoords ? coarsen(userCoords, 0.001) : null,
          ),
        status === 'safe'
          ? 'Ailenize güvende olduğunuz bildirildi.'
          : 'Ailenize yardıma ihtiyacınız olduğu bildirildi. Hayati tehlike varsa 112’yi arayın.',
      );
    if (status === 'need_help') {
      Alert.alert('Yardım bildirimi', 'Bu bildirim yalnızca aile grubunuza gider; acil çağrı değildir.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gönder', onPress: () => go(null) },
      ]);
    } else go(null);
  };

  let body: React.ReactNode;
  if (state.status === 'not-configured') {
    body = (
      <Card style={{ gap: 6 }}>
        <AppText variant="heading">Çevrimiçi aile grubu</AppText>
        <AppText variant="label">
          Aile üyelerinin durumunu uygulama içinde görmek için sunucu bağlantısı gerekir; bu kurulumda henüz yapılandırılmadı. Yukarıdaki
          SMS ile durum bildirimi sunucu olmadan çalışır.
        </AppText>
      </Card>
    );
  } else if (state.status === 'signed-out') {
    body = (
      <StateMessage
        icon="people-outline"
        title="Aile güvenlik ağı"
        message="Ailenizle güvenlik durumunuzu paylaşmak için giriş yapın. Konum paylaşımı her zaman isteğe bağlıdır."
        actionLabel="Giriş yap"
        onAction={() => router.push('/giris')}
      />
    );
  } else if (state.status === 'loading') {
    body = <StateMessage icon="hourglass-outline" title="Yükleniyor…" compact />;
  } else if (state.status === 'error' && !state.cached) {
    body = (
      <StateMessage
        icon="cloud-offline-outline"
        tone="error"
        title="Aile bilgileri alınamadı"
        message={state.error}
        actionLabel="Tekrar dene"
        onAction={reload}
      />
    );
  } else {
    const groups = state.status === 'ready' ? state.groups : state.cached!.groups;
    const me = state.status === 'ready' ? state.me : null;
    body = (
      <>
        {state.status === 'error' ? (
          <Banner
            icon="cloud-offline-outline"
            tone="warning"
            text={`Güncellenemedi. Cihazda kayıtlı bilgiler (${relativeTimeTr(state.cached!.at)}) gösteriliyor.`}
          />
        ) : null}
        {groups.length && me ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              style={{ flex: 1 }}
              label="Güvendeyim"
              icon="shield-checkmark"
              loading={busy === 'safe'}
              disabled={!online}
              onPress={() => sendStatus(groups, me, 'safe')}
            />
            <Button
              style={{ flex: 1 }}
              label="Yardım lazım"
              icon="alert-circle"
              variant="danger"
              loading={busy === 'need_help'}
              disabled={!online}
              onPress={() => sendStatus(groups, me, 'need_help')}
            />
          </View>
        ) : null}
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} me={me} busy={busy} run={run} />
        ))}
        <CreateOrJoin run={run} busy={busy} hasGroups={groups.length > 0} />
      </>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: tabBarHeight + spacing.xl,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="title" style={{ fontSize: 24 }}>
        Ailem
      </AppText>
      <LocalFamilyCard />
      {state.status !== 'not-configured' ? (
        <AppText variant="label" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Çevrimiçi aile grubu
        </AppText>
      ) : null}
      {body}
    </ScrollView>
  );
}

function GroupCard({
  group,
  me,
  busy,
  run,
}: {
  group: FamilyGroup;
  me: string | null;
  busy: string | null;
  run: (key: string, fn: () => Promise<unknown>, success?: string) => Promise<void>;
}) {
  const { userCoords } = useApp();
  const self = group.members.find((m) => m.userId === me);
  const isOwner = self?.role === 'owner';
  const [mpName, setMpName] = useState(group.meetingPoint?.name ?? '');
  const [editMp, setEditMp] = useState(false);

  const invite = () =>
    run('invite-' + group.id, async () => {
      const inv = await createInvite(group.id);
      await Share.share({
        message: `GÜVENDE aile grubuna katıl (“${group.name}”). Bağlantı 48 saat geçerlidir ve bir kez kullanılabilir: ${inviteLink(inv.token)}`,
      });
    });

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="heading" style={{ flex: 1 }}>
          {group.name}
        </AppText>
        {isOwner ? <Pill label="Yönetici" color={colors.primary} /> : null}
      </View>
      {group.members.map((m) => {
        const c = m.lastCheckin;
        const color = !c ? colors.textMuted : c.status === 'safe' ? colors.safe : colors.danger;
        return (
          <View key={m.userId} style={styles.member}>
            <View style={[styles.avatar, { borderColor: color }]}>
              <AppText variant="heading" color={color}>
                {m.displayName.slice(0, 1).toLocaleUpperCase('tr-TR')}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body">
                {m.displayName}
                {m.userId === me ? ' (siz)' : ''}
              </AppText>
              <AppText variant="caption" color={color}>
                {!c ? 'Son 7 günde durum bildirilmedi' : c.status === 'safe' ? 'Güvende' : 'Yardıma ihtiyacı var'}
                {c ? ` · ${relativeTimeTr(c.at)}` : ''}
              </AppText>
              {c ? <AppText variant="caption">Güncelleme: {formatDateTimeTr(c.at)}</AppText> : null}
            </View>
            {c?.location ? (
              <Pressable
                onPress={() => openDirections({ ...c.location!, name: m.displayName })}
                accessibilityRole="button"
                accessibilityLabel={`${m.displayName} konumuna yol tarifi`}
                style={{ padding: 8 }}
              >
                <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {self ? (
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color={colors.text}>
              Durum bildirirken konumumu bu grupla paylaş
            </AppText>
            <AppText variant="caption">Yalnızca “Güvendeyim / Yardım lazım” anında, ~100 m hassasiyetle. Sürekli takip yapılmaz.</AppText>
          </View>
          <Switch
            value={self.shareLocation}
            onValueChange={(v) => run('share-' + group.id, () => setShareLocation(group.id, v))}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            accessibilityLabel="Konum paylaşımı"
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.text}>
          Buluşma noktası
        </AppText>
        {editMp && isOwner ? (
          <>
            <TextInput
              value={mpName}
              onChangeText={setMpName}
              placeholder="ör. Okul bahçesi"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                label="Konumumla kaydet"
                disabled={!mpName.trim() || !userCoords}
                onPress={() => run('mp', () => setMeetingPoint(group.id, mpName.trim(), userCoords).then(() => setEditMp(false)))}
              />
              <Button
                style={{ flex: 1 }}
                label="Adıyla kaydet"
                disabled={!mpName.trim()}
                onPress={() => run('mp', () => setMeetingPoint(group.id, mpName.trim(), null).then(() => setEditMp(false)))}
              />
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="body" style={{ flex: 1 }}>
              {group.meetingPoint?.name ?? 'Belirlenmedi'}
            </AppText>
            {group.meetingPoint?.latitude != null ? (
              <Button
                variant="ghost"
                icon="walk-outline"
                label="Rota"
                onPress={() =>
                  openDirections({
                    latitude: group.meetingPoint!.latitude!,
                    longitude: group.meetingPoint!.longitude!,
                    name: group.meetingPoint!.name,
                  })
                }
              />
            ) : null}
            {isOwner ? <Button variant="ghost" label="Düzenle" onPress={() => setEditMp(true)} /> : null}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {isOwner ? (
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="person-add-outline"
            label="Davet et"
            loading={busy === 'invite-' + group.id}
            onPress={invite}
          />
        ) : null}
        <Button
          style={{ flex: 1 }}
          variant="ghost"
          icon="exit-outline"
          label="Gruptan ayrıl"
          onPress={() =>
            Alert.alert('Gruptan ayrıl', `“${group.name}” grubundan ayrılmak istiyor musunuz?`, [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Ayrıl', style: 'destructive', onPress: () => run('leave', () => leaveGroup(group.id)) },
            ])
          }
        />
      </View>
    </Card>
  );
}

function CreateOrJoin({
  run,
  busy,
  hasGroups,
}: {
  run: (key: string, fn: () => Promise<unknown>, success?: string) => Promise<void>;
  busy: string | null;
  hasGroups: boolean;
}) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="heading">{hasGroups ? 'Yeni grup veya davet' : 'Aile grubu oluşturun'}</AppText>
      <AppText variant="caption">Aile üyeleri yalnızca davet bağlantısıyla katılabilir. Grup bilgilerini yalnızca üyeler görür.</AppText>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Grupta görünecek adınız"
        placeholderTextColor={colors.textMuted}
        maxLength={40}
        style={styles.input}
        accessibilityLabel="Görünen adınız"
      />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Grup adı (ör. Yılmaz Ailesi)"
        placeholderTextColor={colors.textMuted}
        maxLength={40}
        style={styles.input}
        accessibilityLabel="Grup adı"
      />
      <Button
        label="Grup oluştur"
        icon="add-circle-outline"
        loading={busy === 'create'}
        disabled={!name.trim() || !displayName.trim()}
        onPress={() => run('create', () => createGroup(name.trim(), displayName.trim()).then(() => setName('')))}
      />
      <View style={styles.divider} />
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Davet kodu veya bağlantısı"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        style={styles.input}
        accessibilityLabel="Davet kodu"
      />
      <Button
        label="Davetle katıl"
        variant="secondary"
        icon="enter-outline"
        loading={busy === 'join'}
        disabled={!code.trim() || !displayName.trim()}
        onPress={() =>
          run('join', () => acceptInvite(code.trim().split('/').pop()!, displayName.trim()).then(() => setCode('')), 'Gruba katıldınız.')
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
});
