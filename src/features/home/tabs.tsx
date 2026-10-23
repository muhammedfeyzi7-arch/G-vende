import { ListSkeleton } from '@/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Banner, Button, Card, Pill, StateMessage } from '@/components/ui';
import { EDEVLET_ASSEMBLY_URL, openDirections } from '@/features/assembly-points/api';
import type { NearbyState } from '@/features/assembly-points/useNearbyAssembly';
import { QuakeListItem } from '@/features/earthquakes/components/QuakeListItem';
import { formatDepth, formatMagnitude, placeTitle } from '@/features/earthquakes/format';
import { SOURCES, type QuakeSnapshot } from '@/features/earthquakes/repository';
import { CategoryChips, type ReportFilter } from '@/features/reports/components/CategoryChips';
import { ReportRow } from '@/features/reports/components/ReportRow';
import { env } from '@/services/env';
import { colors, radius, spacing, themedStyles } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { PendingReport, UserReport } from '@/types/report';
import { formatDistance, type LatLng } from '@/utils/geo';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

export const call112 = () => Linking.openURL('tel:112');

export function LiveFeedTab({
  filter,
  onFilter,
  reports,
  status,
  error,
  lastSyncedAt,
  pending,
  helpful,
  onHelpful,
  onRetry,
  online,
}: {
  filter: ReportFilter;
  onFilter: (f: ReportFilter) => void;
  reports: UserReport[];
  status: string;
  error: string | null;
  lastSyncedAt: string | null;
  pending: PendingReport[];
  helpful: Set<string>;
  onHelpful: (id: string) => void;
  onRetry: () => void;
  online: boolean;
}) {
  const filtered = filter === 'all' ? reports : reports.filter((r) => r.category === filter);
  return (
    <View>
      <CategoryChips value={filter} onChange={onFilter} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {pending.length > 0 ? (
          <Banner
            icon="cloud-upload-outline"
            tone="warning"
            text={`${pending.length} bildirim gönderilmeyi bekliyor (henüz yayınlanmadı).`}
            onPress={() => router.push('/rapor/bekleyen')}
          />
        ) : null}
        {!online && lastSyncedAt ? (
          <Banner icon="cloud-offline-outline" tone="warning" text={`Çevrimdışı. Son eşitleme: ${relativeTimeTr(lastSyncedAt)}`} />
        ) : null}
        {status === 'not-configured' && filtered.length > 0 ? (
          <Banner icon="flask-outline" tone="warning" text="Geliştirme modu: aşağıdaki kayıtlar ÖRNEK VERİDİR, gerçek bildirim değildir." />
        ) : null}
      </View>

      {status === 'not-configured' && filtered.length === 0 ? (
        <StateMessage
          icon="server-outline"
          title="Canlı akış henüz bağlı değil"
          message="Kullanıcı bildirimleri için sunucu (Supabase) yapılandırılmalı. Sahte kayıt gösterilmez."
        />
      ) : status === 'loading' && reports.length === 0 ? (
        <StateMessage icon="hourglass-outline" title="Bildirimler yükleniyor…" compact />
      ) : status === 'error' && reports.length === 0 ? (
        <StateMessage
          icon="cloud-offline-outline"
          tone="error"
          title="Bildirimler alınamadı"
          message={error ?? undefined}
          actionLabel="Tekrar dene"
          onAction={onRetry}
        />
      ) : filtered.length === 0 ? (
        <StateMessage
          icon="chatbubbles-outline"
          title="Bu kategoride bildirim yok"
          message="Son 48 saatte paylaşılan bildirim bulunmuyor."
          compact
        />
      ) : (
        <View>
          {status === 'error' ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
              <Banner
                icon="alert-circle-outline"
                tone="error"
                text={`Güncellenemedi: ${error}. Son eşitleme ${lastSyncedAt ? relativeTimeTr(lastSyncedAt) : 'bilinmiyor'}.`}
                onPress={onRetry}
              />
            </View>
          ) : null}
          {filtered.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              helpful={helpful.has(r.id)}
              onHelpful={() => onHelpful(r.id)}
              onPress={() => !r.isSample && router.push({ pathname: '/rapor/[id]', params: { id: r.id } })}
            />
          ))}
          <AppText variant="caption" style={styles.footnote}>
            Kullanıcı bildirimleri doğrulanmamış olabilir. Resmî açıklamaları AFAD ve yerel yönetimlerden takip edin.
          </AppText>
        </View>
      )}
    </View>
  );
}

