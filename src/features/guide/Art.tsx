import { Image, type ImageStyle, type StyleProp } from 'react-native';
import type { ArtId } from './content';

/**
 * Rehber illüstrasyonları (uygulamaya gömülü raster görseller; internet gerekmez).
 * Kaynak: proje sahibinin verdiği tasarım görselleri (assets/guide/). Hiçbir kurumun görseli veya logosu yoktur.
 */
export const GUIDE_IMG = {
  hero: require('../../../assets/guide/hero.jpg'),
  before: require('../../../assets/guide/before.jpg'),
  during: require('../../../assets/guide/during.jpg'),
  after: require('../../../assets/guide/after.jpg'),
  trapped: require('../../../assets/guide/trapped.jpg'),
  outside: require('../../../assets/guide/outside.jpg'),
  family: require('../../../assets/guide/family.jpg'),
  kit: require('../../../assets/guide/kit.jpg'),
  logo: require('../../../assets/guide/logo.png'),
  'prep-head': require('../../../assets/guide/prep-head.jpg'),
  'prep-hero': require('../../../assets/guide/prep-hero.jpg'),
  'prep-home': require('../../../assets/guide/prep-home.jpg'),
  'prep-kit': require('../../../assets/guide/prep-kit.jpg'),
  'prep-plan': require('../../../assets/guide/prep-plan.jpg'),
  'prep-furniture': require('../../../assets/guide/prep-furniture.jpg'),
  'prep-special': require('../../../assets/guide/prep-special.jpg'),
} as const;
export type GuideImgKey = keyof typeof GUIDE_IMG;

/** Konu görseli → dosya ve ekran okuyucu açıklaması. */
const SCENES: Record<ArtId, { img: GuideImgKey; label: string }> = {
  indoor: { img: 'during', label: 'Masanın altında çökmüş, başını kollarıyla koruyan kişi' },
  outdoor: { img: 'outside', label: 'Binalardan uzak, açık yolda bir araç' },
  vehicle: { img: 'outside', label: 'Yolda seyreden araç' },
  transit: { img: 'outside', label: 'Şehirde yol ve araç' },
  wheelchair: { img: 'prep-special', label: 'Yaşlı bir kişi ve çocuk' },
  after: { img: 'after', label: 'Sırt çantasıyla binalardan uzaklaşan kişi' },
  gas: { img: 'after', label: 'Sırt çantasıyla binadan uzaklaşan kişi' },
  trapped: { img: 'trapped', label: 'Enkaz altında yardım sinyali veren kişi' },
  family: { img: 'family', label: 'Telefonla konum paylaşan aile' },
  'prep-home': { img: 'prep-home', label: 'Ev' },
  'prep-plan': { img: 'prep-plan', label: 'Haritada buluşma noktasına bakan aile' },
  'prep-special': { img: 'prep-special', label: 'Yaşlı bir kişi, çocuk ve evcil hayvan' },
  kit: { img: 'kit', label: 'Su, fener, radyo ve ilk yardım çantası' },
};

export function GuideImage({ img, label, style }: { img: GuideImgKey; label?: string; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={GUIDE_IMG[img]}
      resizeMode="cover"
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={style}
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
