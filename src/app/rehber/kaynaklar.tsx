import { AppText } from '@/components/ui';
import { Page } from '@/components/ds';
import { SOURCES } from '@/features/guide/content';
import { OfflineNote, SourceList } from '@/features/guide/ui';

/** Rehberin dayandığı kaynaklar, doğrulama tarihi ve görsel bilgisi. */
export default function GuideSources() {
  return (
    <Page>
      <OfflineNote />
      <SourceList sources={Object.values(SOURCES)} />
      <AppText variant="caption">
        Rehberdeki illüstrasyonlar GÜVENDE için hazırlanmış tasarım görselleridir; hiçbir kurumun görseli veya logosu kullanılmamıştır.
      </AppText>
    </Page>
  );
}
