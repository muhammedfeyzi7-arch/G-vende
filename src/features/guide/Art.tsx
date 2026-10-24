import { Image, type ImageStyle, type StyleProp } from 'react-native';
import type { ArtId, PicId } from './content';

/**
 * Rehber ve Acil Durum görselleri. Konu görselleri kullanıcının sağladığı kolajdan kırpılmış
 * fotoğraflardır (`python3 design/guide-art/photos.py`); logo ve ana sayfa kart dekoru çizimdir
 * (`node design/guide-art/build.mjs`). Hepsi uygulamaya gömülüdür; internet gerekmez. Kurum logosu yoktur.
 *
 * Fotoğraflar kutuyu doldurur ("cover"); saydam çizimler kırpılmadan ("contain") gösterilir.
 */
export const ART_BG = '#0E1A2E';

export const GUIDE_IMG = {
  'home-safety': require('../../../assets/guide/art/home-safety.jpg'),
  kit: require('../../../assets/guide/art/kit.jpg'),
  'family-plan': require('../../../assets/guide/art/family-plan.jpg'),
  furniture: require('../../../assets/guide/art/furniture.jpg'),
  'drop-cover-hold': require('../../../assets/guide/art/drop-cover-hold.jpg'),
  'drop-cover-hold-hero': require('../../../assets/guide/art/drop-cover-hold-hero.jpg'),
  'after-quake': require('../../../assets/guide/art/after-quake.jpg'),
  trapped: require('../../../assets/guide/art/trapped.jpg'),
  outdoor: require('../../../assets/guide/art/outdoor.jpg'),
  vehicle: require('../../../assets/guide/art/vehicle.jpg'),
  transit: require('../../../assets/guide/art/transit.jpg'),
  'special-needs': require('../../../assets/guide/art/special-needs.jpg'),
  gas: require('../../../assets/guide/art/gas.jpg'),
  wheelchair: require('../../../assets/guide/art/wheelchair.jpg'),
  checklist: require('../../../assets/guide/art/checklist.jpg'),
  logo: require('../../../assets/guide/art/logo.png'),
  'quake-card': require('../../../assets/guide/art/quake-card.png'),
  'drop-cover-hold-wide': require('../../../assets/guide/art/drop-cover-hold-wide.jpg'),
  'after-quake-wide': require('../../../assets/guide/art/after-quake-wide.jpg'),
  'trapped-wide': require('../../../assets/guide/art/trapped-wide.jpg'),
  'outdoor-wide': require('../../../assets/guide/art/outdoor-wide.jpg'),
  'vehicle-wide': require('../../../assets/guide/art/vehicle-wide.jpg'),
  'transit-wide': require('../../../assets/guide/art/transit-wide.jpg'),
  'gas-wide': require('../../../assets/guide/art/gas-wide.jpg'),
  'wheelchair-wide': require('../../../assets/guide/art/wheelchair-wide.jpg'),
  backpack: require('../../../assets/guide/art/backpack.jpg'),
  'family-msg': require('../../../assets/guide/art/family-msg.jpg'),
  'family-msg-wide': require('../../../assets/guide/art/family-msg-wide.jpg'),
  documents: require('../../../assets/guide/art/documents.jpg'),
  'documents-wide': require('../../../assets/guide/art/documents-wide.jpg'),
  'pic-bed': require('../../../assets/guide/art/pic-bed.jpg'),
  'pic-wall': require('../../../assets/guide/art/pic-wall.jpg'),
  'pic-cane': require('../../../assets/guide/art/pic-cane.jpg'),
  'pic-coast': require('../../../assets/guide/art/pic-coast.jpg'),
  'pic-breaker': require('../../../assets/guide/art/pic-breaker.jpg'),
  'pic-stove': require('../../../assets/guide/art/pic-stove.jpg'),
  'tool-siren': require('../../../assets/guide/art/tool-siren.jpg'),
  'tool-light': require('../../../assets/guide/art/tool-light.jpg'),
  'tool-sms': require('../../../assets/guide/art/tool-sms.jpg'),
  'tool-assembly': require('../../../assets/guide/art/tool-assembly.jpg'),
} as const;
export type GuideImgKey = keyof typeof GUIDE_IMG;

/** Saydam zeminli dosyalar (kırmızı kart, başlık logosu) */
const TRANSPARENT: GuideImgKey[] = ['logo', 'quake-card'];

