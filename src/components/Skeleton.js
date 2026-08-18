import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const BASE = '#161616';
const HIGHLIGHT = '#2A2A2A';

// The lowest-level skeleton piece — a rounded box with a light "band" that
// sweeps across it on a loop. The band's width/travel distance is derived
// from the box's own measured width (via onLayout, since Animated can't
// read a percentage width synchronously), so the sweep looks calibrated
// whether it's a small avatar circle or a full-width card image.
export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!measuredWidth) return;
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [measuredWidth]);

  const bandWidth = Math.max(measuredWidth * 0.5, 40);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth, measuredWidth],
  });

  return (
    <View
      style={[{ width, height, borderRadius, backgroundColor: BASE, overflow: 'hidden' }, style]}
      onLayout={(e) => setMeasuredWidth(e.nativeEvent.layout.width)}
    >
      {measuredWidth > 0 && (
        <Animated.View
          style={{ position: 'absolute', top: 0, bottom: 0, width: bandWidth, transform: [{ translateX }] }}
        >
          <LinearGradient
            colors={['transparent', HIGHLIGHT, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ── Composable shapes built on SkeletonBox — cover the handful of shapes
// that keep showing up across screens (avatars, text lines, cards, pills).
export const SkeletonCircle = ({ size = 40, style }) => (
  <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />
);

export const SkeletonText = ({ width = '100%', height = 14, style }) => (
  <SkeletonBox width={width} height={height} borderRadius={4} style={style} />
);

export const SkeletonPill = ({ width = 80, height = 32, style }) => (
  <SkeletonBox width={width} height={height} borderRadius={height / 2} style={style} />
);
