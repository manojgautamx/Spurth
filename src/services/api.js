import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:8000/api/'; // Android Emulator loopback

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Register (Sign Up)
export const register = async (username, email, password) => {
  return api.post('register/', { username, email, password });
};

// ✅ Login (SimpleJWT expects `username`, not `email`)
export const login = async (username, password) => {
  const response = await api.post('token/', { username, password });
  const { access, refresh } = response.data;
  await AsyncStorage.setItem('accessToken', access);
  await AsyncStorage.setItem('refreshToken', refresh);
  return response;
};

// ✅ Token Interceptor for Authenticated Requests
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Logout
export const logout = async () => {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
};

export default api;
