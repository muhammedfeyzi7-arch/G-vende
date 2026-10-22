import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** ÇÖK – KAPAN – TUTUN – SONRA piktogramları (basit çizgi figürler). */
const W = '#F2F6FA';
const R = colors.danger;
const S = { stroke: W, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

function Table() {
  return (
    <G>
      <Rect x={14} y={22} width={92} height={7} rx={2} fill={R} />
      <Rect x={18} y={29} width={6} height={53} fill={R} />
      <Rect x={96} y={29} width={6} height={53} fill={R} />
    </G>
  );
}

export function DropIcon({ size = 100 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 120 90" accessibilityLabel="Çök">
      <Table />
      <Circle cx={44} cy={44} r={7.5} fill={W} />
      <Path d="M52 52 L66 66" {...S} />
      <Path d="M66 66 L52 80 L76 80" {...S} />
      <Path d="M55 55 L46 79" {...S} />
    </Svg>
  );
}

export function CoverIcon({ size = 100 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 120 90" accessibilityLabel="Kapan">
      <Table />
      <Circle cx={40} cy={62} r={7.5} fill={W} />
      <Path d="M50 64 L72 66" {...S} />
      <Path d="M72 66 L58 80 L82 80" {...S} />
      <Path d="M52 62 L44 50 L34 54" {...S} />
    </Svg>
  );
}

export function HoldIcon({ size = 100 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 120 90" accessibilityLabel="Tutun">
      <Table />
      <Circle cx={46} cy={60} r={7.5} fill={W} />
      <Path d="M56 62 L76 66" {...S} />
      <Path d="M76 66 L62 80 L86 80" {...S} />
      <Path d="M58 60 L50 48 L40 52" {...S} />
      <Path d="M64 64 L92 48" {...S} />
    </Svg>
  );
}

export function AfterIcon({ size = 100 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 120 90" accessibilityLabel="Sonra">
      <Rect x={80} y={10} width={26} height={72} rx={2} fill={W} />
      <Rect x={84} y={44} width={4} height={4} rx={2} fill={colors.bg} />
      <Circle cx={44} cy={22} r={7.5} fill={W} />
      <Path d="M44 32 L38 54" {...S} />
      <Path d="M38 54 L52 66 L48 82" {...S} />
      <Path d="M38 54 L28 66 L16 64" {...S} />
      <Path d="M42 38 L56 44 L62 36" {...S} />
      <Path d="M42 38 L30 44 L26 54" {...S} />
      <Line x1={64} y1={56} x2={74} y2={56} stroke={W} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      <Line x1={62} y1={64} x2={72} y2={64} stroke={W} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

export const DCH_STEPS = [
  { n: 1, title: 'ÇÖK', text: 'Sağlam bir yerde çökün.', Icon: DropIcon },
  { n: 2, title: 'KAPAN', text: 'Başınızı ve ensenizi koruyun.', Icon: CoverIcon },
  { n: 3, title: 'TUTUN', text: 'Sarsıntı geçene kadar tutunun.', Icon: HoldIcon },
  { n: 4, title: 'SONRA', text: 'Sarsıntı bitince güvenli şekilde çıkın.', Icon: AfterIcon },
] as const;
