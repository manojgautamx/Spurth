import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export default function ExploreIcon({ size = 22, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle
        cx="7.85544"
        cy="7.85538"
        r="6.96158"
        stroke={color}
        strokeWidth="1.78769"
      />
      <Path
        d="M18.2977 18.2977L14.8169 14.8169"
        stroke={color}
        strokeWidth="1.78769"
        strokeLinecap="round"
      />
    </Svg>
  );
}
