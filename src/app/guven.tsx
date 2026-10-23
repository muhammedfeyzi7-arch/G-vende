import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { GroupTitle, IconTile, Page, accent } from '@/components/ds';
import { LIVE_PHOTO_MAX_AGE_MIN, REPORT_RADIUS_M, VERIFY_THRESHOLD, VOTE_RADIUS_M } from '@/features/trust/rules';
import { colors, radius, spacing } from '@/theme';

const METHODS = [
  {
    icon: 'id-card-outline',
    color: accent.purple,
    title: 'Kimlik doğrulama',
    how: 'Bildirim ve oylama için T.C. kimlik bilgileri nüfus kaydıyla (NVİ) bir kez eşleştirilir. Her kimlik tek hesapta kullanılabilir.',
    stops: 'Anonim sahte hesap açıp yalan ihbar yaymayı zorlaştırır.',
  },
  {
    icon: 'locate-outline',
    color: accent.teal,
    title: 'Canlı konum (geofencing)',
    how: `Bildirilen yer, telefonun o anki GPS konumuna en fazla ${REPORT_RADIUS_M / 1000} km uzak olabilir. GPS doğruluğu 100 m’den kötüyse kabul edilmez.`,
    stops: 'Başka şehirden, oturduğu yerden yalan pin açılmasını engeller.',
  },
  {
    icon: 'camera-outline',
    color: accent.orange,
    title: 'Yalnızca anlık kamera',
    how: `Hasar ve yol bildirimleri, uygulama kamerasıyla son ${LIVE_PHOTO_MAX_AGE_MIN} dakikada çekilmiş fotoğraf eklenene kadar yayınlanmaz. Galeriden yükleme kapalıdır.`,
    stops: 'Eski deprem veya başka ülkeden yıkım fotoğraflarıyla panik yaratılmasını zorlaştırır.',
  },
  {
    icon: 'people-outline',
    color: accent.green,
    title: 'Topluluk doğrulaması',
    how: `${VOTE_RADIUS_M} m yakınındaki doğrulanmış kişiler “Doğru, buradayım” veya “Yanlış ihbar” der. ${VERIFY_THRESHOLD} onay → Topluluk Destekli. ${VERIFY_THRESHOLD} ret → kaldırılır.`,
    stops: 'Yanlış ihbar haritadan düşer; yazarına ihlal puanı ve süreli bildirim yasağı verilir (1. ihlal 7 gün, sonrası 30 gün).',
  },
  {
    icon: 'checkmark-circle-outline',
    color: accent.blue,
    title: 'Kurumsal hesaplar',
    how: 'AFAD, AKUT, Kızılay, belediyeler ve sahadaki resmî ekipler için “Resmî” rozetli hesaplar. Rolü yalnızca sistem yöneticisi atar.',
    stops: 'Kesin bilgi (ör. “Bu toplanma alanı doldu”) sıradan paylaşımlardan anında ayrılır.',
  },
];

/** Bilgi kirliliğine karşı uygulanan kuralların açıklaması. */
export default function TrustInfoScreen() {
  return (
    <Page>
      <AppText variant="label">
        Afetlerde en büyük sorunlardan biri asılsız ihbarlar ve yanıltıcı paylaşımlardır. GÜVENDE’de kullanıcı bildirimleri aşağıdaki
        kurallardan geçer. Kurallar telefonda değil sunucuda uygulanır; uygulama değiştirilse bile atlanamaz.
      </AppText>
      {METHODS.map((m) => (
        <View
          key={m.title}
          style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}
        >
          <IconTile icon={m.icon} color={m.color} size={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="heading">{m.title}</AppText>
            <AppText variant="label">{m.how}</AppText>
            <AppText variant="caption" color={colors.safe}>
              {m.stops}
            </AppText>
          </View>
        </View>
      ))}
      <GroupTitle>Bildirim akışı</GroupTitle>
      {[
        '1. Kimlik doğrulanmış mı? → evet',
        '2. GPS konumu bildirilen yere yakın mı? → evet',
        '3. Gerekiyorsa canlı kamera fotoğrafı çekildi mi? → evet → “Kullanıcı Bildirimi” olarak yayın',
        `4. Yakındaki ${VERIFY_THRESHOLD} doğrulanmış kişi onayladı mı? → “Topluluk Destekli”`,
      ].map((t) => (
        <AppText key={t} variant="label" color={colors.text}>
          {t}
        </AppText>
      ))}
      <GroupTitle>Sınırlar (dürüst not)</GroupTitle>
      <AppText variant="caption">
        • NVİ doğrulaması bilgilerin eşleştiğini gösterir, telefonu kullananın o kişi olduğunu kanıtlamaz. e-Devlet ile giriş resmî protokol
        gerektirir.{'\n'}• Değiştirilmiş (root/jailbreak) cihazlarda sahte GPS ve sahte kamera mümkün olabilir; mağaza sürümünde Play
        Integrity / App Attest eklenmelidir.{'\n'}• Topluluk oyları kötüye kullanılabilir; kaldırılan bildirimler için itiraz Geri Bildirim
        ekranından yapılır.{'\n'}• Bu sistem 112’nin yerine geçmez.
      </AppText>
      <Button label="Kimliğimi doğrula" icon="shield-checkmark" onPress={() => router.push('/kimlik')} />
    </Page>
  );
}
