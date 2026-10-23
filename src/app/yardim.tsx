import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup } from '@/components/ds';
import { colors, radius, spacing, themedStyles } from '@/theme';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'GÜVENDE depremi önceden haber verir mi?',
    a: 'Hayır. GÜVENDE erken uyarı sistemi değildir. Depremler AFAD, Kandilli Rasathanesi ve USGS tarafından yayımlandıktan sonra gösterilir; bu birkaç dakika sürebilir.',
  },
  {
    q: 'Deprem verileri nereden geliyor?',
    a: 'AFAD Deprem Dairesi, Boğaziçi Üniversitesi Kandilli Rasathanesi ve ABD Jeoloji Araştırmaları Kurumu (USGS). Aynı deprem farklı kaynaklarda farklı büyüklükle yayımlanabilir; uygulama her kaynağın değerini ayrı gösterir.',
  },
  {
    q: '“Büyüklük” ile “şiddet” aynı şey mi?',
    a: 'Hayır. Büyüklük depremin açığa çıkardığı enerjidir ve tektir. Şiddet ise bulunduğunuz yerde sarsıntının ne kadar hissedildiğidir; uzaklığa ve zemine göre değişir. Uygulama ölçülmüş şiddet göstermez.',
  },
  {
    q: 'İnternet yokken ne çalışır?',
    a: 'Acil Durum talimatları, 112 araması, SMS ile aileye durum bildirimi, düdük, SOS ışığı, kaydettiğiniz toplanma alanı ve afet çantası listesi internetsiz çalışır. Deprem listesi son başarılı güncellemeden gösterilir.',
  },
  {
    q: 'Ailemle konumum paylaşılıyor mu?',
    a: 'Yalnızca “Konum paylaşımı” açıksa ve siz durum bildirdiğiniz anda. Sürekli takip yapılmaz; arka planda konum toplanmaz. Ayarlar > Konum ve Gizlilik’ten istediğiniz an kapatabilirsiniz.',
  },
  {
    q: 'Toplanma alanımı nasıl öğrenirim?',
    a: 'e-Devlet’teki “AFAD Acil Toplanma Alanı Sorgulama” hizmetinden adresinize atanmış alanı öğrenip Toplanma Alanları ekranında haritada işaretleyebilirsiniz. Uygulama toplanma alanı uydurmaz.',
  },
  {
    q: 'Kullanıcı bildirimleri resmî bilgi mi?',
    a: 'Hayır. Kullanıcıların paylaştığı sarsıntı, hasar ve yol bildirimleri doğrulanmamış olabilir ve resmî kayıtlardan ayrı gösterilir. Yanlış bildirimleri şikâyet edebilirsiniz.',
  },
];

export default function HelpCenter() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Page>
      <GroupTitle>Sık sorulan sorular</GroupTitle>
      {FAQ.map((f, i) => (
        <Pressable
          key={f.q}
          onPress={() => setOpen(open === i ? null : i)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === i }}
          style={styles.item}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="heading" style={{ flex: 1, fontSize: 14 }}>
              {f.q}
            </AppText>
            <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </View>
          {open === i ? (
            <AppText variant="body" color={colors.textSecondary}>
              {f.a}
            </AppText>
          ) : null}
        </Pressable>
      ))}
      <GroupTitle>Daha fazla</GroupTitle>
      <RowGroup>
        <ListRow first icon="book-outline" title="Afet rehberleri" onPress={() => router.push('/rehber')} />
        <ListRow icon="chatbox-outline" title="Geri bildirim gönder" onPress={() => router.push('/geri-bildirim')} />
        <ListRow icon="document-text-outline" title="Hakkında" onPress={() => router.push('/hakkinda')} />
      </RowGroup>
    </Page>
  );
}

const styles = themedStyles(() => ({
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
}));
