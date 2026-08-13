import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ActivityIcon({ size = 28, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path
        d="M24.9165 12.97407L22.0473 7.87548L16.7892 19.2713L10.64859 4L7.02388 12.97407H0V14.1389H8.15259L10.64553 7.96984L16.6867 23L22.188 11.0835L23.9071 14.1389H29V12.97407H24.9165Z"
        fill={color}
      />
    </Svg>
  );
}