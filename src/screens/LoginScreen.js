import React, { useState, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import { signIntoFirebase } from '../utils/auth';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AuthHeroPane from '../components/AuthHeroPane';
import { useIsWideWeb } from '../utils/responsive';

const PRIMARY = '#6E35B7';

// ── Security constants ────────────────────────────────────────────────────────
const MAX_ATTEMPTS       = 5;    // lock after this many consecutive failures
const LOCKOUT_DURATION   = 30;   // seconds
const ATTEMPT_WINDOW_MS  = 60_000; // reset attempt count after 1 min of no tries
const MIN_SUBMIT_INTERVAL = 1000;  // ms — prevents rapid-fire submits

// ── Sanitize input: strip control characters & limit length ──────────────────
const sanitize = (str, maxLen = 150) =>
  str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen);

const LoginScreen = ({ navigation }) => {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Brute-force state ──────────────────────────────────────────────────────
  const [attempts, setAttempts]         = useState(0);
  const [lockedOut, setLockedOut]       = useState(false);
  const [countdown, setCountdown]       = useState(0);

  const lastAttemptRef   = useRef(0);   // timestamp of last submit
  const lastSubmitRef    = useRef(0);   // for rapid-fire throttle
  const countdownTimer   = useRef(null);
  const windowTimer      = useRef(null);

  const { login } = useContext(AuthContext);
  const isWideWeb = useIsWideWeb();

  // ── Start lockout countdown ────────────────────────────────────────────────
  const startLockout = useCallback(() => {
    setLockedOut(true);
    setCountdown(LOCKOUT_DURATION);

    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          setLockedOut(false);
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Record a failed attempt ────────────────────────────────────────────────
  const recordFailure = useCallback((currentAttempts) => {
    const next = currentAttempts + 1;
    setAttempts(next);

    // Reset attempt window timer
    clearTimeout(windowTimer.current);
    windowTimer.current = setTimeout(() => setAttempts(0), ATTEMPT_WINDOW_MS);

    if (next >= MAX_ATTEMPTS) {
      startLockout();
    }
  }, [startLockout]);

  // ── Main login handler ─────────────────────────────────────────────────────
  const handleLogin = async () => {

    // 1. Lockout check
    if (lockedOut) {
      Alert.alert('Too many attempts', `Please wait ${countdown}s before trying again.`);
      return;
    }

    // 2. Rapid-fire throttle
    const now = Date.now();
    if (now - lastSubmitRef.current < MIN_SUBMIT_INTERVAL) return;
    lastSubmitRef.current = now;

    // 3. Sanitize & validate
    const cleanUsername = sanitize(username.trim());
    const cleanPassword = sanitize(password.trim());

    if (!cleanUsername || !cleanPassword) {
      Alert.alert('Missing fields', 'Please enter your username and password.');
      return;
    }

    // 4. Basic injection guard — reject if input contains suspicious patterns
    const suspiciousPattern = /[<>;"'`\\]|--|\bOR\b|\bAND\b|\bDROP\b|\bSELECT\b/i;
    if (suspiciousPattern.test(cleanUsername)) {
      Alert.alert('Invalid input', 'Username contains invalid characters.');
      return;
    }

    try {
      setLoading(true);
      lastAttemptRef.current = now;

      const response = await axiosInstance.post(
        `${BASE_URL}/api/token/`,
        { username: cleanUsername, password: cleanPassword },
        { timeout: 10_000 }   // 10 s timeout — prevents hang-based DoS
      );

      const data = response.data;
      if (!data.access || !data.refresh) throw new Error('Tokens missing in response');

      // Success — reset brute-force counters
      setAttempts(0);
      clearTimeout(windowTimer.current);
      clearInterval(countdownTimer.current);

      await login(data.access, data.refresh);
      await signIntoFirebase();

    } catch (error) {
      const status  = error.response?.status;
      const errData = error.response?.data;

      // Record failure for every non-network error
      if (status !== undefined) {
        recordFailure(attempts);
      }

      // Remaining attempts warning
      const remaining = MAX_ATTEMPTS - (attempts + 1);
      const remainingMsg =
        remaining > 0 && remaining < MAX_ATTEMPTS
          ? `\n\n${remaining} attempt${remaining > 1 ? 's' : ''} left before temporary lockout.`
          : '';

      const msg =
        errData?.detail ||
        errData?.non_field_errors?.[0] ||
        errData?.username?.[0] ||
        error.message ||
        'Something went wrong. Please try again.';

      Alert.alert('Login Failed', msg + remainingMsg);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || lockedOut;

  // Shared between the mobile and wide-web layouts.
  const formContent = (
    <>
      {/* ── Back button ── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.navigate('Welcome')}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      {/* ── Heading ── */}
      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.subheading}>Sign in to continue</Text>

      {/* ── Lockout banner ── */}
      {lockedOut && (
        <View style={styles.lockoutBanner}>
          <Ionicons name="lock-closed-outline" size={16} color="#ff6b6b" />
          <Text style={styles.lockoutText}>
            Too many failed attempts. Try again in {countdown}s
          </Text>
        </View>
      )}

      {/* ── Attempt warning ── */}
      {!lockedOut && attempts >= 3 && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={16} color="#f0a500" />
          <Text style={styles.warningText}>
            {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} left before lockout
          </Text>
        </View>
      )}

      {/* ── Form ── */}
      <View style={styles.form}>
        <Text style={styles.label}>Username or Email</Text>
        <View style={[styles.inputWrap, isDisabled && styles.inputDisabled]}>
          <TextInput
            style={styles.input}
            placeholder="username or email@example.com"
            placeholderTextColor="#444"
            value={username}
            onChangeText={t => setUsername(sanitize(t))}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isDisabled}
            maxLength={150}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={[styles.inputWrap, isDisabled && styles.inputDisabled]}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor="#444"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={t => setPassword(sanitize(t))}
            autoCapitalize="none"
            editable={!isDisabled}
            maxLength={150}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            style={styles.eyeBtn}
            disabled={isDisabled}
          >
            <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sign In Button ── */}
      <TouchableOpacity
        style={[styles.primaryBtn, isDisabled && styles.primaryBtnDisabled]}
        onPress={handleLogin}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? 'Signing in…' : lockedOut ? `Locked (${countdown}s)` : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {/* ── Divider ── */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ── Sign Up Link ── */}
      <TouchableOpacity
        style={styles.ghostBtn}
        onPress={() => navigation.navigate('Signup')}
        activeOpacity={0.75}
      >
        <Text style={styles.ghostBtnText}>Create an account</Text>
      </TouchableOpacity>

      {/* After the password inputWrap closing tag */}
      <TouchableOpacity
        style={styles.forgotBtn}
        onPress={() => navigation.navigate('ForgotPassword')}
        activeOpacity={0.7}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>
    </>
  );

  // ── Wide web: split-screen — branding on the left, form panel on the right
  if (isWideWeb) {
    return (
      <View style={styles.webRoot}>
        <AuthHeroPane />
        <View style={styles.webFormPane}>
          <ScrollView
            contentContainerStyle={styles.webScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.webFormInner}>
              {formContent}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Mobile (and narrow web) ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formContent}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
  },

  // ── Wide web: split-screen layout ─────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  webFormPane: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  webScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  webFormInner: {
    width: '100%',
    maxWidth: 400,
  },

  // Back button
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },

  // Heading
  heading: {
    color: '#fff',
    fontSize: 30,
    marginBottom: 6,
    letterSpacing: 0.2,
    fontFamily: Fonts.bold,
  },
  subheading: {
    color: '#555',
    fontSize: 15,
    marginBottom: 28,
    fontFamily: Fonts.regular,
  },

  // Lockout / warning banners
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2a1010',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff6b6b33',
  },
  lockoutText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1800',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0a50033',
  },
  warningText: {
    color: '#f0a500',
    fontSize: 13,
    fontFamily: Fonts.medium,
    flex: 1,
  },

  // Form
  form: {
    gap: 4,
    marginBottom: 28,
  },
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Fonts.medium,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    paddingHorizontal: 16,
  },
  inputDisabled: {
    opacity: 0.4,
  },
  input: {
    height: 52,
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  eyeBtn: {
    paddingLeft: 10,
    paddingVertical: 10,
  },
  eyeText: {
    color: PRIMARY,
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: Fonts.semibold,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E1E1E',
  },
  dividerText: {
    color: '#444',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },

  // Ghost button
  ghostBtn: {
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  ghostBtnText: {
    color: '#888',
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotText: {
    color: PRIMARY,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
});