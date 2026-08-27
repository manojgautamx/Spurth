import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MEDIA_RATIOS } from '../constants/mediaRatios';
import { Fonts } from '../theme/fonts';

const TEAL = '#2CB9B0';

// Horizontal chip row for picking the crop ratio applied to a media
// preview/upload. Purely presentational — callers own the picked asset and
// the selected ratio key.
export default function MediaRatioPicker({ selectedKey, onSelect, allowedKeys }) {
  const ratios = allowedKeys
    ? MEDIA_RATIOS.filter((r) => allowedKeys.includes(r.key))
    : MEDIA_RATIOS;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
    >
      {ratios.map((r) => {
        const active = r.key === selectedKey;
        return (
          <TouchableOpacity
            key={r.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(r.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 10 },
  rowContent: { gap: 8, paddingRight: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  chipActive: {
    borderColor: TEAL,
    backgroundColor: 'rgba(44,185,176,0.15)',
  },
  chipText: {
    color: '#888',
    fontSize: 12.5,
    fontFamily: Fonts.semibold,
  },
  chipTextActive: {
    color: TEAL,
  },
});
