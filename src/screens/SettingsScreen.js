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
import { ProfileStatusContext } from '../navigation/AppNavigator';
import PhoneVerifySection from '../components/PhoneVerifySection';

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
  const { refreshProfileStatus } = useContext(ProfileStatusContext);
  const { distanceKm, setDistanceKm } = useDistance();
  const [localDistance, setLocalDistance] = useState(distanceKm);
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // Change password
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Account delete/deactivate
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountActionError, setAccountActionError] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(null); // null | 'deactivate' | 'delete'

  // Help desk
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpError, setHelpError] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);

  const fetchMe = () => axiosInstance.get('me/')
    .then(res => {
      setEmail(res.data.email || '');
      setEmailVerified(res.data.email_verified || false);
      setPhoneNumber(res.data.phone_number || '');
      setPhoneVerified(res.data.phone_verified || false);
    })
    .catch(() => {});

  useEffect(() => {
    fetchMe().finally(() => setLoadingUser(false));
  }, []);

  const handlePhoneVerified = () => {
    fetchMe();
    refreshProfileStatus?.();
    setPhoneDropdownOpen(false);
  };

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

  const openAccountModal = () => {
    setAccountPassword('');
    setAccountActionError('');
    setAccountActionLoading(null);
    setAccountModalVisible(true);
  };

  const runAccountAction = (mode, endpoint, confirmTitle, confirmMessage) => {
    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: mode === 'delete' ? 'Delete' : 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          setAccountActionLoading(mode);
          setAccountActionError('');
          try {
            await axiosInstance.post(endpoint, { password: accountPassword });
            setAccountModalVisible(false);
            logout();
          } catch (err) {
            setAccountActionError(err.response?.data?.detail || 'Something went wrong.');
          } finally {
            setAccountActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleDeactivateAccount = () =>
    runAccountAction(
      'deactivate',
      'account/deactivate/',
      'Deactivate Account',
      'Your account will be hidden and you’ll be logged out. You can contact support to reactivate it later.'
    );

  const handleDeleteAccount = () =>
    runAccountAction(
      'delete',
      'account/delete/',
      'Delete Account',
      'This permanently deletes your account and all your data. This cannot be undone.'
    );

  const openHelpModal = () => {
    setHelpSubject('');
    setHelpMessage('');
    setHelpError('');
    setHelpModalVisible(true);
  };

  const handleSendHelp = async () => {
    if (!helpSubject.trim() || !helpMessage.trim()) {
      setHelpError('Please fill in both fields.');
      return;
    }
    setSendingHelp(true);
    setHelpError('');
    try {
      await axiosInstance.post('support/contact/', {
        subject: helpSubject.trim(),
        message: helpMessage.trim(),
      });
      setHelpModalVisible(false);
      Alert.alert('Sent', 'Your message has been sent to our support team.');
    } catch (err) {
      setHelpError(err.response?.data?.detail || 'Failed to send your message.');
    } finally {
      setSendingHelp(false);
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

        {/* Phone / Host Verification */}
        <View style={styles.card}>
          {loadingUser ? (
            <>
              <Text style={styles.sectionLabel}>Phone Verification</Text>
              <ActivityIndicator color="#6E35B7" style={{ marginVertical: 16 }} />
            </>
          ) : phoneVerified ? (
            <>
              <Text style={styles.sectionLabel}>Phone Verification</Text>
              <View style={[styles.emailRow, { paddingBottom: 14 }]}>
                <View style={styles.emailIconWrap}>
                  <Ionicons name="call-outline" size={18} color="#888" />
                </View>
                <View style={styles.emailInfo}>
                  <Text style={styles.emailAddress}>{phoneNumber}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#2CB9B0" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#2CB9B0" style={{ marginLeft: 8 }} />
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setPhoneDropdownOpen(v => !v)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Phone Verification</Text>
                  <Text style={styles.dropdownSubtext}>Required to host activities</Text>
                </View>
                <Ionicons
                  name={phoneDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#555"
                />
              </TouchableOpacity>
              {phoneDropdownOpen && (
                <View style={{ paddingBottom: 16 }}>
                  <PhoneVerifySection onVerified={handlePhoneVerified} />
                </View>
              )}
            </>
          )}
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
            onPress={openAccountModal}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Helpdesk"
            onPress={openHelpModal}
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

      {/* Account Delete/Deactivation Modal */}
      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalCardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Manage Account</Text>
              <Text style={styles.modalSubtitle}>
                Deactivating hides your account until you contact support to reactivate it.
                Deleting permanently removes your account and data.
              </Text>

              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Leave blank if you signed in with Google"
                placeholderTextColor="#555"
                secureTextEntry
                value={accountPassword}
                onChangeText={setAccountPassword}
                autoCapitalize="none"
              />

              {!!accountActionError && (
                <Text style={styles.modalErrorText}>{accountActionError}</Text>
              )}

              <TouchableOpacity
                style={[styles.dangerBtn, accountActionLoading && { opacity: 0.6 }]}
                onPress={handleDeactivateAccount}
                disabled={!!accountActionLoading}
              >
                {accountActionLoading === 'deactivate' ? (
                  <ActivityIndicator color="#E8A020" size="small" />
                ) : (
                  <Text style={styles.dangerBtnText}>Deactivate Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerBtn, styles.dangerBtnStrong, accountActionLoading && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={!!accountActionLoading}
              >
                {accountActionLoading === 'delete' ? (
                  <ActivityIndicator color="#C90000" size="small" />
                ) : (
                  <Text style={[styles.dangerBtnText, styles.dangerBtnTextStrong]}>Delete Account Permanently</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelBtn, { alignSelf: 'center', marginTop: 14 }]}
                onPress={() => setAccountModalVisible(false)}
                disabled={!!accountActionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Helpdesk Modal */}
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalCardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <Text style={styles.modalSubtitle}>
                Tell us what's wrong and we'll get back to you at help@spurth.com.
              </Text>

              <Text style={styles.fieldLabel}>Subject</Text>
              <View style={styles.helpFieldInput}>
                <TextInput
                  style={styles.helpFieldTextInput}
                  placeholder="What's the issue about?"
                  placeholderTextColor="#555"
                  value={helpSubject}
                  onChangeText={setHelpSubject}
                />
              </View>

              <Text style={styles.fieldLabel}>Message</Text>
              <View style={[styles.helpFieldInput, styles.helpTextAreaInput]}>
                <TextInput
                  style={[styles.helpFieldTextInput, styles.helpTextArea]}
                  placeholder="Describe your problem..."
                  placeholderTextColor="#555"
                  value={helpMessage}
                  onChangeText={setHelpMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {!!helpError && (
                <Text style={styles.modalErrorText}>{helpError}</Text>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setHelpModalVisible(false)}
                  disabled={sendingHelp}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, sendingHelp && { opacity: 0.6 }]}
                  onPress={handleSendHelp}
                  disabled={sendingHelp}
                >
                  {sendingHelp ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Send</Text>
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

  // Phone verification dropdown header
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  dropdownSubtext: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
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
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    marginBottom: 18,
  },
  dangerBtn: {
    borderWidth: 1.5,
    borderColor: '#E8A020',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  dangerBtnStrong: {
    borderColor: '#C90000',
    marginTop: 12,
  },
  dangerBtnText: {
    color: '#E8A020',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  dangerBtnTextStrong: {
    color: '#C90000',
  },
  helpFieldInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  helpFieldTextInput: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    padding: 0,
  },
  helpTextAreaInput: {
    alignItems: 'flex-start',
  },
  helpTextArea: {
    minHeight: 100,
    width: '100%',
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