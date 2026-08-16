// Minimal marketing landing page — web only (see AppNavigator's
// Platform.OS-gated initialRouteName). Native builds skip straight to
// WelcomeScreen; a pitch page doesn't make sense inside an already-installed
// app.
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Fonts } from '../theme/fonts';

const ACCENT = '#7C6FF7';

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <View style={styles.content}>
        <Image
          source={require('../assets/logotext.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.headline}>Your weekend deserves better plans.</Text>
        <Text style={styles.subheading}>
          Your next story shouldn't be on your feed.
        </Text>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={styles.ctaText}>Join now</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>© {new Date().getFullYear()} Spurth</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  logo: {
    height: 34,
    width: 34 * (528 / 182),
    marginBottom: 56,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: Fonts.bold,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 14,
  },
  subheading: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    fontFamily: Fonts.regular,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  cta: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
});
