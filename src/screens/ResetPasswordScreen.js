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

export default function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post('reset-password/', {
        token: token.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'Log In', onPress: () => navigation.navigate('Login') },
      ]);
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

        <Text style={styles.heading}>Reset password</Text>
        <Text style={styles.subheading}>
          Enter the code from your email and your new password.
        </Text>

        {/* Reset code */}
        <Text style={styles.label}>Reset Code</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Paste code from email"
            placeholderTextColor="#444"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* New password */}
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="At least 8 characters"
            placeholderTextColor="#444"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowNew(p => !p)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showNew ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Repeat new password"
            placeholderTextColor="#444"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </Text>
        </TouchableOpacity>

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
  label: { color: '#888', fontSize: 13, fontFamily: Fonts.medium, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderRadius: 14, borderWidth: 1,
    borderColor: '#1E1E1E', paddingHorizontal: 16, marginBottom: 4,
  },
  input: { height: 52, color: '#fff', fontSize: 15, fontFamily: Fonts.regular, flex: 1 },
  eyeBtn: { paddingLeft: 10 },
  eyeText: { color: PRIMARY, fontSize: 13, fontFamily: Fonts.medium },
  btn: { backgroundColor: PRIMARY, borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.semibold },
});