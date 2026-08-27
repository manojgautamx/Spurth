import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import VideoPlayer from './VideoPlayer';
import { ratioValue } from '../constants/mediaRatios';

// Local pre-upload preview, cropped to approximate the ratio that will be
// applied server-side by Cloudinary's gravity=auto fill-crop. This is a
// plain center-crop (resizeMode="cover") approximation — the real
// subject-aware crop only exists once the asset is uploaded, so an exact
// match isn't possible before that; close enough for a composer preview.
export default function MediaPreview({ asset, kind, ratioKey, naturalRatio, style }) {
  if (!asset) return null;
  const ratio = ratioValue(ratioKey) ?? naturalRatio ?? 1;

  return (
    <View style={[styles.box, { aspectRatio: ratio }, style]}>
      {kind === 'video' ? (
        <VideoPlayer uri={asset.uri} style={StyleSheet.absoluteFill} />
      ) : (
        <Image source={{ uri: asset.uri }} style={styles.image} resizeMode="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
