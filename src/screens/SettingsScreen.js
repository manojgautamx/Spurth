import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../theme/fonts';
import { useDistance } from '../context/DistanceContext';
import axiosInstance from '../utils/axiosInstance';

const DISTANCE_KEY = 'user_distance_km';

const SettingRow = ({ label, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#555" />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { distanceKm, setDistanceKm } = useDistance();
  const [localDistance, setLocalDistance] = useState(distanceKm);
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

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
                onPress: () => navigation.navigate('Welcome'),
              },
            ])
          }
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },

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
});