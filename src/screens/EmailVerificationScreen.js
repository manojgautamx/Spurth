import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { Fonts } from '../theme/fonts';

export default function EmailVerificationScreen({ navigation }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(true); // initial auto-send on entry

  // Entering this screen is the "click to verify" action — it immediately
  // sends a fresh code and shows which address it went to, rather than
  // requiring a separate tap first.
  useEffect(() => {
    axiosInstance.get('me/').then(res => setEmail(res.data.email)).catch(() => {});
    sendCode(true);
  }, []);

  const sendCode = async (initial = false) => {
    try {
      if (initial) setSending(true); else setResending(true);
      await axiosInstance.post('resend-verification/');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not send code.');
    } finally {
      if (initial) setSending(false); else setResending(false);
    }
  };

  const handleVerify = async () => {
    if (token.trim().length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from your email.');
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post('verify-email/', { token: token.trim() });
      // Navigate back first — HomeScreen's useFocusEffect re-fetches me/
      navigation.goBack();
      // Then show alert (slight delay so navigation completes)
      setTimeout(() => {
        Alert.alert('✓ Email Verified', 'Your email has been verified successfully.');
      }, 300);
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.detail || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={48} color="#6E35B7" />
        </View>

        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          {sending
            ? 'Sending a 6-digit code…'
            : email
              ? `We sent a 6-digit code to ${email}.`
              : 'We sent a 6-digit code to your email.'}
        </Text>

        <TextInput
          style={styles.input}
          value={token}
          onChangeText={(t) => setToken(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter 6-digit code"
          placeholderTextColor="#444"
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.btn, (loading || sending) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || sending}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify Email</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={() => sendCode(false)}
          disabled={resending || sending}
        >
          <Text style={styles.resendText}>
            {resending ? 'Sending...' : "Didn't receive it? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  backBtn: { padding: 20, paddingTop: 50 },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', marginTop: -60 },
  iconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#1A1A1A', justifyContent: 'center',
    alignItems: 'center', alignSelf: 'center', marginBottom: 28,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle: { color: '#666', fontSize: 15, lineHeight: 22, marginBottom: 32, textAlign: 'center' },
  input: {
    backgroundColor: '#111', borderRadius: 14, borderWidth: 1,
    borderColor: '#222', paddingHorizontal: 16, height: 54,
    color: '#fff', fontSize: 22, marginBottom: 16,
    textAlign: 'center', letterSpacing: 8, fontFamily: Fonts.semibold,
  },
  btn: {
    backgroundColor: '#6E35B7', borderRadius: 14,
    height: 54, justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#6E35B7', fontSize: 14 },
});