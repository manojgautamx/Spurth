// Right-hand rail shown in place of WebSidebar/PostsRail (or ActivitiesRail)
// on ActivityViewerScreen/CommentScreen's wide-web layout when the visitor
// is anonymous — those two rails are per-account content an anonymous
// visitor can't use anyway, so this replaces them with a sign-in/sign-up
// prompt instead of leaving a bare single centered column.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../../theme/fonts';

export default function AuthPromptRail() {
  const navigation = useNavigation();

  return (
    <View style={styles.rail}>
      <View style={styles.card}>
        <Text style={styles.title}>Join Spurth</Text>
        <Text style={styles.subtitle}>
          Sign in to join activities and connect with people near you.
        </Text>

        <TouchableOpacity
          style={styles.signUpBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signUpText}>Create an account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logInBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.logInText}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 360,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginBottom: 22,
  },
  signUpBtn: {
    backgroundColor: '#8575ff',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  signUpText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  logInBtn: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logInText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
});
