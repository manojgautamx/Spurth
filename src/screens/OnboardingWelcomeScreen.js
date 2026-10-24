import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Fonts } from '../theme/fonts';
import { SCREEN_TOP_PADDING } from '../theme/layout';
import { useIsWideWeb } from '../utils/responsive';

// The one screen between "just signed up" and the three-step profile setup
// (ProfileScreen.js) — previously that setup flow was the very first thing
// a brand-new account landed on, with no acknowledgment that signup had
// actually succeeded. This now owns that moment (the "Welcome to Spurth!"
// greeting used to live on step 1 of ProfileScreen itself — moved here,
// where it's not competing with "Pick a few things you're into" for the
// same breath), and sets expectations for what's coming before asking for
// anything.
export default function OnboardingWelcomeScreen({ navigation }) {
  const isWideWeb = useIsWideWeb();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={[styles.container, isWideWeb && styles.containerWeb]}>
        <View style={[styles.content, isWideWeb && styles.contentWeb]}>
          <Text style={styles.eyebrow}>Welcome to Spurth</Text>
          <Text style={styles.headline}>Let's set up your profile</Text>
          <Text style={styles.subtext}>Just a few quick steps.</Text>
        </View>

        <TouchableOpacity
          style={[styles.getStartedBtn, isWideWeb && styles.getStartedBtnWeb]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: SCREEN_TOP_PADDING,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  containerWeb: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentWeb: {
    width: '100%',
    maxWidth: 480,
  },
  eyebrow: {
    color: '#2CB9B0',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 10,
  },
  headline: {
    color: '#fff',
    fontSize: 30,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    lineHeight: 38,
    marginBottom: 14,
  },
  subtext: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    maxWidth: 360,
  },
  getStartedBtn: {
    backgroundColor: '#2CB9B0',
    borderRadius: 40,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedBtnWeb: {
    width: '100%',
    maxWidth: 480,
  },
  getStartedText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