export function OfficialDataTab({
  snapshot,
  events,
  user,
  loading,
  onRetry,
}: {
  snapshot: QuakeSnapshot | null;
  events: EarthquakeEvent[];
  user: LatLng | null;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <View>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <SourceHealthCard snapshot={snapshot} onRetry={onRetry} />
      </View>
      {loading && !snapshot ? (
        <StateMessage icon="hourglass-outline" title="Deprem verileri yükleniyor…" compact />
      ) : events.length === 0 ? (
        <StateMessage
          icon="pulse-outline"
          title="Kayıt yok"
          message="Seçili büyüklük eşiğinin üzerinde son 7 günde kayıt bulunamadı."
          compact
        />
      ) : (
        events
          .slice(0, 60)
          .map((e) => (
            <QuakeListItem
              key={e.id}
              event={e}
              user={user}
              onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: e.id } })}
            />
          ))
      )}
    </View>
  );
}

export function SourceHealthCard({ snapshot, onRetry }: { snapshot: QuakeSnapshot | null; onRetry?: () => void }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="heading">Veri kaynakları</AppText>
        {onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Kaynakları yenile" style={{ padding: 4 }}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {env.quakeSources.map((id) => {
        const h = snapshot?.health.find((x) => x.source === id);
        const ok = h?.ok;
        return (
          <View key={id} style={styles.healthRow}>
            <View style={[styles.healthDot, { backgroundColor: h == null ? colors.textMuted : ok ? colors.safe : colors.danger }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={colors.text}>
                {SOURCES[id].label}
              </AppText>
              <AppText variant="caption" numberOfLines={2}>
                {h == null
                  ? 'Henüz sorgulanmadı'
                  : ok
                    ? `${h.count} kayıt · senkron ${relativeTimeTr(h.lastSuccessAt!)}${h.lastEventAt ? ` · son olay ${relativeTimeTr(h.lastEventAt)}` : ''}`
                    : `${h.error ?? 'Ulaşılamadı'} · son başarılı: ${h.lastSuccessAt ? relativeTimeTr(h.lastSuccessAt) : 'yok'}`}
              </AppText>
            </View>
          </View>
        );
      })}
      {snapshot?.stale ? (
        <Banner
          icon="time-outline"
          tone="warning"
          text={`Veriler güncel değil. Son başarılı senkron: ${snapshot.lastSuccessAt ? formatDateTimeTr(snapshot.lastSuccessAt) : 'yok'}. Gösterilen depremler eski olabilir.`}
        />
      ) : null}
      <AppText variant="caption">
        {snapshot?.via === 'server'
          ? 'Kaynakları GÜVENDE sunucusu 2 dakikada bir sorgular; yeni kayıtlar uygulamaya canlı gelir. '
          : snapshot?.via === 'direct'
            ? 'Sunucuya ulaşılamadığı için kaynaklar bu cihazdan doğrudan sorgulandı. '
            : ''}
        Aynı deprem farklı kaynaklarda farklı büyüklükle yayımlanabilir. Uygulama özgün değerleri korur; ayrıntı için depreme dokunun.
      </AppText>
    </Card>
  );
}

