import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Refresh token if 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If token is expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}token/refresh/`, {
          refresh,
        });

        const newAccessToken = response.data.access;
        await AsyncStorage.setItem('accessToken', newAccessToken);

        // retry with new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error('Token refresh failed:', err);
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        // Optionally: redirect to login screen here
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// Inject token into requests
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Register (Sign Up)
export const register = async (username, email, password) => {
  // Clear any old tokens before signup
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
  return api.post('register/', { username, email, password });
};

// ✅ Login
export const login = async (username, password) => {
  const response = await api.post('token/', { username, password });
  const { access, refresh } = response.data;
  await AsyncStorage.setItem('accessToken', access);
  await AsyncStorage.setItem('refreshToken', refresh);
  return response;
};

// ✅ Logout
export const logout = async () => {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
};

export default api;
