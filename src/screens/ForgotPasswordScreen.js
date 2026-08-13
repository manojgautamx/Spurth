import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../utils/axiosInstance';
import { Fonts } from '../theme/fonts';

const PRIMARY = '#6E35B7';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post('forgot-password/', { email: email.trim() });
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.subheading}>
          Enter your email and we'll send you a reset code.
        </Text>

        {!sent ? (
          <>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#444"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? 'Sending…' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successBox}>
            <Ionicons name="mail-open-outline" size={48} color="#2CB9B0" />
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successBody}>
              We sent a reset code to {email}.{'\n'}
              Copy the code and enter it below.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { marginTop: 24 }]}
              onPress={() => navigation.navigate('ResetPassword', { email })}
            >
              <Text style={styles.btnText}>Enter Reset Code</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  backBtn: { marginBottom: 32 },
  heading: { color: '#fff', fontSize: 30, fontFamily: Fonts.bold, marginBottom: 8 },
  subheading: { color: '#555', fontSize: 15, fontFamily: Fonts.regular, marginBottom: 32, lineHeight: 22 },
  label: { color: '#888', fontSize: 13, fontFamily: Fonts.medium, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrap: {
    backgroundColor: '#111', borderRadius: 14, borderWidth: 1,
    borderColor: '#1E1E1E', paddingHorizontal: 16, marginBottom: 24,
  },
  input: { height: 52, color: '#fff', fontSize: 15, fontFamily: Fonts.regular },
  btn: { backgroundColor: PRIMARY, borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.semibold },
  successBox: { alignItems: 'center', marginTop: 40, gap: 12 },
  successTitle: { color: '#fff', fontSize: 22, fontFamily: Fonts.bold, marginTop: 8 },
  successBody: { color: '#666', fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 22 },
});