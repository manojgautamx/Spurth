import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Linking,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthContext } from '../context/AuthContext';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';
import { randomHeroImage } from '../constants/heroImages';
import { useIsWideWeb } from '../utils/responsive';

const HERO_IMAGE = { uri: randomHeroImage() };

const PURPLE = '#7C6FF7';
const PURPLE_MUTED = 'rgba(124,111,247,0.30)';

export default function WelcomeScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const isWideWeb = useIsWideWeb();

  // ── Animation refs ────────────────────────────────────────────────────────
  const kenBurnsScale = useRef(new Animated.Value(1)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(18)).current;
  const supportOpacity = useRef(new Animated.Value(0)).current;
  const supportY = useRef(new Animated.Value(14)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(28)).current;

  // ── Google Sign-In config ─────────────────────────────────────────────────
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '23044304139-qa1ni7ln2r3keke8aash7n90vmuctp6e.apps.googleusercontent.com',
    });
  }, []);

  // ── Ken Burns: almost imperceptible zoom — 1.0→1.03 over 13 s ───────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(kenBurnsScale, {
          toValue: 1.03,
          duration: 13000,
          useNativeDriver: true,
        }),
        Animated.timing(kenBurnsScale, {
          toValue: 1.0,
          duration: 13000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Staggered entrance: headline → supporting text → buttons ─────────────
  useEffect(() => {
    Animated.sequence([
      Animated.delay(400),
      // Headline fades + rises
      Animated.parallel([
        Animated.timing(headlineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(headlineY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]),
      Animated.delay(120),
      // Supporting text
      Animated.parallel([
        Animated.timing(supportOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(supportY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      // Buttons slide up
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(buttonsY, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const onGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        Alert.alert('Error', 'No ID token received from Google');
        return;
      }

      const res = await axios.post(`${BASE_URL}/api/auth/google/`, { id_token: idToken });
      await login(res.data.access, res.data.refresh);

      if (res.data.is_new_user) navigation.navigate('GoogleUsername');
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Sign-in failed', error.message);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Shared between the mobile and wide-web layouts — only the wrapper
  // (position/alignment) around this differs between the two.
  const authActions = (
    <>
      {/* Google — solid white pill */}
      <TouchableOpacity style={styles.googleBtn} activeOpacity={0.84} onPress={onGoogleSignIn}>
        <Image
          source={{
            // Official Google "G" logo — swap for require('../assets/google-logo.png') if preferred
            uri: 'https://res.cloudinary.com/dppoa51hp/image/upload/v1782493289/pngwing.com_mviuyi.png',
          }}
          style={styles.googleLogo}
          resizeMode="contain"
        />
        <Text style={styles.googleBtnText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Email — ghost pill with purple border */}
      <TouchableOpacity
        style={styles.emailBtn}
        activeOpacity={0.84}
        onPress={() => navigation.navigate('Login')}
      >
        <Ionicons
          name="mail-outline"
          size={18}
          color="rgba(255,255,255,0.75)"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.emailBtnText}>Continue with Email</Text>
      </TouchableOpacity>

      {/* Sign-up nudge */}
      <View style={styles.signupRow}>
        <Text style={styles.signupPrompt}>New here? </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupLink}>Create an account</Text>
        </TouchableOpacity>
      </View>

      {/* Legal */}
      <Text style={styles.legalText}>
        By continuing you agree to our{' '}
        <Text
          style={styles.legalLink}
          onPress={() => Linking.openURL('https://spurth.com/terms')}
        >
          Terms
        </Text>
        {' & '}
        <Text
          style={styles.legalLink}
          onPress={() => Linking.openURL('https://spurth.com/privacy')}
        >
          Privacy Policy
        </Text>
      </Text>
    </>
  );

  const heroImageEl = (
    <Animated.Image
      source={HERO_IMAGE}
      style={[styles.heroImage, { transform: [{ scale: kenBurnsScale }] }]}
      resizeMode="cover"
    />
  );

  // ── Wide web: split-screen — hero on the left, form panel on the right ────
  if (isWideWeb) {
    return (
      <View style={styles.webRoot}>
        <View style={styles.webHeroPane}>
          {heroImageEl}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.webHeroContent}>
            <Animated.Text
              style={[
                styles.headline,
                { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
              ]}
            >
              Don't spend another{'\n'}weekend scrolling.
            </Animated.Text>
            <Animated.Text
              style={[
                styles.supporting,
                { opacity: supportOpacity, transform: [{ translateY: supportY }] },
              ]}
            >
              Meet people who'd rather make memories than scroll.
            </Animated.Text>
          </View>
        </View>

        <View style={styles.webFormPane}>
          <Animated.View
            style={[
              styles.webButtonWrap,
              { opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] },
            ]}
          >
            <Text style={styles.webFormHeading}>Get started</Text>
            <Text style={styles.webFormSubheading}>Join a community that meets up, for real.</Text>
            {authActions}
          </Animated.View>
        </View>
      </View>
    );
  }

  // ── Mobile (and narrow web): immersive full-bleed layout ──────────────────
  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Hero image with Ken Burns zoom ── */}
      {heroImageEl}

      {/* ── Cinematic gradient: barely-there top, deep black by 55% ── */}
      <LinearGradient
        colors={[
          'transparent',
          'transparent',
          'rgba(0,0,0,0.10)',
          'rgba(0,0,0,0.55)',
          'rgba(0,0,0,0.82)',
          'rgba(0,0,0,0.96)',
          '#000000',
        ]}
        locations={[0, 0.28, 0.42, 0.60, 0.74, 0.88, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Lower content: headline + supporting text — left aligned ── */}
      <View style={styles.contentSection}>
        <Animated.Text
          style={[
            styles.headline,
            { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
          ]}
        >
          Don't spend another{'\n'}weekend scrolling.
        </Animated.Text>

        <Animated.Text
          style={[
            styles.supporting,
            { opacity: supportOpacity, transform: [{ translateY: supportY }] },
          ]}
        >
          Meet people who'd rather make memories than scroll.
        </Animated.Text>
      </View>

      {/* ── Auth buttons, anchored to bottom ── */}
      <Animated.View
        style={[
          styles.buttonSection,
          { opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] },
        ]}
      >
        {authActions}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },

  // Full-bleed hero photo behind everything
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Wide web: split-screen layout ─────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  webHeroPane: {
    flex: 1.1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  webHeroContent: {
    padding: 56,
    maxWidth: 520,
  },
  webFormPane: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  webButtonWrap: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 24,
  },
  webFormHeading: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  webFormSubheading: {
    color: '#666',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 28,
  },

  // Headline + supporting text — lower third of screen
  contentSection: {
    position: 'absolute',
    bottom: 300,          // extra gap between supporting text and the button cluster
    left: 0,
    right: 0,
    paddingHorizontal: 28,
  },

  headline: {
    color: '#FFFFFF',
    fontSize: 38,
    fontFamily: Fonts.bold,
    lineHeight: 46,
    letterSpacing: -0.6,
    marginBottom: 14,
  },

  supporting: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 16,
    fontFamily: Fonts.regular,
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  // Auth buttons — pinned near the bottom edge
  buttonSection: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  // Google — solid white, full-width pill
  googleBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    // Subtle shadow so button floats over the gradient
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleBtnText: {
    color: '#111111',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.1,
  },

  // Email — ghost pill, purple-tinted border
  emailBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PURPLE_MUTED,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emailBtnText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.1,
  },

  // Sign-up nudge
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  signupPrompt: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  signupLink: {
    color: PURPLE,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },

  // Legal — quietest element on screen
  legalText: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 17,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.36)',
    textDecorationLine: 'underline',
  },
});