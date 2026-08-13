import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ChatIcon({ size = 22, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="M0.917053 10.4399C0.917053 5.18055 5.18061 0.916992 10.44 0.916992V0.916992C15.6993 0.916992 19.9629 5.18055 19.9629 10.4399V16.4999C19.9629 18.4124 18.4125 19.9628 16.5 19.9628H10.44C5.18061 19.9628 0.917053 15.6993 0.917053 10.4399V10.4399Z"
        stroke={color}
        strokeWidth="1.83407"
      />
      <Path
        d="M6.86853 9.24951L14.0107 9.24951"
        stroke={color}
        strokeWidth="1.83407"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.4399 14.0107H14.011"
        stroke={color}
        strokeWidth="1.83407"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
