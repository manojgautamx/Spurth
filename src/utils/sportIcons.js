import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';

export const getSportIcon = (sport, size = 16, color = '#ccc') => {
  if (!sport) return null;

  const normalized = sport.toLowerCase();

  const iconMap = {
    football: (
      <MaterialCommunityIcons
        name="soccer"
        size={size}
        color={color}
      />
    ),
    futsal: (
      <MaterialCommunityIcons
        name="soccer"
        size={size}
        color={color}
      />
    ),
    cricket: (
      <MaterialCommunityIcons
        name="cricket"
        size={size}
        color={color}
      />
    ),
    basketball: (
      <MaterialCommunityIcons
        name="basketball"
        size={size}
        color={color}
      />
    ),
    volleyball: (
      <MaterialCommunityIcons
        name="volleyball"
        size={size}
        color={color}
      />
    ),
    badminton: (
      <MaterialCommunityIcons
        name="badminton"
        size={size}
        color={color}
      />
    ),
    tennis: (
      <MaterialCommunityIcons
        name="tennis"
        size={size}
        color={color}
      />
    ),
    running: (
      <Ionicons
        name="walk-outline"
        size={size}
        color={color}
      />
    ),
  };

  return iconMap[normalized] || (
    <Ionicons
      name="trophy-outline"
      size={size}
      color={color}
    />
  );
};