function AssemblyList({
  state,
  onRetry,
  onShowAll,
  needsLocation,
}: {
  state: NearbyState;
  onRetry: () => void;
  onShowAll: () => void;
  needsLocation: () => void;
}) {
  if (state.status === 'no-location')
    return (
      <StateMessage
        icon="location-outline"
        title="Konumunuz bilinmiyor"
        message="Yakındaki alanları göstermek için konum izni verin veya ilinizi elle seçin."
        actionLabel="Konum seç"
        onAction={needsLocation}
      />
    );
  if (state.status === 'not-configured' || state.status === 'error' || (state.status === 'ready' && state.points.length === 0))
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <StateMessage
          icon="people-outline"
          tone={state.status === 'error' ? 'error' : 'neutral'}
          title={state.status === 'error' ? 'Toplanma alanları alınamadı' : 'Bu bölge için doğrulanmış veri yok'}
          message={
            state.status === 'error'
              ? state.error
              : 'Uygulama yalnızca resmî kaynaklardan aktarılmış alanları gösterir; konum uydurmaz. Size atanmış toplanma alanını e-Devlet üzerinden sorgulayabilirsiniz.'
          }
          actionLabel={state.status === 'error' ? 'Tekrar dene' : undefined}
          onAction={state.status === 'error' ? onRetry : undefined}
          compact
        />
        <Button
          label="e-Devlet’te sorgula (AFAD)"
          icon="open-outline"
          variant="secondary"
          onPress={() => Linking.openURL(EDEVLET_ASSEMBLY_URL)}
        />
      </View>
    );
  if (state.status === 'loading') return <ListSkeleton />;
  return (
    <View style={{ padding: spacing.lg, gap: spacing.sm }}>
      {state.fromCache ? (
        <Banner icon="cloud-offline-outline" tone="warning" text={`Önbellekten gösteriliyor (${relativeTimeTr(state.fetchedAt)}).`} />
      ) : null}
      {state.points.slice(0, 5).map((p) => (
        <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
          <View style={styles.apIcon}>
            <Ionicons name="people" size={18} color={colors.safe} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14 }}>
              {p.name}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {formatDistance(p.distanceKm)} · {p.sourceName}
            </AppText>
          </View>
          <Pressable
            onPress={() => openDirections(p)}
            accessibilityRole="button"
            accessibilityLabel={`${p.name} için yol tarifi`}
            style={styles.routeBtn}
          >
            <Ionicons name="walk" size={20} color={colors.primary} />
          </Pressable>
        </Card>
      ))}
      <Button label="Tüm toplanma alanları" variant="secondary" icon="list-outline" onPress={onShowAll} />
    </View>
  );
}

export function AssemblyTab(props: {
  state: NearbyState;
  myPoint: (AssemblyPoint & { distanceKm: number }) | null;
  onRetry: () => void;
  onShowAll: () => void;
  needsLocation: () => void;
}) {
  const { myPoint } = props;
  return (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        {myPoint ? (
          <Card
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderColor: colors.safe + '66' }}
          >
            <View style={[styles.apIcon, { borderWidth: 3 }]}>
              <Ionicons name="flag" size={18} color={colors.safe} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14 }}>
                {myPoint.name}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {Number.isFinite(myPoint.distanceKm) ? `${formatDistance(myPoint.distanceKm)} · ` : ''}Size atanan alan (kendi kaydınız)
              </AppText>
            </View>
            <Pressable
              onPress={() => openDirections(myPoint)}
              accessibilityRole="button"
              accessibilityLabel={`${myPoint.name} için yol tarifi`}
              style={styles.routeBtn}
            >
              <Ionicons name="walk" size={20} color={colors.primary} />
            </Pressable>
          </Card>
        ) : (
          <Button
            label="Size atanan alanı işaretleyin"
            icon="flag-outline"
            variant="secondary"
            onPress={() => router.push('/toplanma/sec')}
          />
        )}
      </View>
      <AssemblyList state={props.state} onRetry={props.onRetry} onShowAll={props.onShowAll} needsLocation={props.needsLocation} />
    </View>
  );
}

