import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import axiosInstance from '../utils/axiosInstance';
import { ProfileStatusContext } from '../navigation/AppNavigator';
import { Fonts } from '../theme/fonts';
import { BASE_URL } from '../config';

// Same bounds/regex as SignupScreen.js and the backend's own USERNAME_MIN_
// LENGTH/USERNAME_MAX_LENGTH/USERNAME_RE (spurth_backend/api/views.py) —
// keep all three in sync. This used to be a narrower, letters/numbers/
// underscore-only check that disagreed with what the backend actually
// allows.
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
const USERNAME_CHECK_DEBOUNCE_MS = 500;

export default function GoogleUsernameScreen() {
  const [username, setUsername] = useState('');
  const [prefilling, setPrefilling] = useState(true);
  const [checking, setChecking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken
  const usernameCheckSeq = useRef(0);
  // The exact value prefilled below — the live-check skips this value
  // specifically, since it's the user's OWN current username and
  // check-username/ would otherwise (correctly, but confusingly) report it
  // as "taken" by exists() alone, unlike set-username/ which excludes self.
  const prefilledUsernameRef = useRef(null);
  const { refreshProfileStatus } = useContext(ProfileStatusContext);

  // Prefill with the auto-generated username google_auth already picked —
  // happy with it, just tap Continue; want something else, it's fully
  // editable. Previously this started blank with no idea what was already
  // assigned.
  useEffect(() => {
    axiosInstance.get('me/')
      .then(res => {
        if (res.data?.username) {
          prefilledUsernameRef.current = res.data.username;
          setUsername(res.data.username);
        }
      })
      .catch(() => {}) // non-fatal — worst case the field just starts blank
      .finally(() => setPrefilling(false));
  }, []);

  // Live "is this taken" check, debounced — same pattern as SignupScreen.js.
  // Previously this screen only found out on submit.
  useEffect(() => {
    const val = username.trim();
    if (val === prefilledUsernameRef.current) {
      setUsernameStatus('idle');
      return;
    }
    if (val.length < USERNAME_MIN_LENGTH || val.length > USERNAME_MAX_LENGTH || !USERNAME_REGEX.test(val)) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const seq = ++usernameCheckSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`${BASE_URL}/api/check-username/`, { params: { username: val } });
        if (seq !== usernameCheckSeq.current) return;
        setUsernameStatus(res.data.available ? 'available' : 'taken');
      } catch {
        if (seq !== usernameCheckSeq.current) return;
        setUsernameStatus('idle'); // network hiccup — don't block typing, set-username/ re-checks anyway
      }
    }, USERNAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [username]);

  const handleContinue = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a username.');
      return;
    }
    if (trimmed.length < USERNAME_MIN_LENGTH) {
      Alert.alert('Too short', `Username must be at least ${USERNAME_MIN_LENGTH} characters.`);
      return;
    }
    if (trimmed.length > USERNAME_MAX_LENGTH) {
      Alert.alert('Too long', `Username must be at most ${USERNAME_MAX_LENGTH} characters.`);
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      Alert.alert('Invalid', 'Only letters, numbers, dots, underscores and hyphens allowed.');
      return;
    }

    try {
      setChecking(true);
      await axiosInstance.post('set-username/', { username: trimmed });
      // No explicit navigation — AppNavigator's phase router moves on from
      // 'needs_username' to 'onboarding'/'main' on its own once this
      // re-check comes back with needs_username_setup: false, the same way
      // ProfileScreen's own submit already works.
      await refreshProfileStatus();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Username already taken.';
      Alert.alert('Error', msg);
    } finally {
      setChecking(false);
    }
  };

  return (
    <KeyboardAvoidingWrapper style={styles.root} contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.container}>
        <Text style={styles.title}>Pick a username</Text>
        <Text style={styles.subtitle}>
          This is how others will find you on Spurth.
        </Text>

        <View style={styles.inputWrap}>
          <Text style={styles.at}>@</Text>
          {prefilling ? (
            <ActivityIndicator color="#555" style={{ marginVertical: 16 }} />
          ) : (
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="yourusername"
              placeholderTextColor="#444"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={USERNAME_MAX_LENGTH}
            />
          )}
        </View>
        {usernameStatus === 'checking' ? (
          <Text style={styles.fieldHint}>Checking availability…</Text>
        ) : usernameStatus === 'taken' ? (
          <Text style={styles.fieldError}>Username already taken.</Text>
        ) : usernameStatus === 'available' ? (
          <Text style={styles.fieldSuccess}>✓ Username available</Text>
        ) : (
          <Text style={styles.fieldHint}>{USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters, letters/numbers/_ . -</Text>
        )}

        <TouchableOpacity
          style={[styles.btn, { marginTop: 20 }]}
          onPress={handleContinue}
          disabled={checking || prefilling}
        >
          {checking
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  subtitle: {
    color: '#666',
    fontSize: 15,
    fontFamily: Fonts.regular,
    marginBottom: 36,
    lineHeight: 22,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 16,
  },
  at: {
    color: '#2CB9B0',
    fontSize: 20,
    fontFamily: Fonts.semibold,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.regular,
    paddingVertical: 16,
  },
  fieldHint: {
    color: '#555',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 6,
    marginLeft: 4,
  },
  fieldError: {
    color: '#E53935',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 6,
    marginLeft: 4,
  },
  fieldSuccess: {
    color: '#00C853',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 6,
    marginLeft: 4,
  },
  btn: {
    backgroundColor: '#2CB9B0',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
});
