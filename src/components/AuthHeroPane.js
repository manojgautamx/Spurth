// Left branding panel for Login/Signup on wide web viewports — mirrors the
// visual language of the Welcome screen's hero so the auth flow feels
// continuous. Web-only; never rendered on native.
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Fonts } from '../theme/fonts';
import { randomHeroImage } from '../constants/heroImages';

export default function AuthHeroPane() {
  const [heroUri] = useState(randomHeroImage);

  return (
    <View style={styles.pane}>
      <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.35)',
          'rgba(0,0,0,0.75)',
          'rgba(0,0,0,0.92)',
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>
        <Text style={styles.brand}>Spurth</Text>
        <Text style={styles.tagline}>Don't spend another weekend scrolling.</Text>
        <Text style={styles.sub}>Meet people who'd rather make memories than scroll.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#0D0D0D',
  },
  content: {
    padding: 56,
    maxWidth: 480,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.extrabold,
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  tagline: {
    color: '#FFFFFF',
    fontSize: 30,
    fontFamily: Fonts.bold,
    lineHeight: 38,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  sub: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
});
