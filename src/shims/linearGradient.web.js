// Web fallback for react-native-linear-gradient — renders a CSS linear-gradient
// on a plain View, since react-native-web has no native gradient support.
import React from 'react';
import { View } from 'react-native';

const toAngle = (start = { x: 0, y: 0 }, end = { x: 0, y: 1 }) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const rad = Math.atan2(dy, dx);
  return `${(rad * 180) / Math.PI + 90}deg`;
};

const LinearGradient = ({ colors = [], locations, start, end, style, children, ...rest }) => {
  const stops = colors
    .map((color, i) => {
      const pct = locations && locations[i] != null
        ? locations[i] * 100
        : (i / Math.max(colors.length - 1, 1)) * 100;
      return `${color} ${pct}%`;
    })
    .join(', ');

  const backgroundImage = `linear-gradient(${toAngle(start, end)}, ${stops})`;

  return (
    <View style={[style, { backgroundImage }]} {...rest}>
      {children}
    </View>
  );
};

export default LinearGradient;
