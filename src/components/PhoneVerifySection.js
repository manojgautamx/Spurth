import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import axiosInstance from '../utils/axiosInstance';
import { auth } from '../firebase/firebaseConfig';
import { COUNTRY_CODES, DEFAULT_COUNTRY, getFlagEmoji } from '../utils/countryCodes';

// Same web/native split as PhoneVerificationScreen.js — web's Firebase Auth
// phone sign-in needs a DOM reCAPTCHA, native uses @react-native-firebase/auth.
const sendCodeWeb = async (phoneNumber) => {
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'settings-recaptcha-container', {
      size: 'invisible',
    });
  }
  return signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
};

const sendCodeNative = async (phoneNumber) => {
  const nativeAuth = require('@react-native-firebase/auth').default;
  return nativeAuth().signInWithPhoneNumber(phoneNumber);
};

// Inline phone-verification form for SettingsScreen — same underlying
// Firebase flow as PhoneVerificationScreen.js, styled like CreateActivityScreen's
// fieldInput/fieldLabel inputs instead of that screen's full-page layout.
const PhoneVerifySection = ({ onVerified }) => {
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const filteredCountries = countrySearch.trim()
    ? COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.trim().toLowerCase()) ||
        c.dialCode.includes(countrySearch.trim())
      )
    : COUNTRY_CODES;

  const handleSendCode = async () => {
    const digitsOnly = localNumber.trim().replace(/\D/g, '');
    if (digitsOnly.length < 6) {
      Alert.alert('Invalid number', 'Enter your phone number.');
      return;
    }
    const fullNumber = `${country.dialCode}${digitsOnly}`;
    try {
      setSending(true);
      const result = Platform.OS === 'web'
        ? await sendCodeWeb(fullNumber)
        : await sendCodeNative(fullNumber);
      setConfirmation(result);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter the code you received.');
      return;
    }
    try {
      setConfirming(true);
      const userCredential = await confirmation.confirm(code.trim());
      const idToken = await userCredential.user.getIdToken();

      await axiosInstance.post('verification/phone/confirm/', { id_token: idToken });
      Alert.alert('Success', 'Phone number verified!');
      onVerified?.();
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Failed to verify code';
      Alert.alert('Error', detail);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View>
      <Text style={styles.fieldLabel}>Phone Number</Text>

      {!confirmation ? (
        <>
          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countryBtn} onPress={() => setPickerVisible(true)}>
              <Text style={styles.countryBtnText}>{getFlagEmoji(country.iso2)} {country.dialCode}</Text>
              <Icon name="chevron-down" size={14} color="#555" />
            </TouchableOpacity>
            <View style={[styles.fieldInput, { flex: 1 }]}>
              <TextInput
                style={styles.fieldTextInput}
                value={localNumber}
                onChangeText={setLocalNumber}
                placeholder="9812345678"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.btnDisabled]}
            onPress={handleSendCode}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendBtnText}>Send Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.fieldInput}>
            <Icon name="keypad-outline" size={16} color="#555" style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldTextInput}
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code you received"
              placeholderTextColor="#555"
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, confirming && styles.btnDisabled]}
            onPress={handleConfirmCode}
            disabled={confirming}
          >
            {confirming
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendBtnText}>Verify</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmation(null)} style={{ marginTop: 10 }}>
            <Text style={styles.changeNumberText}>Use a different number</Text>
          </TouchableOpacity>
        </>
      )}

      {Platform.OS === 'web' && <View nativeID="settings-recaptcha-container" />}

      {/* Country picker */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Select country</Text>
          <TextInput
            style={styles.pickerSearch}
            placeholder="Search country or code"
            placeholderTextColor="#555"
            value={countrySearch}
            onChangeText={setCountrySearch}
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.iso2}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => {
                  setCountry(item);
                  setPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <Text style={styles.pickerRowFlag}>{getFlagEmoji(item.iso2)}</Text>
                <Text style={styles.pickerRowName}>{item.name}</Text>
                <Text style={styles.pickerRowDialCode}>{item.dialCode}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

export default PhoneVerifySection;

// Field styling matches CreateActivityScreen.js's fieldLabel/fieldInput
// (dark #111 field, #222 border, rounded 12) so verification inputs look
// consistent with the rest of the app instead of Settings' older modal style.
const styles = StyleSheet.create({
  fieldLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldTextInput: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 14,
  },
  countryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  sendBtn: {
    backgroundColor: '#2CB9B0',
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
  changeNumberText: {
    color: '#2CB9B0',
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },

  // Country picker (same look as PhoneVerificationScreen.js's)
  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '70%',
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Fonts.semibold,
    marginBottom: 12,
  },
  pickerSearch: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  pickerRowFlag: {
    fontSize: 20,
  },
  pickerRowName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  pickerRowDialCode: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
});
