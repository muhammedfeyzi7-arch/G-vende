import { Image, type ImageStyle, type StyleProp } from 'react-native';
import type { ArtId } from './content';

/**
 * Rehber illüstrasyonları: GÜVENDE için çizilmiş özgün vektör sahnelerden üretilen raster dosyalar
 * (kaynak: design/guide-art/scenes.mjs → `node design/guide-art/build.mjs`). Uygulamaya gömülüdür;
 * internet gerekmez. Fotoğraf, dış görsel veya kurum logosu yoktur.
 *
 * Opak sahnelerin kenarları düz ART_BG rengindedir; "contain" ile gösterilir, böylece hiçbir öğe
 * kırpılmaz ve kutunun kalan alanı aynı renkle dolar.
 */
export const ART_BG = '#0E1A2E';

export const GUIDE_IMG = {
  'home-safety': require('../../../assets/guide/art/home-safety.jpg'),
  kit: require('../../../assets/guide/art/kit.jpg'),
  'family-plan': require('../../../assets/guide/art/family-plan.jpg'),
  furniture: require('../../../assets/guide/art/furniture.jpg'),
  'drop-cover-hold': require('../../../assets/guide/art/drop-cover-hold.jpg'),
  'drop-cover-hold-hero': require('../../../assets/guide/art/drop-cover-hold-hero.png'),
  'after-quake': require('../../../assets/guide/art/after-quake.jpg'),
  trapped: require('../../../assets/guide/art/trapped.jpg'),
  outdoor: require('../../../assets/guide/art/outdoor.jpg'),
  vehicle: require('../../../assets/guide/art/vehicle.jpg'),
  transit: require('../../../assets/guide/art/transit.jpg'),
  'special-needs': require('../../../assets/guide/art/special-needs.jpg'),
  checklist: require('../../../assets/guide/art/checklist.jpg'),
  logo: require('../../../assets/guide/art/logo.png'),
} as const;
export type GuideImgKey = keyof typeof GUIDE_IMG;

/** Saydam zeminli dosyalar (kırmızı kart, başlık logosu) */
const TRANSPARENT: GuideImgKey[] = ['drop-cover-hold-hero', 'logo'];

/** Konu görseli → dosya ve ekran okuyucu açıklaması. */
const SCENES: Record<ArtId, { img: GuideImgKey; label: string }> = {
  indoor: { img: 'drop-cover-hold', label: 'Masanın altında dizlerinin üzerine çökmüş, bir koluyla başını ve ensesini koruyan, diğer eliyle masa ayağına tutunan kişi' },
  outdoor: { img: 'outdoor', label: 'Binalardan, ağaçtan ve direkten uzak açık alanda çömelip başını koruyan kişi' },
  vehicle: { img: 'vehicle', label: 'Yolun sağ kenarına yanaşıp dörtlü flaşörle durmuş araç' },
  transit: { img: 'transit', label: 'Metro vagonunda dikey direğe sıkıca tutunan kişi' },
  wheelchair: { img: 'special-needs', label: 'Frenleri kilitli tekerlekli sandalyedeki kişi, ilaç çantası ve evcil hayvan taşıma çantası' },
  after: { img: 'after-quake', label: 'Sırt çantasıyla hasarlı binadan uzaklaşıp toplanma alanına yürüyen kişi' },
  gas: { img: 'after-quake', label: 'Binadan uzaklaşıp açık alana yürüyen kişi' },
  trapped: { img: 'trapped', label: 'Enkaz altında, elindeki taşla boruya vurarak yerini duyuran kişi' },
  family: { img: 'family-plan', label: 'Harita üzerinde buluşma noktası, telefonda güvendeyim mesajı ve aile' },
  'prep-home': { img: 'home-safety', label: 'Ev, yangın söndürücü ve güvenlik kalkanı' },
  'prep-plan': { img: 'family-plan', label: 'Harita üzerinde buluşma noktası, telefonda güvendeyim mesajı ve aile' },
  'prep-special': { img: 'special-needs', label: 'Frenleri kilitli tekerlekli sandalyedeki kişi, ilaç çantası ve evcil hayvan taşıma çantası' },
  kit: { img: 'kit', label: 'Su, fener, düdük, belge kılıfı ve ilk yardım çantası' },
};

export function GuideImage({ img, label, style }: { img: GuideImgKey; label?: string; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={GUIDE_IMG[img]}
      resizeMode="contain"
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={[!TRANSPARENT.includes(img) && { backgroundColor: ART_BG }, style]}
    />
  );
}

/** Konu görseli; varsayılan oran 4:3. */
export function GuideArt({
  id,
  width = 120,
  height,
  style,
}: {
  id: ArtId;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const s = SCENES[id];
  return <GuideImage img={s.img} label={s.label} style={[{ width, height: height ?? (width * 3) / 4, borderRadius: 12 }, style]} />;
}

/** Konu görselinin dosya anahtarı. */
export const artImg = (id: ArtId) => SCENES[id].img;

export const ART_IDS = Object.keys(SCENES) as ArtId[];
export const artLabel = (id: ArtId) => SCENES[id].label;