export function HelpTab({ helpReports, onOpenReport }: { helpReports: UserReport[]; onOpenReport: (r: UserReport) => void }) {
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Card style={{ gap: spacing.sm, borderColor: colors.dangerBorder }}>
        <AppText variant="heading">Hayati tehlike varsa 112’yi arayın</AppText>
        <AppText variant="label">
          Uygulamadaki yardım bildirimleri acil çağrı değildir; ekiplerin bunları görmesi garanti edilmez. Acil durumlarda 112 Acil Çağrı
          Merkezi’ni arayın.
        </AppText>
        <Button label="112’yi ara" icon="call" variant="danger" onPress={call112} />
      </Card>
      <Button
        label="Deprem anında ve sonrasında yapılacaklar"
        icon="book-outline"
        variant="secondary"
        onPress={() => router.push('/acil')}
      />
      <AppText variant="heading" style={{ marginTop: spacing.sm }}>
        Son yardım bildirimleri
      </AppText>
      {helpReports.length === 0 ? (
        <AppText variant="label">Son 48 saatte yardım bildirimi yok.</AppText>
      ) : (
        helpReports.slice(0, 10).map((r) => (
          <Pressable key={r.id} onPress={() => onOpenReport(r)} style={styles.helpRow} accessibilityRole="button">
            <Ionicons name="alert-circle" size={20} color={colors.caution} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={colors.text} numberOfLines={1}>
                {r.areaLabel ?? 'Bölge belirtilmemiş'}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {r.description ?? 'Açıklama yok'} · {relativeTimeTr(r.createdAt)}
              </AppText>
            </View>
            {r.isSample ? <Pill label="ÖRNEK" color={colors.warning} /> : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

export function DetailsTab({
  event,
  snapshot,
  user,
}: {
  event: EarthquakeEvent | null;
  snapshot: QuakeSnapshot | null;
  user: LatLng | null;
}) {
  if (!event) return <StateMessage icon="information-circle-outline" title="Seçili deprem yok" compact />;
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Card style={{ gap: spacing.sm }}>
        <AppText variant="heading">{placeTitle(event)}</AppText>
        <AppText variant="label">{formatDateTimeTr(event.primary.occurredAt)} (TSİ)</AppText>
        <View style={styles.readingHeader}>
          <AppText variant="caption" style={{ flex: 1.2 }}>
            Kaynak
          </AppText>
          <AppText variant="caption" style={{ flex: 1 }}>
            Büyüklük
          </AppText>
          <AppText variant="caption" style={{ flex: 1 }}>
            Derinlik
          </AppText>
          <AppText variant="caption" style={{ flex: 1.2 }}>
            Durum
          </AppText>
        </View>
        {event.readings.map((r) => (
          <View key={r.source} style={styles.readingRow}>
            <AppText variant="label" color={colors.text} style={{ flex: 1.2 }}>
              {SOURCES[r.source].label}
            </AppText>
            <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
              {formatMagnitude(r.magnitude)} {r.magnitudeType ?? ''}
            </AppText>
            <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
              {formatDepth(r.depthKm)}
            </AppText>
            <AppText variant="caption" style={{ flex: 1.2 }}>
              {r.reviewStatus === 'reviewed' ? 'Revize' : r.reviewStatus === 'automatic' ? 'Otomatik/ilksel' : 'Belirtilmemiş'}
            </AppText>
          </View>
        ))}
        <AppText variant="caption">
          Son güncelleme: {snapshot?.lastSuccessAt ? formatDateTimeTr(snapshot.lastSuccessAt) : 'bilinmiyor'}
        </AppText>
        {user ? null : <AppText variant="caption">Uzaklık için konum izni verin veya ilinizi seçin.</AppText>}
      </Card>
      <Button
        label="Tüm ayrıntılar"
        icon="open-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: event.id } })}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  footnote: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, textAlign: 'center' },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  apIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, minHeight: 44 },
  readingHeader: { flexDirection: 'row', marginTop: spacing.sm },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
