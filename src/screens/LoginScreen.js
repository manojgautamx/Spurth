import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  

  const handleLogin = async () => {
    try {
      const response = await axiosInstance.post('/api/token/', {
        username,
        password,
      });
  
      console.log('Login API Response:', response.data); // <-- debug here
  
      const data = response.data;
  
      if (!data.access || !data.refresh) {
        throw new Error('Access or refresh token missing in response');
      }
  
      await login(data.access, data.refresh);
    } catch (error) {
      console.error('Login Error:', error);
      const errorMsg =
        error.response?.data?.detail || error.message || 'Invalid credentials or server error';
      Alert.alert('Login Failed', errorMsg);
    }
  };
  

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Sign in to your account</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. johndoe"
        value={username}
        onChangeText={setUsername}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="****"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
        <Text style={styles.signInText}>SIGN IN</Text>
      </TouchableOpacity>

      {/* Sign Up Link */}
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.signUpText}>
          Don’t have an account?{' '}
          <Text style={styles.signUpLink}>SIGN UP</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#121212',
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
  signInButton: {
    backgroundColor: '#E81F89',
    paddingVertical: 15,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
  },
  signUpLink: {
    color: '#E81F89',
    fontWeight: 'bold',
  },
});
