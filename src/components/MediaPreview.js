import React, { useState } from 'react';
import { View, Image, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import VideoPlayer from './VideoPlayer';
import { ratioValue } from '../constants/mediaRatios';

// Local pre-upload preview, cropped to approximate the ratio that will be
// applied server-side by Cloudinary's gravity=auto fill-crop. This is a
// plain center-crop (resizeMode="cover") approximation — the real
// subject-aware crop only exists once the asset is uploaded, so an exact
// match isn't possible before that; close enough for a composer preview.
//
// Accepts either a single `asset` (video, or CreateActivityScreen's single
// cover image — unchanged single-image behavior) or an `assets` array (post
// photos, 1 or more) — a 1-item array renders identically to the single-
// asset case, so callers with an unknown-length photo set (PostCard, always
// backend-normalized to a list) can just always use `assets`.
export default function MediaPreview({ asset, assets, kind, ratioKey, naturalRatio, style, onRemove }) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = assets && assets.length > 0 ? assets : asset ? [asset] : [];
  if (items.length === 0) return null;

  const ratio = ratioValue(ratioKey) ?? naturalRatio ?? 1;
  const isCarousel = kind !== 'video' && items.length > 1;

  // Plain onScroll (not onMomentumScrollEnd) — the latter is tuned for
  // touch-fling momentum and doesn't reliably fire for mouse-wheel/trackpad
  // scrolling on web, which left the counter badge stuck on desktop.
  const handleScroll = (e) => {
    if (!boxWidth) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / boxWidth);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)));
  };

  return (
    <View
      style={[styles.box, { aspectRatio: ratio }, style]}
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
    >
      {kind === 'video' ? (
        <VideoPlayer uri={items[0].uri} style={StyleSheet.absoluteFill} />
      ) : isCarousel ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {items.map((item, i) => (
            <Image
              key={i}
              source={{ uri: item.uri }}
              style={[styles.image, { width: boxWidth || undefined }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        <Image source={{ uri: items[0].uri }} style={styles.image} resizeMode="cover" />
      )}

      {isCarousel && (
        <View style={styles.counterBadge} pointerEvents="none">
          <Text style={styles.counterText}>{activeIndex + 1}/{items.length}</Text>
        </View>
      )}

      {onRemove && kind !== 'video' && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemove(activeIndex)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counterBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeBtn: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
