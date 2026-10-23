import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme';

/** Yüklenirken içerik şeklinde nabız gibi atan yer tutucu (spinner yerine). */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfacePressed, opacity: v }, style]}
    />
  );
}

/** Liste yüklenirken satır şeklinde yer tutucular. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 14, paddingVertical: 8, paddingHorizontal: 4 }} accessible accessibilityLabel="Yükleniyor">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton width={44} height={44} radius={14} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={`${70 - i * 8}%`} height={13} />
            <Skeleton width="45%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}
