  import React, { useState } from 'react';
  import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
  } from 'react-native';
  import { register } from '../services/api';

  export default function SignupScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async () => {
      try {
        await register(username, email, password);
        Alert.alert('Success', 'Registration Successful!');
        navigation.replace('Login');
      } catch (error) {
        console.error('Signup Error:', error);
        const errorMsg =
          error.response?.data?.detail ||
          error.response?.data?.email?.[0] ||
          error.response?.data?.username?.[0] ||
          'Something went wrong';
        Alert.alert('Signup Failed', errorMsg);
      }
    };

    return (
      <View style={styles.container}>
        {/* Logo */}
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        {/* Title */}
        <Text style={styles.title}>Create an Account</Text>

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. johndoe"
          placeholderTextColor="#E81F89"
          value={username}
          onChangeText={setUsername}
        />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. jon.smith@email.com"
          placeholderTextColor="#E81F89"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          placeholderTextColor="#E81F89"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Signup Button */}
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignup}>
          <Text style={styles.signUpText}>SIGN UP</Text>
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backToLogin}>
            Already have an account?{' '}
            <Text style={styles.loginLink}>LOGIN</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#121212',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 30,
    },
    label: {
      color: '#FFFFFF',
      alignSelf: 'flex-start',
      fontSize: 16,
      marginBottom: 5,
    },
    input: {
      width: '100%',
      height: 50,
      backgroundColor: '#FAFAFA',
      color: '#000000',
      paddingHorizontal: 15,
      borderRadius: 10,
      marginBottom: 15,
      fontSize: 16,
    },
    signUpButton: {
      backgroundColor: '#E81F89',
      paddingVertical: 15,
      width: '100%',
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    signUpText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    backToLogin: {
      color: '#FFFFFF',
      fontSize: 16,
      marginTop: 20,
    },
    loginLink: {
      color: '#E81F89',
      fontWeight: 'bold',
    },
  });
