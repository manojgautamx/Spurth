import React, { useState, useContext, useMemo, useRef, useCallback } from 'react';
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
import { register } from '../services/api';
import { signIntoFirebase } from '../utils/auth';
import { classifyAuthError } from '../utils/authErrors';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AuthHeroPane from '../components/AuthHeroPane';
import { useIsWideWeb } from '../utils/responsive';

const PRIMARY = '#6E35B7';

// ── Security constants ────────────────────────────────────────────────────────
const MAX_ATTEMPTS        = 5;
const LOCKOUT_DURATION    = 60;    // seconds — longer than login since signup is more sensitive
const ATTEMPT_WINDOW_MS   = 120_000;
const MIN_SUBMIT_INTERVAL = 1500;  // ms — slightly longer than login

// ── Sanitize: strip control characters, limit length ─────────────────────────
const sanitize = (str, maxLen = 150) =>
  str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen);

// ── Validators ────────────────────────────────────────────────────────────────
const USERNAME_REGEX  = /^[a-zA-Z0-9_.-]+$/;      // safe chars only
const EMAIL_REGEX     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INJECTION_RE    = /[<>;"'`\\]|--|\bOR\b|\bAND\b|\bDROP\b|\bSELECT\b/i;

const PASSWORD_RULES = [
  { key: 'length',    label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A–Z)',     test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter (a–z)',     test: (p) => /[a-z]/.test(p) },
  { key: 'number',    label: 'One number (0–9)',               test: (p) => /[0-9]/.test(p) },
  { key: 'special',   label: 'One special character (!@#$…)',  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['#1E1E1E', '#E53935', '#FB8C00', '#FDD835', '#43A047', '#00C853'];

function getStrength(password) {
  if (!password) return 0;
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

export default function SignupScreen({ navigation }) {
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading]                 = useState(false);

  // ── Field-level validation errors ─────────────────────────────────────────
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError]       = useState('');

  // ── Brute-force state ──────────────────────────────────────────────────────
  const [attempts, setAttempts]   = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const lastSubmitRef  = useRef(0);
  const countdownTimer = useRef(null);
  const windowTimer    = useRef(null);

  const { login } = useContext(AuthContext);
  const isWideWeb = useIsWideWeb();

  const strength       = useMemo(() => getStrength(password), [password]);
  const isStrongEnough = strength >= 4;

  // ── Lockout ───────────────────────────────────────────────────────────────
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

  const recordFailure = useCallback((currentAttempts) => {
    const next = currentAttempts + 1;
    setAttempts(next);
    clearTimeout(windowTimer.current);
    windowTimer.current = setTimeout(() => setAttempts(0), ATTEMPT_WINDOW_MS);
    if (next >= MAX_ATTEMPTS) startLockout();
  }, [startLockout]);

  // ── Field validators (on blur) ────────────────────────────────────────────
  const validateUsername = (val) => {
    if (!val.trim()) { setUsernameError('Username is required.'); return false; }
    if (val.length < 3) { setUsernameError('At least 3 characters.'); return false; }
    if (!USERNAME_REGEX.test(val)) { setUsernameError('Only letters, numbers, _ . - allowed.'); return false; }
    if (INJECTION_RE.test(val)) { setUsernameError('Invalid characters detected.'); return false; }
    setUsernameError('');
    return true;
  };

  const validateEmail = (val) => {
    if (!val.trim()) { setEmailError('Email is required.'); return false; }
    if (!EMAIL_REGEX.test(val)) { setEmailError('Enter a valid email address.'); return false; }
    if (INJECTION_RE.test(val)) { setEmailError('Invalid characters detected.'); return false; }
    setEmailError('');
    return true;
  };

  // ── Main handler ──────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (lockedOut) {
      Alert.alert('Too many attempts', `Please wait ${countdown}s before trying again.`);
      return;
    }

    // Rapid-fire throttle
    const now = Date.now();
    if (now - lastSubmitRef.current < MIN_SUBMIT_INTERVAL) return;
    lastSubmitRef.current = now;

    // Sanitize
    const cleanUsername = sanitize(username.trim(), 50);
    const cleanEmail    = sanitize(email.trim(), 150);
    const cleanPassword = sanitize(password.trim(), 150);

    // Validate all fields
    const usernameOk = validateUsername(cleanUsername);
    const emailOk    = validateEmail(cleanEmail);

    if (!usernameOk || !emailOk) return;

    if (!cleanPassword) {
      Alert.alert('Missing fields', 'Please enter a password.');
      return;
    }

    if (!isStrongEnough) {
      Alert.alert('Weak Password', 'Please meet at least 4 of the 5 password requirements.');
      return;
    }

    try {
      setLoading(true);
      await register(cleanUsername, cleanEmail, cleanPassword);

      // Auto-login
      const response = await axiosInstance.post(
        `${BASE_URL}/api/token/`,
        { username: cleanUsername, password: cleanPassword },
        { timeout: 10_000 }
      );
      const data = response.data;
      if (!data.access || !data.refresh) throw new Error('Tokens missing');

      // Success — reset counters
      setAttempts(0);
      clearTimeout(windowTimer.current);
      clearInterval(countdownTimer.current);

      await login(data.access, data.refresh);
      await signIntoFirebase();

    } catch (error) {
      const { countsAsFailure, message } = classifyAuthError(error, ['email', 'username']);

      // Only a genuine rejection from the server (taken username/email,
      // etc.) counts toward the lockout — a network blip or a server
      // error isn't the user's fault. Only surface the countdown once
      // they're actually close to it, not after a single fixable typo.
      let remainingMsg = '';
      if (countsAsFailure) {
        recordFailure(attempts);
        const remaining = MAX_ATTEMPTS - (attempts + 1);
        if (remaining > 0 && remaining <= 2) {
          remainingMsg = `\n\n${remaining} attempt${remaining > 1 ? 's' : ''} left before temporary lockout.`;
        }
      }

      Alert.alert('Signup Failed', message + remainingMsg);
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
      <Text style={styles.heading}>Create account</Text>
      <Text style={styles.subheading}>Join the community</Text>

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

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <View style={[
          styles.inputWrap,
          usernameError ? styles.inputError : null,
          isDisabled && styles.inputDisabled,
        ]}>
          <TextInput
            style={styles.input}
            placeholder="e.g. johndoe"
            placeholderTextColor="#444"
            value={username}
            onChangeText={t => { setUsername(sanitize(t, 50)); setUsernameError(''); }}
            onBlur={() => validateUsername(username.trim())}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDisabled}
            maxLength={50}
          />
        </View>
        {!!usernameError && <Text style={styles.fieldError}>{usernameError}</Text>}

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <View style={[
          styles.inputWrap,
          emailError ? styles.inputError : null,
          isDisabled && styles.inputDisabled,
        ]}>
          <TextInput
            style={styles.input}
            placeholder="e.g. john@email.com"
            placeholderTextColor="#444"
            value={email}
            onChangeText={t => { setEmail(sanitize(t)); setEmailError(''); }}
            onBlur={() => validateEmail(email.trim())}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDisabled}
            maxLength={150}
          />
        </View>
        {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={[
          styles.inputWrap,
          password.length > 0 && { borderColor: STRENGTH_COLORS[strength] },
          isDisabled && styles.inputDisabled,
        ]}>
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
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            style={styles.eyeBtn}
            disabled={isDisabled}
          >
            <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {/* Strength bar */}
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBarRow}>
              {PASSWORD_RULES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthSegment,
                    { backgroundColor: i < strength ? STRENGTH_COLORS[strength] : '#1E1E1E' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
              {STRENGTH_LABELS[strength]}
            </Text>
            {(passwordFocused || !isStrongEnough) && (
              <View style={styles.ruleList}>
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <View key={rule.key} style={styles.ruleRow}>
                      <Text style={[styles.ruleDot, { color: passed ? '#00C853' : '#555' }]}>
                        {passed ? '✓' : '○'}
                      </Text>
                      <Text style={[styles.ruleText, passed && styles.ruleTextPassed]}>
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Sign Up Button ── */}
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (isDisabled || (password.length > 0 && !isStrongEnough)) && styles.primaryBtnDisabled,
        ]}
        onPress={handleSignup}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? 'Creating account…' : lockedOut ? `Locked (${countdown}s)` : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      {/* ── Divider ── */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ── Login Link ── */}
      <TouchableOpacity
        style={styles.ghostBtn}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.75}
      >
        <Text style={styles.ghostBtnText}>Already have an account? Sign in</Text>
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
}

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

  // Banners
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
  form: { gap: 4, marginBottom: 28 },
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
  inputError: {
    borderColor: '#E53935',
  },
  inputDisabled: {
    opacity: 0.4,
  },
  input: {
    height: 52,
    color: '#fff',
    fontSize: 15,
    flex: 1,
    fontFamily: Fonts.regular,
  },
  fieldError: {
    color: '#E53935',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 4,
    marginLeft: 4,
  },
  eyeBtn: { paddingLeft: 10, paddingVertical: 10 },
  eyeText: { color: PRIMARY, fontSize: 13, fontFamily: Fonts.semibold },

  // Strength
  strengthContainer: { marginTop: 10, gap: 6 },
  strengthBarRow: { flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    textAlign: 'right',
    letterSpacing: 0.4,
  },
  ruleList: { marginTop: 6, gap: 5 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleDot: { fontSize: 13, width: 16, textAlign: 'center' },
  ruleText: { color: '#555', fontSize: 13, fontFamily: Fonts.regular },
  ruleTextPassed: { color: '#777' },

  // Buttons
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: Fonts.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E1E1E' },
  dividerText: { color: '#444', fontSize: 13, fontFamily: Fonts.regular },
  ghostBtn: {
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  ghostBtnText: { color: '#888', fontSize: 15, fontFamily: Fonts.medium },
});