/** Konu görseli → dosya, (varsa) 2:1 yatay kesit ve ekran okuyucu açıklaması. */
const SCENES: Record<ArtId, { img: GuideImgKey; wide?: GuideImgKey; label: string }> = {
  indoor: {
    img: 'drop-cover-hold',
    wide: 'drop-cover-hold-wide',
    label: 'Masanın altında dizlerinin üzerine çökmüş, bir eliyle başını ve ensesini koruyan, diğer eliyle masa ayağına tutunan kişi',
  },
  outdoor: { img: 'outdoor', wide: 'outdoor-wide', label: 'Açık alanda yere çömelip elleriyle başını koruyan kişi' },
  vehicle: { img: 'vehicle', wide: 'vehicle-wide', label: 'Gece yol kenarına yanaşıp durmuş araç ve bekle işareti' },
  transit: { img: 'transit', wide: 'transit-wide', label: 'Metro kapısının yanında dikey direğe tutunan kişi' },
  wheelchair: {
    img: 'wheelchair',
    wide: 'wheelchair-wide',
    label: 'Tekerlekli sandalyede öne eğilip elleriyle başını ve ensesini koruyan kişi',
  },
  after: { img: 'after-quake', wide: 'after-quake-wide', label: 'Sırt çantasıyla toplanma alanı tabelasına doğru yürüyen kişi' },
  gas: {
    img: 'gas',
    wide: 'gas-wide',
    label: 'Gaz sayacı ve ateş yakmayın işareti',
  },
  trapped: { img: 'trapped', wide: 'trapped-wide', label: 'Enkaz altında yüzüstü yatan, ışıkla yerini duyurmaya çalışan kişi' },
  family: { img: 'family-msg', wide: 'family-msg-wide', label: 'Dışarıda telefonundan kısa mesaj yazan kişi' },
  'prep-home': { img: 'home-safety', label: 'Ev, yangın söndürücü ve güvenlik kalkanı' },
  'prep-plan': { img: 'documents', wide: 'documents-wide', label: 'Su geçirmez şeffaf poşette kimlik, pasaport ve belge kopyaları' },
  'prep-special': {
    img: 'special-needs',
    label: 'Tekerlekli sandalyedeki yaşlı kişi, ilk yardım çantası ve sarı acil durum kutusu',
  },
  kit: { img: 'kit', label: 'İlk yardım çantası, su, fener, radyo, yangın söndürücü, sargı bezleri ve ilaçlar' },
};

/** Fotoğraflar varsayılan olarak kutuyu doldurur; `cover={false}` kırpmadan gösterir. */
export function GuideImage({
  img,
  label,
  style,
  cover,
}: {
  img: GuideImgKey;
  label?: string;
  style?: StyleProp<ImageStyle>;
  cover?: boolean;
}) {
  return (
    <Image
      source={GUIDE_IMG[img]}
      resizeMode={(cover ?? !TRANSPARENT.includes(img)) ? 'cover' : 'contain'}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={[!TRANSPARENT.includes(img) && { backgroundColor: ART_BG }, style]}
    />
  );
}

/** Konu sayfası üst görseli: yatay kesit varsa tam genişlikte (2:1, cover), yoksa kare sahne (contain). */
export function GuideHero({ id, width, style }: { id: ArtId; width: number; style?: StyleProp<ImageStyle> }) {
  const s = SCENES[id];
  const img = s.wide ?? s.img;
  return <GuideImage img={img} label={s.label} cover={!!s.wide} style={[{ width, height: width / 2 }, style]} />;
}

/** Tek bir adımı gösteren küçük resimler (dikey). */
const PICS: Record<PicId, { img: GuideImgKey; label: string }> = {
  bed: { img: 'pic-bed', label: 'Yatakta yüzüstü yatıp başını ve ensesini yastıkla koruyan kişi' },
  wall: { img: 'pic-wall', label: 'Bir iç duvarın dibine çökmüş, elleriyle başını koruyan kişi' },
  cane: { img: 'pic-cane', label: 'Sandalyede oturup elleriyle başını koruyan, bastonu yanında duran yaşlı kişi' },
  coast: { img: 'pic-coast', label: 'Deniz kıyısından yokuş yukarı yürüyerek uzaklaşan aile' },
  breaker: { img: 'pic-breaker', label: 'Sigorta kutusundaki şalterlere uzanan el' },
  stove: { img: 'pic-stove', label: 'Ocağın düğmesini kapatan el' },
};
export const PIC_IDS = Object.keys(PICS) as PicId[];

/** Adım küçük resmi (varsayılan 88×112). */
export function StepPic({ id, style }: { id: PicId; style?: StyleProp<ImageStyle> }) {
  const p = PICS[id];
  return <GuideImage img={p.img} label={p.label} style={[{ width: 88, height: 112, borderRadius: 12 }, style]} />;
}

/** Konu görselinin dosya anahtarı. */
export const artImg = (id: ArtId) => SCENES[id].img;

export const ART_IDS = Object.keys(SCENES) as ArtId[];
export const artLabel = (id: ArtId) => SCENES[id].label;
