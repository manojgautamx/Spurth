import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../theme/fonts';
import { useDistance } from '../context/DistanceContext';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useIsWideWeb } from '../utils/responsive';

const DISTANCE_KEY = 'user_distance_km';

const SettingRow = ({ label, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const navigation = useNavigation();
  const isWideWeb = useIsWideWeb();
  const { logout } = useContext(AuthContext);
  const { distanceKm, setDistanceKm } = useDistance();
  const [localDistance, setLocalDistance] = useState(distanceKm);
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // Change password
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    axiosInstance.get('me/')
      .then(res => {
        setEmail(res.data.email || '');
        setEmailVerified(res.data.email_verified || false);
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  const onSlidingComplete = async (value) => {
    const rounded = Math.round(value);
    setDistanceKm(rounded);
    await AsyncStorage.setItem(DISTANCE_KEY, String(rounded));
  };

  const handleVerifyEmail = () => {
    navigation.navigate('EmailVerification');
  };

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordError('');
    setShowPasswords(false);
    setChangePasswordVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('Please fill in all fields.');
      return;
    }
    setChangingPassword(true);
    setChangePasswordError('');
    try {
      await axiosInstance.post('change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setChangePasswordVisible(false);
      Alert.alert('Success', 'Your password has been changed.');
    } catch (err) {
      setChangePasswordError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Wide web: cap content to the same column width as Home/Explore
          instead of letting cards stretch edge-to-edge. */}
      <View style={styles.webRow}>
      <View style={[styles.webCol, isWideWeb && styles.webColWide]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Account / Email Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Account</Text>
          {loadingUser ? (
            <ActivityIndicator color="#6E35B7" style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.emailRow}>
              <View style={styles.emailIconWrap}>
                <Ionicons name="mail-outline" size={18} color="#888" />
              </View>

              <View style={styles.emailInfo}>
                <Text style={styles.emailAddress} numberOfLines={1}>{email || 'No email set'}</Text>
                {emailVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#2CB9B0" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.unverifiedBadge} onPress={handleVerifyEmail} activeOpacity={0.75}>
                    <Ionicons name="alert-circle-outline" size={13} color="#E8A020" />
                    <Text style={styles.unverifiedText}>Not verified — tap to verify</Text>
                  </TouchableOpacity>
                )}
              </View>

              {emailVerified && (
                <Ionicons name="checkmark-circle" size={22} color="#2CB9B0" style={{ marginLeft: 8 }} />
              )}
            </View>
          )}
          <View style={styles.divider} />
          <SettingRow label="Change Password" onPress={openChangePassword} />
        </View>

        {/* Distance Preferences */}
        <View style={styles.card}>
          <View style={styles.distanceHeader}>
            <Text style={styles.cardLabel}>Distance Preferences</Text>
            <Text style={styles.distanceValue}>{Math.round(localDistance)}km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={200}
            step={1}
            value={localDistance}
            onValueChange={setLocalDistance}
            onSlidingComplete={onSlidingComplete}
            minimumTrackTintColor="#6C5CE7"
            maximumTrackTintColor="#333"
            thumbTintColor="#6C5CE7"
          />
        </View>

        {/* Settings rows */}
        <View style={styles.card}>
          <SettingRow
            label="Terms & Conditions"
            onPress={() => Linking.openURL('https://spurth.com/terms')}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://spurth.com/privacy')}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Account Delete/Deactivation"
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'To delete your account please contact support@spurth.com',
              )
            }
          />
          <View style={styles.divider} />
          <SettingRow
            label="Helpdesk"
            onPress={() => Linking.openURL('mailto:support@spurth.com')}
          />
        </View>
      </ScrollView>

      {/* Log Out */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Log Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log Out',
                style: 'destructive',
                onPress: logout,
              },
            ])
          }
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      </View>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalCardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Change Password</Text>

              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#555"
                secureTextEntry={!showPasswords}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#555"
                secureTextEntry={!showPasswords}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#555"
                secureTextEntry={!showPasswords}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.showPasswordsRow}
                onPress={() => setShowPasswords(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color="#888"
                />
                <Text style={styles.showPasswordsText}>
                  {showPasswords ? 'Hide passwords' : 'Show passwords'}
                </Text>
              </TouchableOpacity>

              {!!changePasswordError && (
                <Text style={styles.modalErrorText}>{changePasswordError}</Text>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setChangePasswordVisible(false)}
                  disabled={changingPassword}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, changingPassword && { opacity: 0.6 }]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A', overflow: 'hidden' },

  /* ───────── WIDE WEB: cap width, center like Home/Explore ─────────
     overflow:'hidden' keeps the sidebar pinned to the viewport — without
     it, content taller than the available height bubbles up and makes the
     whole page scroll instead of just the ScrollView inside webCol. */
  webRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webCol: {
    flex: 1,
    overflow: 'hidden',
  },
  webColWide: {
    maxWidth: 680,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: { width: 36 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: Fonts.bold,
    fontWeight: 'bold',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },

  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },

  sectionLabel: {
    color: '#555',
    fontSize: 11,
    fontFamily: Fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingTop: 14,
    paddingBottom: 10,
  },

  // Email row
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    gap: 12,
  },
  emailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailInfo: {
    flex: 1,
  },
  emailAddress: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#2CB9B0',
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unverifiedText: {
    color: '#E8A020',
    fontSize: 12,
    fontFamily: Fonts.regular,
  },

  // Distance slider
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 4,
  },
  cardLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  distanceValue: {
    color: '#999',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 6,
  },

  // Rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#C90000',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#C90000',
    fontSize: 16,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
  },

  // ── Change Password Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    padding: 22,
    borderRadius: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
    marginBottom: 18,
  },
  fieldLabel: {
    color: '#999',
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginBottom: 6,
    marginTop: 12,
  },
  passwordInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  showPasswordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  showPasswordsText: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  modalErrorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 20,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  modalSaveBtn: {
    backgroundColor: '#6E35B7',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    minWidth: 72,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
});