import type { ReactElement } from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import type { ArtId } from './content';

/**
 * GÜVENDE'ye özgün rehber illüstrasyonları (vektör, uygulamaya gömülü; internet gerekmez).
 * Güvenlik işareti dili: beyaz zemin, koyu figür, anlamı taşıyan tek vurgu rengi. Her iki temada
 * da aynı görünür. Hiçbir kurumun görseli veya logosu kullanılmamıştır.
 */
const INK = '#15202B';
const MUTED = '#9AA6B2';
const RED = '#E5484D';
const GREEN = '#12A37F';
const BLUE = '#2F7CF6';
const AMBER = '#F08C2E';
const PLATE = '#FFFFFF';

const stroke = (w = 7, c = INK) => ({ stroke: c, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' });

/** Kapanmış (çömelmiş, kollar başta) figür; (x,y) baş merkezi. */
function Crouch({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={7} fill={INK} />
      <Path d={`M${x + 4} ${y + 6} Q ${x + 16} ${y + 10} ${x + 20} ${y + 22}`} {...stroke(8)} />
      <Path d={`M${x + 20} ${y + 22} L ${x + 6} ${y + 26} L ${x + 22} ${y + 30}`} {...stroke(7)} />
      <Path d={`M${x - 6} ${y - 4} Q ${x} ${y - 12} ${x + 8} ${y - 6}`} {...stroke(5)} />
    </G>
  );
}

/** Ayakta figür; (x,y) baş merkezi. */
function Stand({ x, y, arm = 'down' }: { x: number; y: number; arm?: 'down' | 'up' | 'forward' }) {
  const a = arm === 'up' ? `M${x} ${y + 12} L ${x + 10} ${y - 2}` : arm === 'forward' ? `M${x} ${y + 12} L ${x + 13} ${y + 14}` : `M${x} ${y + 12} L ${x + 8} ${y + 24}`;
  return (
    <G>
      <Circle cx={x} cy={y} r={6.5} fill={INK} />
      <Path d={`M${x} ${y + 8} L ${x} ${y + 30}`} {...stroke(7)} />
      <Path d={a} {...stroke(5)} />
      <Path d={`M${x} ${y + 30} L ${x - 7} ${y + 44} M${x} ${y + 30} L ${x + 7} ${y + 44}`} {...stroke(6)} />
    </G>
  );
}

const Plate = () => <Rect x={0} y={0} width={120} height={90} rx={12} fill={PLATE} />;
const Ground = ({ y = 82 }: { y?: number }) => <Line x1={8} y1={y} x2={112} y2={y} stroke={MUTED} strokeWidth={2} />;
const NoSign = ({ x, y, r = 9 }: { x: number; y: number; r?: number }) => (
  <G>
    <Circle cx={x} cy={y} r={r} stroke={RED} strokeWidth={3} fill="none" />
    <Line x1={x - r * 0.7} y1={y + r * 0.7} x2={x + r * 0.7} y2={y - r * 0.7} stroke={RED} strokeWidth={3} />
  </G>
);

const SCENES: Record<ArtId, { label: string; draw: () => ReactElement }> = {
  indoor: {
    label: 'Sağlam masanın altında çökmüş, başını koruyup masa ayağına tutunan kişi',
    draw: () => (
      <G>
        {/* Pencere: uzak durulacak */}
        <Rect x={8} y={12} width={22} height={26} rx={2} fill="#DCEBFF" stroke={MUTED} strokeWidth={2} />
        <Path d="M19 12 L 19 38 M8 25 L 30 25" {...stroke(1.5, MUTED)} />
        {/* Masa */}
        <Rect x={36} y={30} width={76} height={7} rx={2} fill={RED} />
        <Rect x={40} y={37} width={6} height={45} fill={RED} />
        <Rect x={102} y={37} width={6} height={45} fill={RED} />
        {/* Masanın altında: çök (diz), kapan (kol başta), tut (el masa ayağında) */}
        <Circle cx={66} cy={56} r={7} fill={INK} />
        <Path d="M60 50 Q 66 43 73 49" {...stroke(4.5)} />
        <Path d="M71 61 Q 84 64 88 76" {...stroke(8)} />
        <Path d="M88 76 L 72 79 L 92 81" {...stroke(6.5)} />
        <Path d="M88 70 L 102 66" {...stroke(4.5)} />
        <Ground />
      </G>
    ),
  },
  outdoor: {
    label: 'Bina ve direkten uzakta, açık alanda çömelmiş kişi',
    draw: () => (
      <G>
        <Rect x={8} y={14} width={26} height={68} fill="#E7ECF1" stroke={MUTED} strokeWidth={2} />
        {[22, 38, 54].map((y) => (
          <Rect key={y} x={13} y={y} width={7} height={8} fill={MUTED} />
        ))}
        <Path d="M38 26 L 44 32 M40 40 L 46 44" {...stroke(2.5, RED)} />
        <Line x1={104} y1={14} x2={104} y2={82} stroke={MUTED} strokeWidth={4} />
        <Line x1={96} y1={20} x2={112} y2={20} stroke={MUTED} strokeWidth={3} />
        <Crouch x={62} y={56} />
        <Path d="M52 30 L 74 30 M70 26 L 74 30 L 70 34" {...stroke(2.5, GREEN)} />
        <Ground />
      </G>
    ),
  },
  vehicle: {
    label: 'Yolu kapatmadan sağa yanaşıp duran araç',
    draw: () => (
      <G>
        <Rect x={8} y={58} width={104} height={24} fill="#E7ECF1" />
        <Line x1={8} y1={70} x2={112} y2={70} stroke={PLATE} strokeWidth={2} strokeDasharray="8 6" />
        <Path d="M40 40 L 52 30 L 76 30 L 88 40 L 96 42 L 96 54 L 32 54 L 32 42 Z" fill={BLUE} />
        <Rect x={54} y={33} width={10} height={7} fill={PLATE} />
        <Rect x={67} y={33} width={10} height={7} fill={PLATE} />
        <Circle cx={46} cy={56} r={6} fill={INK} />
        <Circle cx={82} cy={56} r={6} fill={INK} />
        <Path d="M22 22 Q 40 14 54 20" {...stroke(2.5, GREEN)} />
        <Path d="M50 16 L 54 20 L 49 23" {...stroke(2.5, GREEN)} />
        <Rect x={100} y={14} width={12} height={12} rx={2} fill={GREEN} />
        <Path d="M104 24 L 104 16 L 107.5 16 Q 110 16 110 18.5 Q 110 21 107.5 21 L 104 21" {...stroke(1.8, PLATE)} />
      </G>
    ),
  },
  transit: {
    label: 'Trende askıya tutunan kişi',
    draw: () => (
      <G>
        <Rect x={8} y={10} width={104} height={72} rx={8} fill="#E7ECF1" />
        <Rect x={16} y={18} width={26} height={20} rx={3} fill={PLATE} stroke={MUTED} strokeWidth={2} />
        <Rect x={78} y={18} width={26} height={20} rx={3} fill={PLATE} stroke={MUTED} strokeWidth={2} />
        <Line x1={68} y1={10} x2={68} y2={82} stroke={AMBER} strokeWidth={4} />
        <Stand x={56} y={30} arm="forward" />
        <Ground />
      </G>
    ),
  },
  wheelchair: {
    label: 'Tekerleklerini kilitlemiş, başını koruyan tekerlekli sandalye kullanıcısı',
    draw: () => (
      <G>
        <Circle cx={50} cy={62} r={18} stroke={INK} strokeWidth={5} fill="none" />
        <Path d="M42 30 L 48 54 L 72 54 L 80 72" {...stroke(5)} />
        <Circle cx={44} cy={22} r={7} fill={INK} />
        <Path d="M36 16 Q 44 8 52 16" {...stroke(5)} />
        <Path d="M46 30 L 50 50 L 64 50" {...stroke(7)} />
        <Rect x={86} y={30} width={18} height={14} rx={3} fill={GREEN} />
        <Path d="M90 30 L 90 25 Q 95 18 100 25 L 100 30" {...stroke(3, GREEN)} />
        <Ground />
      </G>
    ),
  },
  after: {
    label: 'Sarsıntı bitince çantasıyla binadan çıkıp toplanma alanına giden kişi',
    draw: () => (
      <G>
        <Rect x={8} y={18} width={30} height={64} fill="#E7ECF1" stroke={MUTED} strokeWidth={2} />
        <Rect x={16} y={52} width={14} height={30} fill={MUTED} />
        <Stand x={58} y={34} arm="forward" />
        <Rect x={44} y={46} width={10} height={13} rx={2} fill={AMBER} />
        <Path d="M74 58 L 92 58 M88 54 L 92 58 L 88 62" {...stroke(3, GREEN)} />
        <Line x1={104} y1={30} x2={104} y2={82} stroke={INK} strokeWidth={3} />
        <Path d="M104 30 L 116 35 L 104 40 Z" fill={GREEN} />
        <Ground />
      </G>
    ),
  },
  gas: {
    label: 'Gaz vanasını kapatma, pencereyi açma; çakmak ve elektrik düğmesi yasak',
    draw: () => (
      <G>
        <Rect x={10} y={40} width={44} height={8} rx={3} fill={MUTED} />
        <Rect x={26} y={30} width={8} height={10} fill={AMBER} />
        <Rect x={18} y={24} width={24} height={6} rx={3} fill={AMBER} />
        <Path d="M14 18 L 46 18" {...stroke(2.5, GREEN)} />
        <Rect x={64} y={12} width={22} height={28} rx={2} fill={PLATE} stroke={BLUE} strokeWidth={3} />
        <Path d="M75 12 L 75 40 M64 26 L 86 26" {...stroke(2, BLUE)} />
        <Path d="M88 18 L 96 14 M88 26 L 98 26" {...stroke(2, BLUE)} />
        <Rect x={22} y={60} width={8} height={14} rx={2} fill={INK} />
        <Path d="M26 60 Q 22 54 26 50 Q 30 54 26 60" fill={AMBER} />
        <NoSign x={26} y={64} r={12} />
        <Rect x={72} y={56} width={16} height={20} rx={3} fill={PLATE} stroke={INK} strokeWidth={2.5} />
        <Rect x={77} y={61} width={6} height={10} rx={1} fill={INK} />
        <NoSign x={80} y={66} r={13} />
      </G>
    ),
  },
  trapped: {
    label: 'Enkaz altında boruya vurarak yerini duyuran kişi',
    draw: () => (
      <G>
        <Path d="M6 30 L 70 18 L 72 28 L 8 40 Z" fill={MUTED} />
        <Path d="M60 22 L 114 40 L 110 48 L 58 32 Z" fill="#B8C2CC" />
        <Line x1={18} y1={46} x2={18} y2={82} stroke={AMBER} strokeWidth={5} />
        <Circle cx={44} cy={62} r={6.5} fill={INK} />
        <Path d="M50 66 L 82 70" {...stroke(7)} />
        <Path d="M40 60 L 24 56" {...stroke(5)} />
        <Path d="M30 50 Q 34 46 30 42 M36 52 Q 42 46 36 38" {...stroke(2.5, RED)} />
        <Ground />
      </G>
    ),
  },
  family: {
    label: 'Telefonla “güvendeyim” mesajı ve aile bireyleri',
    draw: () => (
      <G>
        <Rect x={14} y={12} width={34} height={64} rx={6} fill={INK} />
        <Rect x={18} y={20} width={26} height={44} rx={2} fill={PLATE} />
        <Rect x={21} y={26} width={20} height={12} rx={4} fill={GREEN} />
        <Path d="M25 32 L 29 35 L 37 29" {...stroke(2.2, PLATE)} />
        {[66, 84, 102].map((x, i) => (
          <G key={x}>
            <Circle cx={x} cy={i === 1 ? 42 : 38} r={i === 1 ? 6 : 7} fill={i === 1 ? BLUE : INK} />
            <Path d={`M${x - 9} ${i === 1 ? 66 : 64} Q ${x} ${i === 1 ? 44 : 40} ${x + 9} ${i === 1 ? 66 : 64}`} fill={i === 1 ? BLUE : INK} />
          </G>
        ))}
        <Path d="M66 20 L 102 20" {...stroke(2.5, GREEN)} strokeDasharray="4 4" />
        <Ground />
      </G>
    ),
  },
  'prep-home': {
    label: 'Duvara sabitlenmiş dolap',
    draw: () => (
      <G>
        <Rect x={86} y={8} width={8} height={74} fill="#E7ECF1" />
        <Rect x={40} y={20} width={40} height={62} rx={2} fill="#D9DFE5" stroke={INK} strokeWidth={3} />
        <Line x1={60} y1={20} x2={60} y2={82} stroke={INK} strokeWidth={2} />
        <Path d="M74 26 L 90 26 L 90 18" {...stroke(4, GREEN)} />
        <Circle cx={90} cy={18} r={2.5} fill={GREEN} />
        <Rect x={14} y={30} width={18} height={14} rx={2} stroke={MUTED} strokeWidth={2} fill="none" />
        <Path d="M10 56 L 32 56" {...stroke(2.5, GREEN)} />
        <Path d="M28 52 L 32 56 L 28 60" {...stroke(2.5, GREEN)} />
        <Ground />
      </G>
    ),
  },
  'prep-plan': {
    label: 'Su geçirmez kılıfta belgeler ve buluşma noktası',
    draw: () => (
      <G>
        <Rect x={14} y={16} width={40} height={54} rx={4} fill="#DCEBFF" stroke={BLUE} strokeWidth={3} />
        <Rect x={20} y={24} width={28} height={36} rx={2} fill={PLATE} />
        {[30, 38, 46].map((y) => (
          <Line key={y} x1={24} y1={y} x2={44} y2={y} stroke={MUTED} strokeWidth={2.5} />
        ))}
        <Path d="M86 18 C 74 18 70 30 74 38 L 86 58 L 98 38 C 102 30 98 18 86 18 Z" fill={GREEN} />
        <Circle cx={86} cy={32} r={6} fill={PLATE} />
        <Path d="M60 66 Q 74 74 88 64" {...stroke(2.5, MUTED)} strokeDasharray="4 4" />
        <Ground />
      </G>
    ),
  },
  kit: {
    label: 'Su, fener, ilaç ve belgeler bulunan acil durum çantası',
    draw: () => (
      <G>
        <Path d="M44 26 Q 44 14 60 14 Q 76 14 76 26" {...stroke(4)} />
        <Rect x={30} y={26} width={60} height={56} rx={10} fill={AMBER} />
        <Rect x={40} y={46} width={40} height={20} rx={5} fill="#FFD9A8" />
        <Rect x={56} y={50} width={8} height={12} fill={RED} />
        <Rect x={54} y={52} width={12} height={8} fill={RED} />
        <Rect x={10} y={46} width={12} height={36} rx={4} fill={BLUE} />
        <Rect x={13} y={40} width={6} height={7} fill={BLUE} />
        <Rect x={98} y={54} width={14} height={28} rx={3} fill={INK} />
        <Path d="M98 54 L 94 46 L 116 46 L 112 54" fill={INK} />
        <Ground />
      </G>
    ),
  },
};

export function GuideArt({ id, width = 120 }: { id: ArtId; width?: number }) {
  const s = SCENES[id];
  return (
    <Svg width={width} height={(width * 90) / 120} viewBox="0 0 120 90" accessibilityLabel={s.label} accessibilityRole="image">
      <Plate />
      {s.draw()}
    </Svg>
  );
}

export const ART_IDS = Object.keys(SCENES) as ArtId[];
export const artLabel = (id: ArtId) => SCENES[id].label;
