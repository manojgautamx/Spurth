import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { useIsWideWeb } from '../utils/responsive';
import WebSidebar from '../components/web/WebSidebar';
import axiosInstance from '../utils/axiosInstance';
import { auth } from '../firebase/firebaseConfig';
import { ProfileStatusContext } from '../navigation/AppNavigator';
import { LocationContext } from '../context/LocationContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY, findCountryByIso2, getFlagEmoji } from '../utils/countryCodes';

// Web and native use fundamentally different Firebase Auth mechanisms for
// phone sign-in: the plain `firebase/auth` JS SDK's signInWithPhoneNumber
// requires a DOM-based reCAPTCHA and only works on web; native relies on
// @react-native-firebase/auth's native module instead. Both verify against
// the same Firebase project, just through different SDKs.
const sendCodeWeb = async (phoneNumber) => {
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  }
  return signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
};

const sendCodeNative = async (phoneNumber) => {
  const nativeAuth = require('@react-native-firebase/auth').default;
  return nativeAuth().signInWithPhoneNumber(phoneNumber);
};

const PhoneVerificationScreen = ({ navigation }) => {
  const isWideWeb = useIsWideWeb();
  const { refreshVerificationStatus } = useContext(ProfileStatusContext);
  const { location } = useContext(LocationContext);

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null); // web: ConfirmationResult, native: same shape
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Auto-detect the country from the user's GPS location (already fetched
  // app-wide by LocationContext for nearby-activity filtering) — same
  // Nominatim reverse-geocoding service already used elsewhere in this app
  // (ActivityViewerScreen's geocodeLocation), just the reverse direction.
  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;
    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const match = findCountryByIso2(data?.address?.country_code);
        if (match) setCountry(match);
      })
      .catch(() => {}); // silent — falls back to the default country
    return () => { cancelled = true; };
  }, [location?.latitude, location?.longitude]);

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
      await refreshVerificationStatus();

      Alert.alert('Success', 'Phone number verified!');
      navigation.replace('CreateActivity');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Failed to verify code';
      Alert.alert('Error', detail);
    } finally {
      setConfirming(false);
    }
  };

  const content = (
    <View style={styles.body}>
      <Text style={styles.title}>Verify your phone number</Text>
      <Text style={styles.subtitle}>
        Hosting an activity requires a verified phone number so other members know you're real.
      </Text>

      {!confirmation ? (
        <>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countryBtn} onPress={() => setPickerVisible(true)}>
              <Text style={styles.countryBtnText}>{getFlagEmoji(country.iso2)} {country.dialCode}</Text>
              <Ionicons name="chevron-down" size={16} color="#888" />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="9812345678"
              placeholderTextColor="#555"
              keyboardType="phone-pad"
              value={localNumber}
              onChangeText={setLocalNumber}
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, sending && styles.primaryBtnDisabled]}
            onPress={handleSendCode}
            disabled={sending}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Verification code</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, confirming && styles.primaryBtnDisabled]}
            onPress={handleConfirmCode}
            disabled={confirming}
          >
            {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmation(null)}>
            <Text style={styles.resendText}>Use a different number</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Invisible reCAPTCHA host for web phone auth — not rendered on native. */}
      {Platform.OS === 'web' && <View nativeID="recaptcha-container" />}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      <View style={styles.webRow}>
        {isWideWeb && <WebSidebar />}
        <View style={[styles.webCol, isWideWeb && styles.webColWide]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Phone Verification</Text>
            <View style={{ width: 24 }} />
          </View>
          {content}
        </View>
      </View>

      {/* COUNTRY PICKER */}
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

export default PhoneVerificationScreen;

const styles = StyleSheet.create({
  // #0F0F0F matches WebSidebar's own background and the other verification
  // adjacent screens (ProfileView, ProfileEdit) fixed earlier this session.
  container: { flex: 1, backgroundColor: '#0F0F0F', overflow: 'hidden' },

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
    maxWidth: 680 + 360,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 8,
    paddingBottom: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },

  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Fonts.semibold,
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginBottom: 28,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.regular,
    marginBottom: 20,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
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
    paddingVertical: 14,
    marginBottom: 20,
  },
  countryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 20,
  },

  // ── Country picker ──────────────────────────────────────────────────────
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
  primaryBtn: {
    backgroundColor: '#2CB9B0',
    borderRadius: 40,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  resendText: {
    color: '#2CB9B0',
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 16,
  },
});
