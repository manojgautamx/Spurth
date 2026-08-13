import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import axiosInstance from '../utils/axiosInstance';
import { ProfileStatusContext } from '../navigation/AppNavigator';
import { Fonts } from '../theme/fonts';

export default function GoogleUsernameScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const { refreshProfileStatus } = useContext(ProfileStatusContext);

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Required', 'Please enter a username.');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Too short', 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Invalid', 'Only letters, numbers and underscores allowed.');
      return;
    }

    try {
      setChecking(true);
      await axiosInstance.post('set-username/', { username: username.trim() });
      // After username is set, go to profile creation
      navigation.replace('Profile');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Username already taken.';
      Alert.alert('Error', msg);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.container}>
        <Text style={styles.title}>Pick a username</Text>
        <Text style={styles.subtitle}>
          This is how others will find you on Spurth.
        </Text>

        <View style={styles.inputWrap}>
          <Text style={styles.at}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="yourusername"
            placeholderTextColor="#444"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={handleContinue}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 20,
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